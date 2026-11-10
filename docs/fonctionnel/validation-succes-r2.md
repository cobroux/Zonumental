# Validation de la liste des succès R2 (PROVISOIRE)

Sources : `succes.yml`, `collections.yml` (backend/src/main/resources), cahier §3, §5, §12, RG-R2-01 à 08. Le fichier `succes.yml` n'est pas modifié.

## Constat général

- Les 11 succès du YAML correspondent exactement à RG-R2-01 : codes, critères, seuils identiques. Aucun écart de seuil.
- Les critères sont tous calculables à partir des captures (cahier §5 : seul « joueur / succès / date » est stocké). Cohérent.
- Les 6 collections du YAML correspondent à RG-R2-06 (LOIRE-CHATEAUX retirée, autres villes hors R2). 13 régions, dérivation du département conforme à RG-R2-05b.

## Constats et recommandations

| N° | Constat | Recommandation | Décision client vitale ? |
| --- | --- | --- | --- |
| 1 | Trois succès EXPLORATEUR ont le même nom (« Explorateur (10/25/50 tampons) ») : peu lisible au profil, et l'on ne distingue pas les paliers dans la célébration. | Noms distincts, seuil en sous-titre : 10 « Apprenti explorateur », 25 « Explorateur », 50 « Grand explorateur ». Codes inchangés. | Non. Défaut : noms ci-contre. |
| 2 | PREMIER_TAMPON (1) est un palier de même nature que EXPLORATEUR (nombre de captures). Pas un doublon (seuil distinct, rôle d'accueil du jour 0) mais chevauchement conceptuel. | Conserver. Ne pas ajouter d'autre palier bas. | Non. |
| 3 | TOUR_DE_FRANCE = 10 villes = la totalité des villes du catalogue actuel (10). Si une ville n'a aucun monument capturable ou est retirée, le succès devient inatteignable ; si le catalogue grandit, il devient plus facile à comprendre mais reste valide (obtention définitive). | Conserver le seuil 10 ; vérifier que les 10 villes ont chacune au moins un monument actif avant mise en ligne. Ne pas exprimer le seuil en « toutes les villes ». | Non. |
| 4 | CHASSEUR_RARE (5 RARE) et LEGENDE (1 LEGENDAIRE) : le nombre réel de monuments RARE et LEGENDAIRE dans le catalogue importé n'est pas dans les documents lus. Si moins de 5 RARE existent, le succès est inatteignable. | Contrôler le décompte par rareté dans le catalogue avant validation. Si RARE < 8, abaisser le seuil à 3. À confirmer par l'équipe technique (comptage). | Non, sauf catalogue très pauvre en RARE. |
| 5 | ENCYCLOPEDISTE (5 types distincts) : 8 types existent, mais PHARE et AUTRE sont peu fournis (RG-R2-06). 5 sur 8 reste atteignable avec les 6 types courants. | Conserver 5. | Non. |
| 6 | PARISIEN (10 captures à Paris) et « Tout Paris » (ensemble complet, ~25) : deux niveaux différents du même objectif, pas un doublon. Seul succès lié à une ville : traitement de faveur de Paris, cohérent avec la seule collection ville livrée (décision client déjà prise). | Conserver. Ne pas créer d'équivalents pour les autres villes en R2. | Non. |
| 7 | COLLECTIONNEUR (1 collection complétée) : RG-R2-05 ne dit pas si une collection d'ensemble < 3 monuments (invisible, RG-R2-07) compte. Ambiguïté. Avec les 6 collections actuelles, TYPE-PONT ou TYPE-MUSEE peut être complétée très tôt si leur ensemble est petit. | Ne compter que les collections visibles au sens de RG-R2-07 (ensemble >= 3). À ajouter dans RG-R2-01 par l'AMOA après accord du PO. | Non. Défaut : collections visibles seulement. |
| 8 | GLOBE_TROTTEUR (3 villes) et TOUR_DE_FRANCE (10) : paliers espacés sans intermédiaire. Acceptable avec 10 villes. | Conserver. | Non. |
| 9 | Le cahier §41 cite « Châteaux de la Loire » comme exemple de collection ; elle est retirée de R2 (catalogue sans ville de la Loire touristique). L'exemple du cahier ne sera pas visible. | Laisser le cahier tel quel (exemple de vision) ; le dire au client en recette. Les 13 régions de `collections.yml` ne servent à aucune collection livrée : prévues pour une release suivante, à ne pas enrichir. | Oui, déjà listé dans la synthèse RG-R2 (point 4) : renoncer à LOIRE-CHATEAUX ou élargir le catalogue. Défaut : renoncer en R2. |
| 10 | Rétroactivité (RG-R2-04) : un joueur R1 ayant déjà 25 captures obtient d'un coup PREMIER_TAMPON, EXPLORATEUR_10 et _25 à la date du rattrapage. La célébration doit gérer plusieurs succès simultanés. | Une célébration unique listant les succès, sans empilement de plusieurs écrans (voir recette R2-12). | Oui, déjà listé (RG-R2-04, à valider). Défaut : rétroactif. |
| 11 | La liste manque de succès pour le type RELIGIEUX / CHATEAU ou la rareté intermédiaire. | Non nécessaire en R2 : les collections par type jouent ce rôle. Pas d'ajout. | Non. |

## Décisions réellement vitales pour le client

Aucune nouvelle. Restent à confirmer, déjà tracées dans `regles-de-gestion-r2.md` : rétroactivité (RG-R2-04) et sort de LOIRE-CHATEAUX (RG-R2-06). Tout le reste a une valeur par défaut ci-dessus.

## Verdict

Liste cohérente avec le cahier et RG-R2-01 à 08. Lever le statut PROVISOIRE après : (a) renommage des trois paliers EXPLORATEUR, (b) comptage des raretés RARE du catalogue, (c) précision sur COLLECTIONNEUR (collections visibles uniquement).

## Issue #62 : critère obsolète

Le critère « moins de 20 tampons » de l'issue #62 est **obsolète**. Le seuil de 20 tampons ne concerne que les filtres du carnet (RG-045, Q-13). Pour les collections, RG-R2-07 le remplace : une collection apparaît dès **1 capture** dans son ensemble, si son ensemble compte **au moins 3 monuments**. Le critère de l'issue doit être réécrit en ce sens.
