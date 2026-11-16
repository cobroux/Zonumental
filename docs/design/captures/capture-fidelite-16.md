# Capture plein écran, fidelite-16 : écarts à 390 px (capture-fidelite-16-zone-390.png, capture-fidelite-16-hors-zone-390.png)

1. Conforme : flux plein cadre sur nuit, voiles haut/bas (SVG inline, pas de `gradient(` en CSS), retour 44 px, pastille « Dans la zone · 100 m » (point pulsant, immobile en mouvement réduit) ou « Hors zone · 420 m » (ocre sous encre), cadre à 4 coins, bloc N° · rareté · ville, nom Gloock 40, consigne.
2. Écarts assumés : flux factice vert de Playwright (la maquette montre une photo) ; hors zone, flux atténué (luminosité .8) sans réduction d'échelle à .82 ; cadre masqué hors zone comme O4.
3. Distance via `formaterDistance` (dizaine) : la maquette affiche 84 m, nous 80 m ; état « Position imprécise » (> 100 m) ajouté, absent des maquettes.
4. Hors périmètre (#117) : déclencheur rond 80 px, cadenas, boussole, flash, changement de caméra, accès carnet ; le bouton « Prendre la photo » reste un bouton plein 54 px provisoire.
5. Annonces : région `aria-live="polite"` n'annonçant que l'état de zone (pas la distance qui change à chaque pas).
