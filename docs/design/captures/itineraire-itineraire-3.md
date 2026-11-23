# Itinéraire itineraire-3 : panneau d'itinéraire à 390 px

Capture : itineraire-itineraire-3-390.png (API simulée par `page.route`, vraies tuiles, `CAPTURE=1 PORT=4312 npx playwright test itineraire`). Aucune maquette de référence (CarteV6 sans itinéraire) : proposition minimale.

Écarts à valider par `ux-designer` :
1. Token `--zn-carte-itineraire` ajouté (provisoire : `var(--zn-marine)`, 9:1 sur le fond de carte) ; épaisseur 5 px en dur dans `fond-carte.ts`, pas de token d'épaisseur.
2. Le bloc `.selection` devient une carte unique (fiche + boutons + résumé + étapes) ; boutons pilule 44 px (encre plein / contour), étapes dans un `<details>` replié, liste limitée à 28 dvh.
3. Mention RGPD (Q-43, texte provisoire, à valider par `amoa`) et lien de repli OpenStreetMap (Q-44, constante `lienRepli`).
4. Le tracé est cadré avec une marge basse de 280 px : le panneau déplié recouvre encore le bas de la carte.
5. `carte.css` dépasse le budget d'avertissement de 6 ko (6,69 ko).
