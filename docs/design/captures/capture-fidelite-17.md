# Capture, fidelite-17 : écarts à 390 px (capture-fidelite-17-zone-390.png, capture-fidelite-17-hors-zone-390.png)

1. Conforme : déclencheur rond 80 px (disque 64 px papier) actif dans la zone, nom accessible « Prendre la photo » ; hors zone, déclencheur verrouillé (cadenas, `aria-disabled`, anneau atténué) et « Le déclencheur s'active à 150 m · encore 270 m » (`aria-describedby`).
2. Boussole hors zone : carte verre avec flèche SVG orientée par `capVers`, N° · rareté, nom Gloock 26, « 420 m au sud · 5 min à pied » (repli texte : la direction est toujours écrite) ; flux réduit à l'échelle .82 (origine 50 % 30 %), luminosité .8.
3. Flash : éclair papier de 180 ms à la prise de vue, supprimé en `prefers-reduced-motion`. Bouton Flash (torche, `aria-pressed`) et Changer de caméra : affichés seulement si le navigateur les gère (aucun des deux sur le flux factice des captures).
4. Écarts assumés : flux factice vert (la maquette montre une photo) ; lien carnet affiché aussi hors zone (absent d'O4) ; distance à la dizaine (80 m vs 84 m) ; la boussole indique le cap géographique, pas l'orientation de l'appareil.
5. Comportement : hors zone, le déclencheur ne fait plus de requête (RG-036 reste vérifiée côté serveur) ; « Tu es à N m » ne s'affiche plus que sur refus serveur.
