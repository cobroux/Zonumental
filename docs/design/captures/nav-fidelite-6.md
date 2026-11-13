# Barre de navigation, fidélité à NavBar (story fidelite-6)

Captures Playwright à 390 px (x2) : `nav-loin-390.png`, `nav-proche-390.png`, `nav-zone-390.png`, `nav-deja-390.png`.

Écarts avec `maquettes-v4-v6/NavBar.dc.html` :

1. Barre opaque `--zn-papier`, sans `backdrop-filter` (maquette : papier 94 % + flou 16 px), écart assumé (fidélité §2.3).
2. Entrées au repos en `--zn-gris-libelle` (maquette : `#6B6F75`, 4,47:1) ; libellé « loin » idem (`#5B5F66` dans la maquette, identique).
3. État `deja` ajouté (absent de la maquette) : rond gris 45, libellé « Déjà tamponné » sur une ligne (le nom accessible garde « ici »). Position inconnue = état `loin`.
4. Marge basse : `max(14px, safe-area)` au lieu des 22 px du cadre iOS simulé ; halo `zone` = `--zn-halo-zone` (token), impulsion 3 fois puis arrêt, absente en mouvement réduit.
5. Carte et Défis mènent à l'écran « Bientôt » (`/carte`, `/defis`), pas aux pages de la maquette ; noms accessibles du bouton central selon fidélité §6.3, plus parlants que ceux de la maquette.
