# Partage (fidélité #130) : image et écarts avec V2-Partage

Captures : `partage-fidelite-19.png` (image générée 1080 x 1920, photo simulée en aplat bleu) et `partage-fidelite-19-fiche.png` (fiche 390 px avec le bouton « Partager ma page »). Chromium, Web Share désactivé (repli téléchargement).

1. En-tête, photo, tampon « CAPTURÉ » penché, nom Gloock, pied (pseudo, « N / total en France »), MRZ de 2 x 30 caractères, guillochis : conformes à la maquette (mise à l'échelle 405 x 720 vers 1080 x 1920).
2. Écart : le fond « papier » est un aplat `--zn-papier` (pas de grain `paperX`), et le tampon est une ellipse unique, sans filtre d'encre `#zn-encre` (le canvas ne peut pas l'utiliser) ni forme par type de monument.
3. Écart : pas de quartier (« Montmartre ») dans le tampon ni dans le sous-titre (donnée absente de l'API) : « VILLE · RARETÉ » et « Ville · année » ; « Paris · achevée en 1914 » devient « Paris · 1914 ».
4. Rang « N / total » : monuments distincts des collections de `/api/progression/collections` (seules les collections de 3 monuments ou plus) : le total peut différer de 118 tant que le catalogue n'y est pas entièrement rangé.
5. Pseudo : « Explorateur » sans consentement « classement » (D5) ; « Explorateur » aussi si le profil ou les consentements sont indisponibles.
6. Le bouton passe par Web Share avec fichier ; sans lui (ou en cas d'échec autre que l'annulation), téléchargement de `zonumental-N.png`.

## Fidélité #149 : « cercle blanc vide » sous le titre

Décision : voulu par la maquette, aucun médaillon à remplir, rien à retirer. V2-Partage trace 36 ellipses `cx=202 cy=590 rx=230 ry=54` tournées de 5° en 5° (lignes 27 et 65 du HTML) : leur enveloppe laisse un disque vide de rayon ry (54 x 2,67 = 144 px sur le PNG), l'oeil de la rosette. La maquette ne contient ni cercle, ni tampon, ni médaille à cet endroit (seuls le tampon « CAPTURÉ » penché et la MRZ). Le canvas reprend exactement ces paramètres ; la maquette est identique, mais son grain `paper` (absent du canvas, écart 2) estompe le disque. Test de non-régression : `partage.spec.ts` (36 ellipses 230 x 54, aucun cercle ajouté).
Repli Safari iOS : inchangé (`roundRect` et `letterSpacing` toujours utilisés, comme avant ; non aggravé).
