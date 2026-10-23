# Recette fonctionnelle — R1 « Capturer » (compléments RG-046 à RG-058)

Complète `r0-r1.md` (scénarios R1-01 à R1-45, toujours valables). Règles : `../regles-de-gestion.md`. Parcours : `../parcours-r1.md`. Les liens aux critères d'acceptation des stories seront ajoutés par le PO (colonne « RG » = référence provisoire). Q-23 à Q-28 tranchées le 2026-10-22.

Jeu d'essai : celui de `r0-r1.md` (A n° 1 rayon 150 m, B n° 2 à 600 km de A, C n° 3 rayon 400 m) + D n° 4 non capturé, à 100 m de A, rayon 150 m, sans texte d'histoire. Marco, e-mail vérifié, jour 0.

## Parcours complet

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R1-50 | Jour 0 jusqu'au carnet | Given Marco neuf, à 100 m de A, When il ouvre Explorer, choisit A, prend la photo et valide, Then animation du tampon, fiche de A avec histoire, carnet « 1 sur N » avec A en tampon et les autres en silhouettes | 024, 038, 041, 044, 055 |
| R1-51 | Choix du monument | Given Marco à 100 m de A et de D, Then la liste propose A et D sans présélection ; When il choisit D, Then seule la capture de D est créée | 050 |
| R1-52 | Une photo, un monument | Given une photo prise pour A, Then elle ne peut pas être associée à D | 050 |

