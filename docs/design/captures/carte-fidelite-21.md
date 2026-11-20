# Carte : position et plus proche (fidelite-21) : écarts à CarteV6 (390 px)

Capture : `carte-fidelite-21-390.png` (Playwright, API simulée, position à 100 m d'un monument capturé, « Arc D » à faire à 70 m). Tuiles OpenFreeMap non chargées pendant la capture (réseau indisponible) : fond papier uni, à refaire en local avec réseau (`CAPTURE=1 PORT=4421 npx playwright test carte`).

Fidèle : point de position marine à liseré papier et halo de 20 px, bouton « Recentrer sur ma position » de 48 px (droite 16 px), carte du plus proche (photo en niveaux de gris, « N° 004 · COMMUN · À DÉCOUVRIR » en mono, nom Gloock 22 px, distance et temps à pied, « Y aller »).

Écarts :
- Halo de taille fixe (20 px), sans rapport avec la précision GPS.
- Sans image (API) : vignette grise unie à la place de la photo.
- Libellé rareté sur 2 lignes à 390 px (la maquette tient sur une ligne).
- Carte du plus proche à 64 px du bas ; elle recouvre le haut de l'attribution (3 lignes). Bouton Recentrer 12 px au-dessus de la carte, et non à 528 px fixe.
- Carte du plus proche masquée quand une épingle est sélectionnée (la sélection prend sa place).
- Le tampon d'un monument capturé est partiellement masqué par le point quand ils coïncident (cas de la capture).
