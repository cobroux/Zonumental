# Carnet 390 px (fidélité #94) : captures et écarts avec CarnetV4

Captures `carnet-j0-390.png`, `carnet-j3-390.png`, `carnet-j60-390.png` : données simulées (28 monuments à Paris, 10 par autre ville), position proche de Paris, Chromium 390 x 844 @2x.

1. Bandeau, onglets `Paris 24/28`, chips en pilules, libellé `PAGE 1 / 3 — PARIS` et planche de papier à guilloches : conformes. Écarts : « · N°1 » supprimé (décision 7), pas de secteur (« RIVE DROITE », décision 5), onglets triés par taille puis nom (Paris, Bordeaux, Lyon, Marseille).
2. Tampons libres : 4 formes, encre irrégulière, rotation et décalage déterministes, `LÉGENDAIRE`/`RARE`/`COMMUN` écrits. Écart : une grille de cellules (pas de coordonnées libres), 6 par page sous 6 tampons, 12 ensuite.
3. Jour 0 : 6 cases en creux, case « Ton premier tampon · 1,1 km » en pointillé bordeaux, phrase d'accroche. Sans position, ni distance ni case marquée.
4. Bandeau j60 : les 3 stats passent sur 2 lignes à 390 px (la maquette tient sur une ligne avec des libellés plus serrés) ; comportement voulu au zoom, mais visible dès 390.
5. Hors maquette : le lien « Collections · N terminées › » mène à l'accordéon actuel (ancre `#collections`) en attendant #96 ; l'accès au profil est une zone de toucher sur le sceau Z (décision 6).
