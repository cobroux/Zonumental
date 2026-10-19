# ADR 0007 — Import du catalogue (Wikidata, Wikipédia, Commons, Mérimée)

- **Statut :** proposé (tech-lead-back, 2026-10-19)
- **Stories :** r0-socle-18, -19, -20
- **Règles :** RG-016 à RG-023, Q-7, Q-8, Q-15, Q-16, Q-18

## Contexte

Cahier §2/§4/§5 : une tâche lit les sources ouvertes, applique `catalogue-quotas.yml`, met à jour la base, relançable sans effet de bord. Numéros fixes jamais réutilisés, rareté calculée à l'import, source et licence de chaque texte et image, stats jamais inventées.

## Décision

**Déclenchement** : tâche ponctuelle dans le même jar. `ApplicationRunner` actif seulement si `zonumental.catalogue.importer=true` ; il importe puis arrête l'application (code retour 0 / 1). En prod : `docker compose run --rm backend --zonumental.catalogue.importer=true`. Fichier lu depuis `zonumental.catalogue.quotas` (défaut `classpath:catalogue-quotas.yml`, surchargeable par `file:` sans rebuild).

**Format de `catalogue-quotas.yml`** (contenu : amoa, Q-16) :
```yaml
villes:
  - { nom: Paris, insee: "75056", quota: 25 }
  - { nom: Lyon,  insee: "69123", quota: 10 }
rayons:            # surcharges du rayon de capture en mètres (50 à 500, RG-021 / Q-15)
  Q243: 300        # identifiant Wikidata -> rayon
```
Fichier invalide (quota < 0, rayon hors 50-500, INSEE en double) : l'import s'arrête avant tout appel réseau.

**Sources** (appels uniquement depuis la tâche, `User-Agent` descriptif avec contact du projet, conforme à la politique Wikimedia) :

| Donnée | Source |
| --- | --- |
| Candidats d'une ville | Wikidata SPARQL : éléments situés dans la commune (`P131*` de la commune `P374` = INSEE) **ayant un identifiant Mérimée (`P380`)**, une coordonnée (`P625`) et un article fr.wikipedia |
| Type, année, style, hauteur, image | Wikidata `P31`, `P571` (précision année ou mieux, sinon absente), `P149` (libellé fr), `P2048` (seulement si l'unité est le mètre), `P18` |
| Popularité | API Wikimedia Pageviews : vues de l'article fr.wikipedia sur les **12 derniers mois complets** |
| Texte histoire | API REST Wikipédia `page/summary` : introduction de l'article, licence **CC BY-SA 4.0**, URL de l'article |
| Licence et auteur de l'image | API Commons `imageinfo` / `extmetadata` (`LicenseShortName`, `LicenseUrl`, `Artist`, `AttributionRequired`) |

**Algorithme** (logique pure `SelectionCatalogue`, testée en JUnit sans réseau) :
1. Par ville : `places = max(0, quota − monuments déjà en base pour cette ville)`. Les candidats déjà importés sont écartés ; les autres sont triés par popularité décroissante, puis nom (ordre alphabétique, RG-017), puis identifiant Wikidata ; on garde les `places` premiers. Diminuer un quota ne retire rien (RG-018).
2. Numérotation (RG-019, Q-18) : les nouveaux monuments, toutes villes confondues, triés comme ci-dessus, reçoivent `max(numero) + 1, + 2, …`. Les monuments ne sont jamais supprimés, donc un numéro n'est jamais réattribué.
3. Rareté (RG-020, Q-8) : sur l'ensemble du catalogue (N monuments) classé par popularité, `L = round(0,05 × N)` et `R = round(0,20 × N)` (arrondi à l'entier le plus proche, demi vers le haut). Rang ≤ L : Légendaire ; ≤ L + R : Rare ; sinon Commun. **Seuls les nouveaux monuments** reçoivent une rareté ; les existants gardent la leur.
4. Monuments existants : nom, type, stats, position, textes, image, licences et popularité sont rafraîchis ; **numéro, ville et rareté ne changent jamais** ; le rayon ne change que s'il est surchargé dans `rayons` (sinon la valeur en base est conservée, 150 m à la création).
5. Licences (RG-022) : image sans licence identifiable, ou licence exigeant l'attribution sans auteur connu → image non importée (`image = null`, le front affiche la silhouette). Auteur Commons nettoyé du HTML. Pas de texte sans licence.
6. Type de jeu : correspondance `P31` → enum `TypeMonument` en code (liste à valider, voir conséquences), défaut `AUTRE`.

**Idempotence et sûreté** : phase 1 = toutes les lectures réseau (sans transaction) ; phase 2 = une seule transaction d'écriture, précédée de `pg_advisory_xact_lock` (deux imports simultanés impossibles). Une erreur de source (après 3 essais espacés) arrête l'import **sans rien écrire**. Clé d'identité : `wikidata_id` (unique) ; l'identifiant Mérimée est stocké à côté. Un monument absent des sources est seulement listé dans le journal (pas de retrait automatique en R0).

## Alternatives écartées

- **Lire directement le jeu de données Mérimée (data.culture.gouv.fr)** : Wikidata porte déjà l'identifiant Mérimée (`P380`), les coordonnées et le lien Wikipédia. Lire les deux et les rapprocher doublerait le code sans changer la sélection.
- **Popularité par nombre de sitelinks Wikidata** : une seule requête, mais ce ne sont pas des vues (le cahier demande les vues).
- **Tâche planifiée (`@Scheduled`) ou endpoint d'admin** : le cahier veut « modifier le fichier et relancer » ; un endpoint exigerait un rôle admin qui n'existe pas.
- **Batch Spring** : sur-dimensionné pour ~120 lignes.
- **Séquence PostgreSQL pour les numéros** : un import annulé laisserait des trous dès le premier import.
- **Retrait automatique des monuments absents des sources** : une réponse SPARQL partielle retirerait des monuments par erreur.

## Conséquences

- **Écarts signalés au cahier §2/§4** :
  1. Wikidata ne contient pas les vues Wikipédia : la popularité vient de l'API Pageviews de Wikimedia, via l'article lié depuis Wikidata.
  2. Mérimée est utilisée **via Wikidata** (`P380`), pas par lecture directe du jeu de données.
  3. **Critère d'éligibilité** proposé : « monument historique (identifiant Mérimée) avec un article fr.wikipedia ». Il exclut des lieux populaires non protégés. **Décision client requise.**
- Paris compte environ 2 000 candidats : ~2 000 appels Pageviews, quelques minutes d'import (débit limité volontairement). Acceptable pour une tâche manuelle.
- La popularité évolue : relancer l'import des mois plus tard ne change pas la sélection existante (on ne fait que combler des places), mais peut changer les monuments ajoutés si un quota augmente.
- **Liste des types de jeu** (`CHATEAU, RELIGIEUX, PONT, PHARE, PALAIS, TOUR, MUSEE, AUTRE` proposée) : à valider par PO/UX, car chaque type a une forme de tampon (cahier §12).
- Le retrait d'un monument (Q-7 : visible mais plus capturable) n'a de sens qu'avec la capture : colonne et règle ajoutées en R1.
