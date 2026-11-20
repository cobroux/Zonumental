# Écart fidélité 22 : carte « Défi de la semaine » (`/defis`)

Capture : `defis-fidelite-22-390.png` (390 px, API simulée).

Fidèle à DefisV4 : saison, minuteur, nom, description, compteur, pastilles, récompense.

Écarts assumés :
- Pastille non faite sans libellé : « ? » visible, « à faire » pour le lecteur d'écran.
- Minuteur mis à jour à la minute, sans annonce vocale ; sous 1 h : « FIN DANS 12 MIN ».
- Avatar de profil de l'en-tête non repris (hors story) ; le retour existant est conservé.
- Classement : état « Bientôt » conservé (D6), traité par #134.
- Nouveau token `--zn-rose-tampon` (#e8b7bd) pour la pastille faite.
