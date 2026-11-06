# Règles de gestion R2 « Collectionner » (RG-R2-01 à RG-R2-08, plus RG-R2-05b)

Statut : **proposition AMOA, à valider par le client** (marqué [À VALIDER]). Sources : cahier §3, §5, §12 ; `catalogue-quotas.yml` (10 villes) ; `TypeMonument` (CHATEAU, RELIGIEUX, PONT, PHARE, PALAIS, TOUR, MUSEE, AUTRE) ; raretés COMMUN / RARE / LEGENDAIRE (RG-020).
Principe (cahier §5) : succès et collections sont définis en configuration ; seul « joueur X a obtenu le succès Y à la date D » est enregistré.

## Point 1 — Succès

**RG-R2-01 — Liste des succès.** Un succès a un code, un critère et un seuil. Il est obtenu une seule fois par joueur, jamais retiré (même si les quotas ou le catalogue changent).

| Code | Critère (sur les captures du joueur) | Seuil |
| --- | --- | --- |
| PREMIER_TAMPON | nombre de captures | 1 |
| EXPLORATEUR_10 / _25 / _50 | nombre de captures | 10 / 25 / 50 |
| CHASSEUR_RARE | captures de rareté RARE | 5 |
| LEGENDE | captures de rareté LEGENDAIRE | 1 |
| GLOBE_TROTTEUR | villes distinctes | 3 |
| TOUR_DE_FRANCE | villes distinctes | 10 |
| ENCYCLOPEDISTE | types distincts | 5 |
| PARISIEN | captures dans la ville INSEE 75056 | 10 |
| COLLECTIONNEUR | collections complétées (RG-R2-05) | 1 |

- Exemple : un joueur à 10 captures dont 2 Légendaires obtient EXPLORATEUR_10 et LEGENDE.
- Cas limite : une capture qui franchit plusieurs seuils débloque tous les succès concernés en une fois. Un seuil ne se recompte pas : les captures sont uniques par monument (une seule capture par couple joueur/monument).
- Alternative écartée : succès aux seuils nombreux (100, 250…) — hors périmètre tant que le catalogue fait ~125 monuments.
- Impact : story « calcul des succès » (config + règles) ; story « liste des succès au profil » (obtenu = tampon, en cours = progression valeur/seuil).

**RG-R2-02 — Progression d'un succès.** Chaque succès non obtenu expose `valeur courante / seuil`, plafonnée au seuil.
- Exemple : 7 captures → EXPLORATEUR_10 affiche 7/10.
- Cas limite : un succès obtenu affiche seuil/seuil, plus de progression.

