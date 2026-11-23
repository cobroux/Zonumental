# Écart defis-2 : classement actif (`/defis`)

Capture : `defis-defis-2-390.png` (390 px, API simulée Playwright, port 4311, `e2e/classement.spec.ts`).

Fidèle à DefisV4 (etat = actif) : onglets, podium (médailles), « ··· » si premier rang autour de moi > 4, ligne « Toi » cerclée bordeaux, tendance « = / +n / −n », mention de confidentialité.

Écarts assumés :
- Onglet Amis présent mais désactivé (hors story) ; France : « Bientôt » (D6), sans appel réseau. Ville Paris (75056) en dur (Q-36).
- Lignes sans « Niveau · quartier » (Q-35) ; score affiché « N tampons ». Avatar « T » pour « Toi », initiale du pseudo sinon.
- Médaille bronze : `--zn-ocre-texte` (aucun token bronze), argent `--zn-gris-6b`.
- Sans consentement (`rang` null) : « – » + « Non classé » et lien « Confidentialité » (/confidentialite) à la place de « Réglages », inexistant.
- Maquette « CETTE SEMAINE » (étiquette) et titre/badge non repris dans le bloc classement.
