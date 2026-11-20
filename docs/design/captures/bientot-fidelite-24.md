# « Bientôt » carte France et classement (fidelite-24) : écarts (390 px)

Captures : `carte-france-fidelite-24-390.png` (onglet France), `defis-fidelite-24-390.png` (`/defis`). Playwright, API simulée.

Fidèle : tablist Paris/France conservée et visible, papier du socle, tampon SVG à encre (`zn-tampon`, forme rectangle, `BIENTÔT`), phrase « <sujet> : bientôt disponible. On y travaille. » (nom accessible = texte visible, tampon décoratif). Composant partagé `zn-bientot-etat` (shared/ui). Aucune animation.

Écarts :
- Pas de maquette dédiée « Bientôt » : état conçu à partir du socle (D6).
- Carte de France (silhouette, compteurs de villes) et classement 3 portées hors périmètre (D6).
- Correctif : l'état « Bientôt » recouvrait les onglets de la carte (impossible de revenir à Paris) ; `header` passe en `z-index: 1`.
