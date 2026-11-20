# Partage (fidélité #130) : image et écarts avec V2-Partage

Captures : `partage-fidelite-19.png` (image générée 1080 x 1920, photo simulée en aplat bleu) et `partage-fidelite-19-fiche.png` (fiche 390 px avec le bouton « Partager ma page »). Chromium, Web Share désactivé (repli téléchargement).

1. En-tête, photo, tampon « CAPTURÉ » penché, nom Gloock, pied (pseudo, « N / total en France »), MRZ de 2 x 30 caractères, guillochis : conformes à la maquette (mise à l'échelle 405 x 720 vers 1080 x 1920).
2. Écart : le fond « papier » est un aplat `--zn-papier` (pas de grain `paperX`), et le tampon est une ellipse unique, sans filtre d'encre `#zn-encre` (le canvas ne peut pas l'utiliser) ni forme par type de monument.
3. Écart : pas de quartier (« Montmartre ») dans le tampon ni dans le sous-titre (donnée absente de l'API) : « VILLE · RARETÉ » et « Ville · année » ; « Paris · achevée en 1914 » devient « Paris · 1914 ».
4. Rang « N / total » : monuments distincts des collections de `/api/progression/collections` (seules les collections de 3 monuments ou plus) : le total peut différer de 118 tant que le catalogue n'y est pas entièrement rangé.
5. Pseudo : « Explorateur » sans consentement « classement » (D5) ; « Explorateur » aussi si le profil ou les consentements sont indisponibles.
6. Le bouton passe par Web Share avec fichier ; sans lui (ou en cas d'échec autre que l'annulation), téléchargement de `zonumental-N.png`.
