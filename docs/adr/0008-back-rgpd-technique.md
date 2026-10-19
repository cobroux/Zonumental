# ADR 0008 — RGPD technique : export, suppression différée, aucune position stockée

- **Statut :** proposé (tech-lead-back, 2026-10-19)
- **Stories :** r0-socle-11, -13, -14, -15 (et R1 capture)
- **Règles :** RG-003, RG-012 à RG-015, RG-036, RG-037, Q-9

## Contexte

Cahier §7 : export (JSON + zip des photos), suppression définitive sous 30 jours (photos comprises), consentements datés, inactivité 3 ans, position GPS jamais stockée, photos privées. Décision Q-9 : désactivation immédiate, annulation possible 30 jours en se reconnectant, pseudo et e-mail libérés à la purge.

## Décision

**Consentements (RG-003, RG-012)** : journal en ajout seul `compte.consentement` (type, accordé oui/non, version du texte, horodatage). L'état courant = dernière ligne par type. Types : `CGU`, `CONFIDENTIALITE` (obligatoires à l'inscription), `CLASSEMENT`, `EMAILS` (facultatifs, faux par défaut). La version enregistrée est celle envoyée par le front et doit égaler la version courante configurée (`zonumental.legal.version-cgu`, `…-confidentialite`), sinon `409 version-texte-obsolete`. Les consentements facultatifs sont versionnés avec la version de la politique de confidentialité.

**Export (RG-013)** : `GET /api/compte/export` renvoie **toujours un zip** `zonumental-export-<date>.zip` contenant `donnees.json` (compte sans hash ni jetons, consentements datés, `captures: []` en R0) et, à partir de R1, `photos/<numero>.webp`. Format fixé dès R0 pour que le contrat ne change pas. En R1, `compte` déclare une interface publique de contribution à l'export que `capture` implémente (pas de dépendance de `compte` vers `capture`).

**Suppression (RG-014, Q-9)** :
1. `POST /api/compte/suppression` : `suppression_demandee_le = maintenant`, toutes les sessions révoquées, e-mail de confirmation.
2. Connexion avec les bons identifiants pendant le délai : `409 suppression-en-cours` (aucun jeton émis) ; `POST /api/compte/suppression/annulation` (e-mail + mot de passe, soumis à la limite de tentatives) annule et connecte.
3. Tâche planifiée quotidienne (03:00 Europe/Paris) : pour chaque compte dont la demande a plus de 30 jours, dans **une transaction par compte** : suppression de l'utilisateur (cascade sur consentements, jetons, sessions dans le schéma `compte`) et publication de `CompteSupprime(utilisateurId)`. Le pseudo et l'e-mail redeviennent libres.
4. Rejouable : un compte purgé n'est plus sélectionné ; un échec annule seulement ce compte, repris le lendemain.
5. R1 : `capture` écoute `CompteSupprime` (`@ApplicationModuleListener`) et efface ses lignes et le préfixe S3 de l'utilisateur, de façon idempotente. Le **registre d'événements Spring Modulith** (JDBC) est ajouté à ce moment-là pour que l'événement soit rejoué après un échec. En R0, aucun écouteur, donc pas de registre.

**Inactivité (RG-015)** : `derniere_activite_le` mise à jour à la connexion et au renouvellement (au plus une écriture par jour). Tâche quotidienne : 3 ans sans activité → e-mail d'avertissement (`avertissement_inactivite_le`) ; 30 jours plus tard sans retour → même chemin que la suppression (étape 3). E-mail non vérifié : suppression sans avertissement. Durées en propriétés `zonumental.compte.*` (`Duration`), pour les tests.

**Position jamais stockée (RG-036, R1)** : la requête de capture porte latitude, longitude et précision ; seuls la distance (mètres) et le résultat sont persistés. Interdiction de journaliser les corps de requête ; les DTO de capture redéfinissent `toString()` sans coordonnées. Pas de précision GPS stockée.

**Journaux** : jamais d'e-mail, de mot de passe, de jeton ni de coordonnées ; on journalise l'UUID utilisateur.

## Alternatives écartées

- **Suppression immédiate** : contraire à Q-9 (annulation possible).
- **Anonymisation au lieu de suppression** : le cahier demande une suppression définitive.
- **Export JSON seul en R0 puis zip en R1** : change le contrat entre deux releases.
- **Export asynchrone (lien envoyé par e-mail)** : inutile pour quelques Mo ; à reconsidérer si les archives de photos deviennent lourdes (le zip sera produit en flux, `StreamingResponseBody`).
- **Table d'état des consentements (une ligne par type, mise à jour)** : perd l'historique daté qui sert de preuve.

## Conséquences

- **Écart signalé (r0-socle-13)** : le critère dit « un fichier JSON est téléchargeable » ; il l'est, à l'intérieur du zip. À confirmer par le PO.
- Pas de clé étrangère inter-schémas : la cohérence `compte` → `capture` repose sur l'événement (rejoué grâce au registre à partir de R1).
- Les sauvegardes de base contiennent des comptes supprimés jusqu'à leur rotation : durée de rétention des sauvegardes à fixer avec l'hébergeur et à écrire dans le registre (amoa).
- Plusieurs instances backend un jour : les tâches planifiées devront être verrouillées (ShedLock). Une seule instance en R0.
