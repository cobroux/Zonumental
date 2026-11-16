# Carte Paris (fidelite-20) : écarts à CarteV6 (390 px)

Capture : `carte-fidelite-20-390.png` (Playwright, tuiles OpenFreeMap réelles, API simulée : 2 monuments à Paris dont 1 capturé ; l'épingle 004 est sélectionnée).

Fidèle : onglets Paris/France, pastille « Paris dévoilé à N % », brouillard papier à 94 % masqué par des cercles flous (r = 62 px à z12, double à chaque zoom), rues en deux gris, Seine, épingle à faire (rond + numéro, anneau bordeaux si sélectionnée), tampon encré pour les obtenus.

Écarts :
- Plan réel OpenMapTiles (Seine, rues) à la place du dessin SVG : tracé différent, couleurs reprises (tokens `--zn-carte-*`, à valider par ux-designer).
- Pas de grain de papier (`#paperM`) sur le brouillard.
- Pas de point de position ni de bouton « Recentrer » (hors périmètre, #132).
- Carte du plus proche remplacée par une carte de sélection : N°, nom, « Voir la fiche » (pas de photo, distance ni « Y aller », #132). Décision AMOA : épingle à faire = « N° 00X » seul, nom à la sélection.
- Attribution OSM / OpenFreeMap / OpenMapTiles en bas à gauche sur 3 lignes (le bouton central de la barre déborde au milieu).
- Onglet France : message « Bientôt disponible », pas de carte de France (#fidelite-24).
- Épingles : 44 px (cible tactile) au lieu de 30 px de la maquette.
