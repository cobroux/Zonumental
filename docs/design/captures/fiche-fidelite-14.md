# Fiche monument (fidelite-14), 390 px

Captures : `fiche-capturee-390.png`, `fiche-non-capturee-390.png` (API simulée e2e, sans image catalogue : fond papier-sombre à la place de la photo).

Comparaison avec V2-Fiche :

1. Fidèle : photo 360 px, bouton rond Retour 44 px, feuille arrondie 26 px sur papier, kicker mono, titre Gloock 42, pastilles rareté + type, trio ANNÉE / HAUTEUR / MATÉRIAU.
2. Écart : kicker `N°001 · PARIS` sans arrondissement (l'API ne l'expose pas) ; matériau « — » (D3, `stats` sans matériau).
3. Hors périmètre (#115) : tampon animé, bloc succès ; Partager (2e vague) : boutons et CTA « Partager ma page » absents.
4. Non capturé (D4) : même gabarit, photo N&B, stats et histoire verrouillées, CTA « Aller le tamponner ».
5. Ajout : crédits image et texte (CC BY-SA) conservés en pied de feuille, « Remplacer la photo » en bouton secondaire.
