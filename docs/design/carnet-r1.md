# Carnet R1 : spec de design (stories #37 r1-capturer-11, #38 r1-capturer-12)

Sources : CDC §12 (maquettes v4-v6 priment), ADR 0016/0017/0018, glossaire. Les issues #37/#38 n'ont pas pu être lues (pas d'accès `gh` pour ce rôle) : le `product-owner` vérifie les critères d'acceptation contre cette page.
Référence : téléphone 360 x 740, marges 16 px, papier #F4F1EA, encre #1A1C20. Polices : Gloock (titre), Geist (UI), Geist Mono (numéros, tampons).

## 1. Écran Carnet

```
[avatar]  Carnet (h1, Gloock 28)          <- en-tête 56 px
X sur N   Paris                            <- compteur Geist Mono 14 + barre fine
[<] Paris  1/10 [>]                        <- pagination ville, 44 px
(filtres : une rangée, dès 20 tampons)
+----+----+----+----+----+
| 01 | 02 | 03 | 04 | 05 |   5 colonnes, gap 8, case ~59 x 72
+----+----+----+----+----+
| 06 | 07 | ... jusqu'à 30 cases (Paris = 6 rangées)
[ Accueil Carnet (Tamponner) Carte Défis ]  <- barre 64 px
```
- Une page = une ville ; flèches `<` `>` (44 x 44) + nom de ville en `<h2>` ; la ville courante est la plus proche de l'utilisateur, sinon Paris. Pas de défilement interne au zoom par défaut (objectif de conception, ADR 0018 : l'écran défile à 200 % de zoom).
- Compteur global « X sur N » (ex. « 7 sur 118 »), en texte, avec barre de progression (`role="progressbar"`, valeurs en texte aussi). Sous-compteur de la ville : « 3 sur 10 ».
- Case : numéro Geist Mono 11 (« N° 042 », zéros à gauche) sous la forme ; toute la case est un lien vers la fiche.
- Jour 0 (0 tampon) : le guide remplace le compteur, au-dessus de la grille réduite (cases vides visibles) : « 1. Va près d'un monument  2. Prends-le en photo  3. Reçois ton tampon ». 3 lignes numérotées, icônes 24 px, un bouton « Voir la carte » (54 px, arrondi 14). Le guide disparaît au 1er tampon.
- États : chargement = cases squelette (papier plus sombre, sans animation si mouvement réduit) ; vide ville = « Aucun monument dans cette ville pour l'instant » ; erreur = bandeau `role="alert"` « Carnet indisponible » + bouton « Réessayer ».

## 2. Case non capturée

Numéro + silhouette grisée générique du type (trait #8A8F98 plein, remplissage #E4E0D6), sans nom. Pas de rareté affichée (glossaire : nom et rareté sur la fiche seulement).

Silhouettes (SVG 48 x 48, <= 12 points, un seul détail intérieur) :

| Type | Forme |
| --- | --- |
| CHATEAU | donjon crénelé, deux tours |
| RELIGIEUX | nef + clocher pointu |
| PONT | trois arches, tablier plat |
| PHARE | tour conique, lanterne |
| PALAIS | façade large, fronton |
| TOUR | haute tour effilée |
| MUSEE | portique à colonnes |
| AUTRE | losange (borne) |

## 3. Case capturée (tampon)

- Forme du cadre = type (les 8 formes ci-dessus servent de contour du tampon, silhouette pleine en encre dans un cadre circulaire ; AUTRE = cadre losange). Encre irrégulière : filtre unique à graine fixe, tampons immobiles, option images pré-rendues type x rareté (ADR 0017 §3-5).
- Encre par rareté (jamais seule) :

| Rareté | Encre | Token |
| --- | --- | --- |
| COMMUN | marine #1F3A5F | `--encre-commun` |
| RARE | bordeaux #8C2F39 | `--encre-rare` |
| LEGENDAIRE | ocre #8A5E1E (texte), #B07A2A (fond du tampon seulement) | `--encre-legendaire` |

- Texte en toutes lettres dans le tampon (Geist Mono) : « N° 042 », nom (2 lignes max, tronqué avec « … » en grille), type, rareté (« Commun », « Rare », « Légendaire »). En grille (59 px) le tampon affiche le numéro, le nom tronqué (2 lignes max), le type et la rareté en toutes lettres (9 px), exigé par #37 (« numéro, nom, type, rareté »). Nom complet dans le nom accessible. Rareté aussi codée par le trait : COMMUN simple, RARE double filet, LEGENDAIRE double filet + étoile.

## 4. Filtres (#38)

Visibles dès 20 tampons (sinon absents du DOM). Une seule rangée de chips défilante horizontalement (`overflow-x: auto`, hauteur 44, flèche d'indice), dans l'ordre : Tous · Tamponnés · À découvrir · Type (8, menu). Seuls type et état sont prévus par #38 : pas de filtre rareté ni ville (la pagination gère la ville). Chips = boutons `aria-pressed`, texte + icône SVG 20 px, état actif = fond encre + coche (pas la couleur seule). Une seule sélection par groupe, compteur « 5 résultats » en `role="status"`. Aucun résultat : « Aucun monument ne correspond » + « Effacer les filtres ». Les filtres s'appliquent à la page de la ville courante ; si 0 résultat, indiquer le nombre dans les autres villes.

## 5. Accessibilité

- Nom accessible par case : capturée « N° 042, Château de Chambord, château, rare, capturé » ; non capturée « N° 042, à découvrir » (jamais le nom, RG-054).
- Cibles >= 44 px (case 59 x 72, chips 44, flèches 44). Focus 3 px marine décalé 2 px ; contraste texte >= 4,5:1 ; ocre texte #8A5E1E seulement.
- Grille en `<ul>`/`<li>` avec liens ; pagination `<nav aria-label="Villes">` ; focus sur le `<h1>` à l'entrée, sur le `<h2>` au changement de ville ; changement annoncé en `role="status"`.
- `prefers-reduced-motion` : pas de bascule animée entre villes ni d'apparition en cascade des tampons ; `forced-colors` : bordures `CanvasText`.

## 6. Décisions à valider

1. Encres : marine (Commun), bordeaux (Rare), ocre (Légendaire) ; le sapin reste réservé à l'état « dans la zone ».
2. Les silhouettes grisées non capturées sont des silhouettes de type (8), pas du monument réel (spoil évité).
3. Filtres limités à type et état (#38), une seule sélection par groupe. Le tampon en grille affiche nom et type (#37) au prix d'un texte 9 px.
