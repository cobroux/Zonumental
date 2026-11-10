# Recette fonctionnelle — R2 « Collectionner » (RG-R2-01 à RG-R2-08)

Règles : `../regles-de-gestion-r2.md`. Liste des succès : `../validation-succes-r2.md`. Complète `r0-r1.md` et `r1-capturer.md`. La colonne « RG » est une référence provisoire ; le PO ajoutera les critères d'acceptation des stories.

Jeu d'essai : catalogue de ~125 monuments, 10 villes. Marco, e-mail vérifié. Autres joueurs : Léa (captures R1 avant R2), Sam (jour 0). Collection « Tout Paris » : ensemble de 25 monuments (à vérifier à l'import). Collection hors seuil : une collection dont l'ensemble contient 2 monuments (jeu de test à créer, ex. TYPE-PHARE fictif).

## Succès : obtention et progression

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R2-01 | Premier tampon | Given Sam sans capture, When il capture un monument, Then PREMIER_TAMPON obtenu, daté du jour | 01, 03 |
| R2-02 | Progression affichée | Given Marco à 7 captures, Then au profil EXPLORATEUR_10 affiche 7/10 et reste « en cours » | 02 |
| R2-03 | Franchissement du seuil | Given Marco à 9 captures, When la 10e est validée, Then EXPLORATEUR_10 obtenu et renvoyé dans la réponse de capture | 01, 03 |
| R2-04 | Plusieurs succès en une capture | Given Marco à 9 captures dont 0 légendaire, When la 10e est un monument LEGENDAIRE, Then EXPLORATEUR_10 et LEGENDE obtenus ensemble | 01 |
| R2-05 | Obtention unique | Given EXPLORATEUR_10 obtenu, When Marco capture un 11e monument, Then le succès n'est pas redonné et sa date ne change pas | 01 |
| R2-06 | Succès obtenu affiché | Given EXPLORATEUR_10 obtenu, Then le profil montre un tampon et seuil/seuil (10/10), plus de barre de progression | 02 |
| R2-07 | Critère villes | Given captures dans 2 villes, When une 3e ville est capturée, Then GLOBE_TROTTEUR obtenu ; Given 3 monuments dans une seule ville, Then non obtenu | 01 |
| R2-08 | Critère types | Given captures de 4 types distincts, When un 5e type est capturé, Then ENCYCLOPEDISTE obtenu | 01 |
| R2-09 | Critère Paris | Given 9 captures à Paris (INSEE 75056) et 3 ailleurs, When une 10e à Paris, Then PARISIEN obtenu ; les captures hors Paris ne comptent pas | 01 |
| R2-10 | Critère rareté | Given 4 captures RARE, When une 5e RARE, Then CHASSEUR_RARE obtenu ; une capture COMMUN ne compte pas | 01 |
| R2-11 | Plafonnement | Given 60 captures, Then EXPLORATEUR_50 affiche 50/50, pas 60/50 | 02 |
| R2-11b | Succès jamais retiré | Given PARISIEN obtenu puis un monument parisien retiré du catalogue, Then le succès reste obtenu | 01 |

## Célébration

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R2-12 | Animation de déblocage | Given une capture qui débloque 1 succès, Then après l'animation du tampon, l'animation de déblocage nomme le succès | 03 |
| R2-13 | Plusieurs succès, une célébration | Given une capture qui débloque 3 succès, Then une seule célébration les liste tous, sans trois écrans successifs | 03 |
| R2-14 | Pas de célébration sans succès | Given une capture qui ne franchit aucun seuil, Then aucune animation de succès | 03 |
| R2-15 | Calcul en échec | Given le calcul des succès échoue pendant une capture, Then la capture est valide ; Given la capture suivante, Then le succès manqué est obtenu | 03 |
| R2-16 | Succès non vu | Given un succès obtenu pendant que Marco est hors de l'application, When il l'ouvre, Then la célébration s'affiche une seule fois | 04 |

## Profil

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R2-17 | Jour 0 | Given Sam sans capture, When il ouvre son profil par l'avatar, Then les 11 succès sont visibles en cours à 0/seuil (les succès, eux, sont toujours visibles) | 02, 07 |
| R2-18 | Obtenus et en cours | Given Marco avec 2 succès obtenus, Then ils apparaissent en tampons avec leur date, les 9 autres en progression | 02 |
| R2-19 | Noms distincts | Given les trois paliers EXPLORATEUR, Then chacun a un nom distinct (voir validation, constat 1) | 01 |

## Rétroactivité R1

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R2-20 | Rattrapage | Given Léa avec 12 captures R1 et aucun succès, When R2 est mise en ligne et le rattrapage s'exécute, Then PREMIER_TAMPON et EXPLORATEUR_10 obtenus, date = date du rattrapage | 04 |
| R2-21 | Célébration à l'ouverture | Given le rattrapage terminé, When Léa ouvre l'application, Then célébration unique de ses succès, une seule fois | 04 |
| R2-22 | Rattrapage rejoué | Given le rattrapage déjà exécuté, When il est rejoué, Then aucun doublon, aucune date modifiée | 01, 04 |
| R2-23 | Joueur sans capture | Given Sam sans capture avant R2, Then aucun succès après le rattrapage | 04 |

