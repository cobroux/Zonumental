# Bouton Tamponner, fidelite-13 : routage par état à 390 px

Captures : tamponner-fidelite-13-{loin,proche,zone}.png (barre) et `-ouvert.png` (page atteinte au toucher). Maquettes : NavEtats, NavBar.

1. Barre inchangée (fidelite-6) : loin gris, proche bordeaux + distance, zone halo vert ; `app.html` transmet `data-etat`, texte et destination réels de `Proximite` (test `app.spec.ts`).
2. Destinations : loin = fiche du plus proche non capturé du catalogue (même au-delà de 2 km) ; proche = fiche du plus proche (défaut de l'issue ; NavEtats parle de caméra) ; zone = caméra du monument de la zone ; imprécis, déjà tamponné ou position inconnue = `/tamponner`.
3. `/tamponner` : liste radio supprimée ; reste les états de position, « Rien à tamponner près de toi » (RG-024) et « Déjà tamponné ici ». Le bouton central ne porte plus `aria-current` (sa cible change selon l'état).
