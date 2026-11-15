# Fiche monument : tampon animé et bloc succès (fidelite-15), 390 px

Captures : `fiche-tampon-avant-390.png` (feuille de célébration ouverte, tampon en attente sous le voile), `fiche-tampon-pendant-390.png` (pose à ~450 ms), `fiche-tampon-apres-390.png` (tampon posé, bloc succès). API simulée, sans photo catalogue : le tampon en papier est peu contrasté sur le fond de substitution.

Comparaison avec V2-Fiche :

1. Tampon : `zn-tampon` (socle, encre irrégulière) 138 px en bas à droite de la photo, `zf-press` 460 ms (délai 220 ms), joué une fois la feuille fermée ; fixe sans animation à l'ouverture normale ; aucune animation en `prefers-reduced-motion`.
2. Écart : tampon en papier (spec §3, tampon sur photo) et non bordeaux multiplié comme la maquette ; rotation déterministe `placement()` au lieu de -10° fixe.
3. Bloc « Succès débloqués » : médaille + nom + critère sur carte papier-clair rayon 14, conforme ; nom « Dame de fer » illustratif (noms RG-R2-01 : ici « Premier tampon »).
4. Écart : l'API n'a pas de lien monument-succès ; est « lié » le succès obtenu au même instant que la capture (±60 s) ; un seul affiché ; absent sinon.
5. Hors périmètre : bouton Partager et rejouer (2e vague). Annonce `aria-live="polite"` « Tampon posé sur la fiche. » uniquement après fermeture de la feuille.
