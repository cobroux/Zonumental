# Profil 390 px (fidélité #95) : capture et écarts avec ProfilV6

Capture `profil-390.png` : données simulées (41 tampons dans 4 villes, 2 succès obtenus, 1 en cours), Chromium 390 x 844 @2x.

1. En-tête, avatar à anneau (2/3 vers le niveau 15), pseudo Gloock, « Niveau 14 · 41 tampons · 4 villes », grille de 4 médailles rondes (encrées, `41 / 50` biseautée, `?`), cartes Confidentialité et Mes données, liens légaux, Se déconnecter : conformes.
2. Écarts de contenu : pas de « Explorateur depuis le … » (le profil API n'expose pas la date de création, rien d'inventé) ; noms des 11 succès réels (pas ceux de la maquette) ; export décrit « dans un fichier .zip » (téléchargement, pas e-mail) ; la grille complète « à découvrir » s'affiche sans nom (« À découvrir ») car l'API ne renvoie pas les succès masqués.
3. « 2 / 11 › » et « Localisation » sont du texte, sans lien : il n'existe ni page `/succes` ni page d'explication de la position (à créer).
4. Interrupteurs : composant existant du design system (pastille creuse, bordure 3:1), pas la pastille blanche de la maquette ; changement à faire dans `controles.css` pour toute l'appli.
5. Pas de barre de navigation sur le profil (comme la maquette) : `/profil` n'a plus `data.navigation`.
