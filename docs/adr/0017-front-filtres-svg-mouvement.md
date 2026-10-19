# ADR 0017 — Front : texture papier, encre SVG et mouvement réduit

- **Statut :** accepté
- **Date :** 2026-10-19

## Contexte

L'identité repose sur le papier et sur des tampons à l'encre irrégulière (§12). En SVG, l'effet passe par `feTurbulence` et `feDisplacementMap`. Ces filtres sont **calculés par le processeur, pixel par pixel, à chaque nouveau rendu de l'élément** : toute animation, tout défilement qui force un rendu ou tout zoom les recalcule. Sur un Android d'entrée de gamme, en plein soleil, avec le GPS actif, c'est la première source de saccades et de consommation de batterie. Le carnet (R1) affichera jusqu'à ~120 tampons.

## Décision

1. **Papier = image statique, pas un filtre en direct.** On génère une fois le grain (WebP en mosaïque, ≤ 8 Ko), qui sert de `background-image` au `body`. Coût d'exécution nul.
2. **Guilloches = motif SVG vectoriel sans filtre** (`<pattern>` ou SVG en arrière-plan). C'est un coût de dessin simple.
3. **Encre irrégulière des tampons (R1)** : un filtre SVG unique, défini une fois dans le document, à graine fixe (`seed`) pour un rendu stable, appliqué **seulement aux tampons de petite taille et immobiles**. On n'anime jamais `baseFrequency`, `scale` ni un attribut de filtre.
4. **Animation du coup de tampon (R1)** : on anime uniquement `transform` et `opacity` sur un conteneur, avec `will-change: transform` **pendant l'animation seulement**, pour que le tampon filtré soit traité comme une image composée et pas recalculé à chaque image.
5. **Carnet (R1)** : si la mesure le justifie, les tampons de la grille sont des images pré-rendues (une par forme de type × encre de rareté), et le filtre en direct est réservé à la fiche. La décision sera prise par la mesure, pas par principe.
6. **Budget de mesure** (R1, sur l'appareil de référence Android d'entrée de gamme désigné par `qa`) : défilement du carnet sans tâche > 50 ms dans le profil Performance, animation du tampon à ≥ 50 images/s.
7. **`prefers-reduced-motion: reduce`** : une règle globale dans `shared/styles/` ramène les animations et transitions décoratives à une durée quasi nulle. Le coup de tampon devient une apparition sans rebond ni secousse, le halo vert de la NavBar ne pulse plus (le halo reste, fixe). L'information n'est jamais portée par le mouvement seul.
8. **Durées** : retour d'interface ≤ 200 ms (ADR 0016). Seule la célébration du premier tampon (R1) peut aller jusqu'à 600 ms, et elle est interruptible par un appui.
9. **`forced-colors: active`** (contraste élevé Windows) : focus en `outline` (jamais seulement en `box-shadow`) et bordures en `CanvasText`, pour rester visibles.

## Alternatives écartées

- **Filtres SVG en direct partout** (papier compris) : coût permanent sur chaque rendu, injustifiable.
- **Canvas / WebGL pour l'encre** : beaucoup de code pour un effet que les SVG statiques ou les images pré-rendues donnent déjà.
- **Bibliothèque d'animation** (GSAP, Motion) : les transitions CSS et `@starting-style` suffisent, et `@angular/animations` est inutile pour des effets aussi simples.

## Conséquences

- En R0, il n'y a pas de filtre en direct (pas de tampon). Seuls le grain papier et les guilloches statiques sont livrés.
- `ux-designer` fournit le grain papier et les formes de tampons en SVG simplifiés (peu de points), parce que la complexité du tracé multiplie le coût du filtre.