## Collections au carnet : apparition (RG-R2-07)

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R2-24 | Jour 0 | Given Sam sans capture, Then le carnet ne montre aucune collection (cases vides seulement) | 07 |
| R2-25 | Première capture parisienne | Given Sam capture un château à Paris, Then « Tout Paris » (1/25) et « Châteaux de France » apparaissent ; « Ponts » et « Musées » restent invisibles | 07, 08 |
| R2-26 | Seuil >= 1 capture | Given Marco n'a rien capturé de type PONT, Then « Ponts » est invisible ; When il capture un pont, Then elle apparaît | 07 |
| R2-27 | Ensemble de 2 monuments | Given la collection d'essai à 2 monuments et Marco les a capturés tous deux, Then elle n'apparaît jamais | 07 |
| R2-28 | Ensemble de exactement 3 | Given une collection de 3 monuments, When Marco en capture 1, Then elle apparaît (1/3) | 07 |
| R2-29 | Non-disparition | Given « Tout Paris » apparue, When l'ensemble rétrécit (monument retiré), Then elle reste visible | 07 |
| R2-30 | Collection masquée sans lien | Given Marco a 30 captures mais aucune dans « Musées », Then « Musées » est invisible (le nombre total de tampons n'intervient pas) | 07 |
| R2-31 | Autres villes | Given Marco capture à Lille, Then pas de « Tout Lille » ; une mention « bientôt » est visible si elle est prévue au carnet [à confirmer, voir ambiguïté A2] | 06 |
| R2-32 | Châteaux de la Loire | Given le catalogue actuel, Then « Châteaux de la Loire » n'existe pas au carnet | 06 |

## Collections : progression et complétion

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R2-33 | Progression | Given Marco a 6 captures sur 25 à Paris, Then « Tout Paris » affiche 6/25 | 08 |
| R2-34 | Contenu | Given « Tout Paris » ouverte, Then les 6 capturés en tampons et les 19 autres en silhouettes numérotées | 08 (041) |
| R2-35 | Silhouettes et RG-042 | Given un monument non capturé de la collection, Then sa case n'affiche ni nom ni histoire ni couleur (même visibilité que le carnet) ; sa fiche s'ouvre selon RG-042 | 08 (042, 054) |
| R2-36 | Complétion | Given 24/25, When Marco capture le 25e, Then « Tout Paris » est complétée et COLLECTIONNEUR obtenu dans la même célébration | 05, 01 |
| R2-37 | Collection agrandie | Given « Tout Paris » complétée, When un 26e monument parisien est importé, Then elle passe à 25/26 (incomplète) et COLLECTIONNEUR reste obtenu | 05, 01 |
| R2-38 | Combinaison de types | Given « Palais et tours », Then un palais et une tour comptent tous deux dans l'ensemble | 06 |
| R2-39 | Monument dans deux collections | Given un château parisien capturé, Then il compte à la fois dans « Tout Paris » et « Châteaux de France » | 05 |
| R2-40 | Accessibilité | Given une collection complétée, Then l'état est écrit en toutes lettres (« Complétée »), pas seulement par une couleur | 08 |

## Cas limites RG-R2-07 et RG-042

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R2-41 | Pas de fuite par la collection | Given « Tout Paris » visible, When Marco tente d'obtenir par l'adresse technique le nom ou l'histoire d'un monument non capturé de la collection, Then le contenu n'est pas renvoyé (le total de l'ensemble est autorisé, pas le détail verrouillé) | 08 (054) |
| R2-42 | Total d'une collection | Given une collection non encore apparue, When Marco appelle la liste des collections, Then elle n'est pas renvoyée | 07 |
| R2-43 | Seuil et retrait d'un monument capturé | Given Marco a capturé le seul monument de son ensemble puis ce monument est retiré, Then la collection reste visible et le monument reste visible pour lui (R1-70) | 07 |
| R2-44 | Fiche non capturée depuis une collection | Given un monument de « Tout Paris » non capturé, Then sa fiche affiche numéro, nom, type, ville, rareté, distance, photo noir et blanc, siècle ; histoire et tampon absents | 08 (042) |

## Export RGPD des succès

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R2-45 | Contenu | Given Marco avec 3 succès, When il exporte ses données, Then `donnees.json` liste pour chaque succès son code et sa date d'obtention, rien d'autre | 01, 013 |
| R2-46 | Pas de progression stockée | Given des succès en cours, Then l'export ne contient aucune valeur de progression (non stockée) | 01 |
| R2-47 | Pas de collection | Given des collections visibles, Then l'export ne contient pas la liste des collections (dérivée des captures) [à confirmer, ambiguïté A3] | 05 |
| R2-48 | Joueur sans succès | Given Sam sans succès, When il exporte, Then la liste des succès est vide mais présente | 01 |
| R2-49 | Suppression | Given Marco demande la suppression de son compte, Then après 30 jours ses succès sont supprimés (pas d'anonymisation) | 01 |

## Ambiguïtés à trancher (signalées, non inventées)

- A1 : COLLECTIONNEUR compte-t-il une collection d'ensemble < 3 monuments ? Défaut recommandé : non (validation-succes-r2, constat 7).
- A2 : l'affichage « bientôt » des villes hors R2 (RG-R2-06) précise-t-il l'emplacement et la règle de visibilité (jour 0 sans aucune collection, RG-R2-07) ? À trancher PO / UX.
- A3 : l'export contient-il les collections ? RG-R2-05 laisse penser que non (dérivées) ; à confirmer avec le client.
- A4 : le total de l'ensemble d'une collection est-il révélé pour les monuments non capturés ? Supposé oui (compteur 6/25), sans détail verrouillé.