**RG-R2-03 — Moment du calcul.** Les succès sont évalués à chaque capture validée (événement `CaptureValidée`). Les succès débloqués par cette capture sont renvoyés dans la réponse de capture (animation de déblocage, cahier §5 étape 8).
- Cas limite : si le calcul échoue, la capture reste valide ; le succès est rattrapé à la capture suivante (le calcul porte sur l'ensemble des captures, pas sur la seule dernière).

## Point 2 — Captures R1 et succès

**RG-R2-04 — Rétroactivité.** Les captures faites en R1 comptent pour les succès. À la mise en ligne de R2, un rattrapage unique évalue tous les joueurs ; la date d'obtention est la date du rattrapage. Le joueur voit l'animation de déblocage à sa prochaine ouverture de l'application (succès « non vu »).
- Exemple : joueur à 12 captures R1 → PREMIER_TAMPON et EXPLORATEUR_10 obtenus au rattrapage.
- Cas limite : rattrapage rejoué = aucun doublon (RG-R2-01, obtention unique).
- Justification (une phrase) : une règle unique « les succès se calculent sur toutes les captures » est la plus simple et évite de pénaliser les testeurs R1.
- Alternative écartée : compteur à zéro au démarrage de R2 (non rétroactif) — injuste et exige de distinguer deux populations de captures.
- Impact : la story de calcul inclut une tâche de rattrapage idempotent ; critère de recette dédié. [À VALIDER client]

## Point 3 — Région

**RG-R2-05b — Région d'un monument.** La région est **dérivée du code INSEE de la ville du monument** (département = 2 premiers caractères, 3 pour l'outre-mer, puis table département → région en configuration). Aucun champ saisi par monument.
- Exemple : Nantes 44109 → département 44 → Pays de la Loire.
- Cas limite : ville dont le département est absent de la table = région « inconnue », monument exclu des critères région (échec visible au démarrage de la config plutôt qu'au runtime : à trancher par le tech lead).
- Alternative écartée : champ `region` sur le monument (redondant avec la ville, 125 valeurs à tenir à jour).
- Impact : stories collections par région ; ne tranche pas l'implémentation (colonne dérivée ou calcul en config). Villes actuelles : Paris IDF, Marseille/Nice PACA, Lyon Auvergne-Rhône-Alpes, Toulouse/Montpellier Occitanie, Nantes Pays de la Loire, Strasbourg Grand Est, Bordeaux Nouvelle-Aquitaine, Lille Hauts-de-France. [À VALIDER client : découpage régional actuel (13 régions)]

## Collections

**RG-R2-05 — Définition d'une collection.** Une collection a un code, un nom et un critère sur le type, la ville ou la région (éventuellement combinés par ET). Son **ensemble** = monuments du catalogue qui répondent au critère. Elle est **complétée** quand tous les monuments de son ensemble sont capturés.
- Exemple : « Tout Paris » = ville 75056 ; avec 25 monuments, complétée à 25/25.
- Cas limite : si le catalogue grandit (nouvel import), l'ensemble s'agrandit et une collection complétée peut redevenir incomplète ; le succès COLLECTIONNEUR déjà obtenu est conservé (RG-R2-01).

**RG-R2-06 — Liste des collections.**

| Code | Nom | Critère |
| --- | --- | --- |
| VILLE-<insee> | « Tout <ville> » (une par ville de la config, dont « Tout Paris ») | ville = INSEE |
| TYPE-CHATEAU | Châteaux de France | type CHATEAU |
| TYPE-RELIGIEUX | Édifices religieux | type RELIGIEUX |
| TYPE-PONT | Ponts | type PONT |
| TYPE-MUSEE | Musées | type MUSEE |
| TYPE-PALAIS-TOUR | Palais et tours | type PALAIS ou TOUR |
| LOIRE-CHATEAUX | Châteaux de la Loire | type CHATEAU ET région Pays de la Loire ou Centre-Val de Loire |

- Cas limite important : le catalogue actuel (10 grandes villes) ne contient **aucune** ville de Touraine/Anjou ; « Châteaux de la Loire » n'aurait que les éventuels châteaux de Nantes. Elle reste donc masquée (RG-R2-07) tant que le catalogue n'est pas élargi. PHARE et AUTRE n'ont pas de collection (trop peu de monuments). [À VALIDER client : liste, noms, et élargir le catalogue à Amboise/Blois/Tours/Angers… ou renoncer à LOIRE-CHATEAUX en R2]
- Impact : story de définition des collections en config ; recette « Tout Paris » faisable dès R2, « Châteaux de la Loire » conditionnée à l'import de nouvelles villes (R0 / catalogue).

## Point 4 — Apparition dans le carnet

**RG-R2-07 — Seuil d'apparition.** Une collection apparaît dans le carnet du joueur dès qu'il a capturé **au moins 1 monument de son ensemble**, et seulement si son ensemble compte **au moins 3 monuments** dans le catalogue. Avant cela, elle est invisible (jour 0 : cases vides, pas de collection, cahier §6 densité progressive).
- Exemple : après le premier tampon à Paris, « Tout Paris » (0→1/25) et « Châteaux de France » si c'est un château apparaissent ; « Tout Lille » reste masquée.
- Cas limite : un ensemble de 2 monuments ou moins n'apparaît jamais ; une collection une fois apparue ne disparaît pas, même si l'ensemble rétrécit. Les succès, eux, sont toujours visibles au profil (RG-R2-02).
- Alternative écartée : seuil global (ex. 20 tampons, comme les filtres) — trop tardif pour un objectif long terme et sans lien avec le contenu de la collection.
- Impact : stories d'affichage des collections au carnet (condition d'affichage) ; recette : 0 capture = aucune collection ; 1 capture = uniquement les collections concernées. [À VALIDER client]

**RG-R2-08 — Progression d'une collection.** Affichée `capturés / total de l'ensemble` et la liste des monuments avec tampon ou silhouette (numéro Pokédex, RG-041).
- Cas limite : les silhouettes d'une collection restent soumises à la visibilité des non-capturés (RG-042).

## À valider par le client (synthèse)
1. Liste des succès et des seuils (RG-R2-01).
2. Rétroactivité R1 et date d'obtention = date du rattrapage (RG-R2-04).
3. Région dérivée de l'INSEE ; découpage régional (RG-R2-05b).
4. Liste/noms des collections ; sort de « Châteaux de la Loire » vu le catalogue actuel (RG-R2-06).
5. Seuils d'apparition : ≥ 1 capture dans l'ensemble, ensemble ≥ 3 (RG-R2-07).
