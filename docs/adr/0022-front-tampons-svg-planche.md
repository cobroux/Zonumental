# ADR 0022 — Front : tampons SVG partagés, filtre d'encre unique et placement déterministe

- **Statut :** accepté
- **Date :** 2026-11-11
- **Complète :** ADR 0016 (composants), ADR 0017 (filtres SVG, §3 et §5)

## Contexte

Les maquettes v4 à v6 (CarnetV4, ProfilV6, NavBar, O5-GardeTampon) font foi (ADR 0016, révision). Le carnet livré est une grille de cases ; la maquette montre une planche de papier sur laquelle des tampons libres de 4 formes (cercle, rectangle, ovale, quatrième forme) sont posés avec une rotation, à l'encre irrégulière (`feTurbulence` + `feDisplacementMap`), en `mix-blend-mode: multiply`, avec le texte en arc (`textPath`). Le profil réutilise ce vocabulaire (médailles rondes). La maquette dessine aussi le papier avec un `feTurbulence` plein écran, ce que l'ADR 0017 §1 interdit.

## Décision

1. **Composants dans `shared/ui/`** : `zn-tampon` (forme, encre, textes en entrée ; aucun appel API), `zn-planche`, `zn-bandeau`, `zn-medaille`. Ils ne sont importés que par des fonctionnalités chargées à la demande : ils restent hors du paquet initial.
2. **Filtre d'encre défini une seule fois, en SVG statique dans `index.html`** (`<svg aria-hidden="true" width="0" height="0">` avec `<filter id="zn-encre">`, graine fixe). Pas de JavaScript, pas de duplication par instance, aucune taille ajoutée au paquet JS.
3. **Le filtre est appliqué par une classe CSS** (`.zn-encre { filter: url(#zn-encre) }`) et non par l'attribut `filter=` : il peut être coupé par media query. Coupé en `forced-colors: active` (le tracé passe en `CanvasText`, plein et lisible).
4. **Papier** : on garde `papier.webp` (ADR 0017 §1). Le `paperC` de la maquette n'est pas repris.
5. **`mix-blend-mode: multiply` une seule fois, sur le calque des tampons de la planche**, jamais tampon par tampon (un mélange par tampon crée un groupe isolé de plus à composer à chaque défilement).
6. **Placement déterministe** : une fonction pure `placement(numero) → { rotation, dx, dy }` (hachage entier du numéro, rotation bornée à ±8°, décalage borné dans sa cellule). La planche reste une grille CSS : le tampon est décalé par `transform` à l'intérieur de sa cellule. Pas de coordonnées absolues en pixels, pas de chevauchement, ordre DOM = ordre des numéros (ordre de lecture et de tabulation conservé), même rendu à chaque visite.
7. **Forme par type de monument** (4 formes : cercle, rectangle, octogone, ovale), table fixe dans `zn-tampon`. Trait unique pour tous les tampons (filet épais + filet fin), comme la maquette : ni double filet, ni étoile, ni encre ocre. La rareté est portée par l'encre (commun marine, rare bordeaux, légendaire sapin) **et** par le mot écrit en toutes lettres (spec `docs/design/fidelite-maquettes-v4-v6.md` §3.2).
8. **Images pré-rendues (ADR 0017 §5) : repli seulement**, déclenché si la mesure sur l'appareil de référence dépasse le budget (tâche > 50 ms au défilement). Le texte en arc dépend du monument : une image par type × rareté ne porterait que le cadre, le texte resterait en SVG sans filtre.

## Alternatives écartées

- **Filtre dans un composant Angular racine** : ajoute du code au paquet initial (déjà au-dessus de l'avertissement) pour un contenu statique.
- **Placement absolu pseudo-aléatoire comme la maquette** : non responsive, chevauchements, ordre de focus incohérent avec l'ordre visuel.
- **Pré-rendu d'emblée** : perte du texte en arc à l'encre et génération d'images à maintenir, sans preuve de besoin.

## Conséquences

- `index.html` porte une dépendance implicite (`#zn-encre`) : un test vérifie sa présence.
- Les identifiants des `textPath` doivent être uniques par instance (compteur de module), pas dérivés du seul numéro : un même monument peut apparaître deux fois sur la page (planche et collection).
- Les couleurs de la maquette absentes de `tokens.css` (or du bandeau, par exemple) deviennent des tokens validés par `ux-designer`, ou sont refusées (test « aucune couleur hexadécimale »).
- La mesure de performance (ADR 0017 §6) devient un critère d'acceptation de la PR carnet.
