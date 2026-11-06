# ADR 0021 — Images de référence : noir et blanc publique, couleur authentifiée

- **Statut :** accepté (tech-lead-back, tech-lead-front, 2026-11-06)
- **Stories :** r1-capturer-6 (#32) ; amende r0-socle-21 (images publiques)

## Contexte

RG-054 / R1-73 : l'image couleur d'un monument non capturé ne doit pas être obtenable, même par son adresse technique. Aujourd'hui `/api/catalogue/images/<n>.<ext>` sert la couleur publiquement (une `<img>` n'envoie pas le jeton gardé en mémoire, ADR 0015). CSP front : `img-src 'self' blob:`.

## Décision

- **Noir et blanc généré à l'import**, public : `GET /api/catalogue/images/<n>-nb.jpg` (seul nom accepté par la route publique), `public, max-age=1 an, immutable`. Utilisable en `<img src>` sans jeton. C'est `image.url` dans le contrat, dans les deux états et dans la liste.
- **Couleur derrière authentification** : `GET /api/catalogue/monuments/{numero}/image`, 404 `introuvable` si l'appelant n'a pas capturé le monument (même réponse que monument inconnu ou sans image). `private, max-age=86400`. C'est `image.urlCouleur`, null si non capturé.
- Le front lit la couleur comme la photo souvenir : `fetch` + Bearer → `URL.createObjectURL` (`blob:` déjà autorisé), révoqué à la sortie de l'écran. Aucun changement de CSP.
- Fichier couleur inchangé sur disque (`<n>.<ext>`, colonne `image_url` gardée comme référence de stockage) : seule la route publique change. Aucune migration.
- Conversion : `ImageIO.read` (lecteur WebP TwelveMonkeys déjà présent) → dessin sur `TYPE_BYTE_GRAY` avec fond blanc (transparence PNG) → JPEG 0,85 via le JDK. Pas de redimensionnement (Commons nous donne déjà du 1200 px).

## Alternatives écartées

- **Filtre CSS `grayscale` sur la couleur publique** : la couleur reste obtenable (contredit R1-73).
- **Couleur publique sous URL non devinable** : sécurité par obscurité, l'URL fuit par le cache, l'historique, le partage.
- **Cookie de session pour les images** : contredit ADR 0015 (jeton en mémoire, pas de cookie d'accès), ouvre le CSRF.
- **URL signée à durée courte en query string** : nouvelle mécanique de signature pour un besoin couvert par le schéma déjà en place pour la photo souvenir.
- **Génération paresseuse du noir et blanc à la première requête** : écriture disque sur une route publique non authentifiée.

## Conséquences

- Licence : le noir et blanc est une adaptation (CC BY / BY-SA exigent d'indiquer la modification) ; le front l'indique à côté de l'attribution.
- Monuments déjà importés : `figer` génère les `-nb.jpg` manquants (idempotent). Tant que l'import n'a pas tourné après déploiement, la route publique renvoie 404 → le front affiche la silhouette. À enchaîner au déploiement (devops).
- Les clients qui pointaient sur `<n>.jpg` cassent (aucun écran front ne les consomme encore).
- Trafic couleur via le backend, comme la photo souvenir (volume faible : seulement les monuments capturés).
