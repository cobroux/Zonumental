# ADR 0024 — Défis et classement dérivés des captures, consentement comme seul filtre de visibilité

- **Statut :** proposé (tech-lead-back, 2026-11-20) ; à valider par tech-lead-front sur le contrat `docs/api/defis-classement.md`
- **Stories :** fidelite-22 (#133), fidelite-23 (#134) ; prépare defis-2 (classement actif) et le système d'amis

## Contexte

`/defis` affiche « Bientôt ». Les maquettes `DefisV4` (états `actif` et `lancement`) demandent : défi de la semaine (minuteur, compteur, pastilles, récompense), classement hebdomadaire Amis / Ville / France (rang, score, tendance, ligne « Toi »), seuil d'ouverture d'une ville à 50 explorateurs. CDC : classement opt-in (consentement `CLASSEMENT`, décoché par défaut), pseudo seul visible, aucune position stockée (RG-036). Aucune table défi/classement/amis n'existe ; `capture.capture` (horodatage serveur RG-048, immuable : RG-035 conserve la date d'origine) et `progression.succes_obtenu` existent.

## Décision

1. **Nouveau module `fr.zonumental.competition`** (CDC R6), sous-paquets par fonctionnalité `defi` et `classement`. Il lit `capture.capture`, `catalogue.monument` et `compte.consentement` en SQL (`JdbcClient`), comme `progression` le fait déjà pour les captures : pas de dépendance Java vers `capture`/`compte`.
2. **Défis en configuration, pas en base** (même principe que les succès, CDC §4) : `competition/defis.yml`, validé au démarrage (codes uniques, périodes sans chevauchement, `finLe > debutLe`, numéros existants vérifiés au premier appel). Fenêtre `[debut, fin)` en heure de Paris. Critères : `CAPTURES` (N tampons, filtre optionnel `ville`/`type`/`rarete`) et `MONUMENTS` (liste de numéros).
3. **Progression dérivée, jamais stockée** : `CAPTURES` = captures dont `capturee_le ∈ [debut, fin)` répondant au critère ; `MONUMENTS` = monuments de la liste capturés avant `fin`, y compris avant la semaine (RG-034 interdit de recapturer, Q-30). Un remplacement de photo ne recompte pas (date d'origine conservée).
4. **Récompense persistée dans `progression.succes_obtenu`** avec le code `DEFI_<code>` au moment de la capture qui atteint le seuil (même mécanisme que `CalculSucces`) : export et effacement RGPD déjà couverts, aucune nouvelle table. Livrée dans une story séparée (#133 affiche `reussi` dérivé).
5. **Classement calculé à la lecture**, par semaine ISO (lundi 00:00 Paris) : score = captures de la semaine dans la portée ; rang = `row_number()` par score décroissant puis date de la dernière capture comptée croissante (premier arrivé devant), pas d'ex æquo. Tendance = rang final de la semaine précédente − rang actuel (null si absent la semaine précédente). Pas de table d'instantanés ; si le temps de réponse dépasse 300 ms au p95, vue matérialisée rafraîchie toutes les 5 min (à décider sur mesure, pas avant).
6. **Consentement = seul filtre de visibilité** : seuls les comptes dont le dernier consentement `CLASSEMENT` est accordé, e-mail vérifié et sans suppression demandée, sont classés, comptés pour le seuil et visibles des autres. Un explorateur sans consentement voit le classement des autres et sa propre ligne « Toi » (non classée, `rang` null), jamais exposée à autrui. Retrait du consentement : effet immédiat (calcul à la lecture).
7. **Données minimales exposées** : pseudo, rang, score, tendance, indicateur `moi`. Ni UUID, ni ville/quartier dérivés des captures (révèlent les habitudes de déplacement, esprit RG-036), ni niveau (XP non modélisée avant R5). Réponse de taille fixe (podium 3 + voisinage ±1), pas de pagination ni de liste complète : pas d'énumération des joueurs.
8. **Seuil d'ouverture** : une ville est ouverte quand le nombre d'explorateurs classables (point 6) ayant au moins une capture dans la ville (toutes périodes) atteint `seuil` (50, configurable `zonumental.classement.seuil-ville`). Une fois atteint, la ville reste ouverte (pas de clignotement) : date d'ouverture enregistrée dans `competition.ville_ouverte`. France : même seuil sur l'ensemble (Q-33). Amis : sans seuil.

## Alternatives écartées

- **Tables `defi` + `defi_progression`** : administration de défis non demandée, progression redondante avec les captures (désynchronisation, effacement RGPD à doubler).
- **Instantané hebdomadaire du classement** (job planifié) : planificateur, rattrapage et données personnelles en plus pour une tendance recalculable.
- **Classer tous les comptes et masquer le pseudo des non-consentants** (« Explorateur ») : le score et le rang d'une personne restent exposés sans consentement.
- **Compter tous les comptes pour le seuil** : la ville s'ouvrirait avec un classement presque vide (consentement décoché par défaut).
- **Pagination du classement complet** : énumération des pseudos, sans besoin écran.

## Conséquences

- Migrations proposées (non écrites) : `V11__capture_index_date.sql` = index `capture.capture (capturee_le)` (#133) ; `V12__competition.sql` = schéma `competition`, table `ville_ouverte (ville_code_insee text PK, ouverte_le timestamptz)` (defis-2). Aucune donnée personnelle nouvelle pour #133/#134.
- `MesSucces` doit résoudre le libellé des codes `DEFI_*` depuis `defis.yml` : un défi passé ne doit jamais être retiré du fichier (validation au démarrage : code présent en base absent du fichier = avertissement).
- Amis (portée `AMIS`) : nouvelles tables `competition.invitation` et `competition.amitie`, export et effacement à ajouter ; hors de cet ADR, contrat à part.
- Tri et seuil reposent sur le consentement lu à chaque requête : l'index `consentement_utilisateur_type` existant suffit.