## Distance, précision, horodatage

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R1-53 | Distance affichée au refus | Given distance réelle 151,2 m, rayon 150 m, Then refusé et message « Tu es à 160 m » (jamais ≤ 150 m) | 032, 046 |
| R1-54 | Décision sur valeur exacte | Given distance réelle 149,6 m (affichée 150 m), Then acceptée | 046 |
| R1-55 | Précision mauvaise puis bonne | Given précision 140 m, When refus, puis Marco sort à découvert et « Réessayer », précision 25 m, Then capture acceptée avec la même photo | 031, 047 |
| R1-56 | Refus de précision sans effet | Given 3 refus de précision de suite, Then aucune capture créée et la limite de fréquence n'est pas entamée (10 captures encore possibles) | 030, 047 |
| R1-57 | Intérieur | Given précision toujours > 100 m, Then pas de capture, message RG-039, aucun mode dégradé | 047 |
| R1-58 | Heure de l'appareil fausse | Given l'horloge du téléphone décalée de 5 h, When capture, Then la date enregistrée est celle du serveur (heure de Paris à l'affichage) et les contrôles de fréquence et de vitesse ne sont pas faussés | 048 |

## Données conservées et photo

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R1-59 | Contenu conservé | Given une capture réussie, Then on retrouve exactement explorateur, monument, date, distance, photo ; ni position, ni précision, ni appareil | 036, 049 |
| R1-60 | Export | Given 1 capture, When Marco exporte, Then pour la capture : monument, date, distance, photo ; aucune coordonnée | 013, 049 |
| R1-61 | Journal des refus | Given un refus pour distance, Then au plus type de refus, date et compte sont journalisés, aucune position ; supprimés sous 30 jours | 049 |
| R1-62 | Photo portrait | Given une photo prise en portrait, Then elle s'affiche à l'endroit sur la fiche et ne contient aucune métadonnée | 037, 051 |
| R1-63 | Taille mesurée à l'envoi | Given une photo brute de 8 Mo réduite par l'appli à 900 Ko, Then acceptée ; Given un fichier envoyé de 5,1 Mo, Then refusé | 028, 051 |
| R1-64 | Dimension stockée | Given une photo envoyée en 1600 px, Then elle est stockée à 1600 px maximum sur le côté long, sans recadrage | 051 |
| R1-65 | Remplacement tout ou rien | Given A capturé, When le remplacement échoue en cours d'envoi, Then l'ancienne photo reste affichée | 035, 051 |
| R1-66 | Pas de modération | Given une photo sans monument visible mais position valide, Then capture acceptée, aucun contrôle de contenu | 052 |

## Ordre des contrôles et déjà capturé

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R1-67 | Déjà capturé avant format | Given A capturé et un fichier invalide, Then message « déjà capturé » + remplacement proposé (pas d'erreur d'image) | 053 |
| R1-68 | Remplacement et vitesse | Given A capturé hier, B capturé il y a 10 min, When Marco remplace la photo de A à 50 m, Then accepté (vitesse non appliquée) | 035, 053 |
| R1-69 | Remplacement et fréquence | Given 10 captures dans l'heure, When un remplacement, Then refusé avec délai | 030, 053 |
| R1-70 | Monument retiré | Given D retiré du catalogue, Then un autre explorateur ne peut plus le capturer ; Marco, qui l'a capturé, le voit toujours | 053 |

## Silhouette, fiche, histoire

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R1-71 | Case non capturée | Given D non capturé, Then la case du carnet montre « 4 » et une silhouette, sans nom | 041, 054 |
| R1-72 | Fiche non capturée | Given D non capturé (construit en 1675), Then nom, type, ville, rareté, distance, photo noir et blanc et siècle « XVIIe siècle » visibles ; année exacte, style, hauteur, histoire, tampon, image couleur absents | 042, 054 |
| R1-72b | Siècle inconnu | Given un monument non capturé sans date de construction, Then le siècle affiche « — » | 023, 054 |
| R1-73 | Contenu verrouillé inaccessible | Given D non capturé, When Marco tente d'obtenir son histoire ou ses stats par l'adresse technique de la fiche, Then le contenu n'est pas renvoyé | 054 |
| R1-74 | Fiche capturée | Given A capturé, Then fiche avec tampon, stats, histoire (source et licence), image couleur et photo souvenir, année exacte (plus seulement le siècle), date de capture | 022, 043, 054 |
| R1-75 | Déblocage immédiat | Given une capture de A réussie, Then l'histoire est lisible dès l'écran qui suit l'animation | 055 |
| R1-76 | Déblocage définitif | Given A capturé puis photo remplacée, Then l'histoire reste débloquée | 043, 055 |
| R1-77 | Monument sans histoire | Given D sans texte, When Marco le capture, Then capture valide, section « Histoire à venir » ; Given le texte importé plus tard, Then lisible sans nouvelle action | 023, 055 |

## Liste Tamponner

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R1-78 | Capturés dans la liste | Given A capturé et B proche, Then la liste montre A « tamponné » et B | 024, 056 |
| R1-79 | Tout est déjà tamponné | Given seul A à 2 km et déjà capturé, Then bouton gris « Déjà tamponné ici », pas de halo ; remplacement accessible depuis la fiche | 025, 056 |

## Hors ligne

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R1-80 | Appli sans réseau | Given mode avion, When Marco ouvre l'appli, Then l'interface se charge mais carnet et fiches affichent « Pas de connexion. Réessayer » ; rien n'est stocké sur l'appareil | 057 |
| R1-81 | Photo gardée à l'écran | Given photo prise puis réseau coupé, When « Réessayer » réseau revenu (> 30 s), Then position relue, même photo envoyée, capture validée | 040, 057 |
| R1-82 | Écran quitté | Given photo prise puis réseau coupé, When Marco quitte l'écran de capture, Then la photo est perdue et il doit en reprendre une | 057 |
| R1-83 | Réponse perdue | Given capture enregistrée mais réponse jamais reçue, When Marco rouvre l'appli, Then A est un tampon dans le carnet ; « Réessayer » ne crée pas de doublon | 034, 057 |

## Anti-triche (périmètre R1)

| ID | Scénario | Given / When / Then | RG |
| --- | --- | --- | --- |
| R1-84 | Refus répétés | Given 20 refus de suite pour distance, Then aucun blocage ni sanction du compte, seul le message RG-039 | 058 |
| R1-85 | Limite acceptée | Given une position simulée à 50 m de A, Then la capture est acceptée en R1 (risque connu, vérification IA en R7) | 058 |
| R1-86 | Pas de galerie | Given l'écran de capture, Then aucun accès à la galerie, quel que soit l'appareil | 026, 058 |
