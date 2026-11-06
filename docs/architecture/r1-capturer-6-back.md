# Plan technique backend — r1-capturer-6 (#32) Fiche verrouillée côté serveur

tech-lead-back, 2026-11-06. Cadre : ADR 0021 (images), 0015. Contrat : `docs/api/openapi.yaml` (`lireMonument`, `lireImageMonument`, `lireImageCouleurMonument`, schémas `Image`, `Monument`). Module `fr.zonumental.catalogue`, lecture seule, aucune migration. Branche `story/r1-capturer-6`.

## Fichiers

- `catalogue/MonumentController.java` : verrou dans `fiche(r, dates)` (seul point de construction, liste et fiche passent par là). `capturee = dates.get(numero) != null`. Non capturé → `stats`, `histoire`, `photoUrl`, `image.urlCouleur` à null. Ajout `siecle` (`Integer`, null si `annee` null) et `photoUrl` (`/api/captures/<n>/photo`) dans `Fiche` ; `Image(url, urlCouleur, …)` avec `url = /api/catalogue/images/<n>-nb.jpg`. Nouvel endpoint `GET /api/catalogue/monuments/{numero}/image` : 404 si non capturé par l'appelant / pas d'`image_url` / fichier absent ; sinon fichier couleur nommé d'après `image_url`, `Cache-Control: private, max-age=86400`. Réutiliser la table `TYPES` d'`ImageController` (la rendre package-private).
- `catalogue/ImageController.java` : regex `[0-9]+-nb\.jpg`, type `image/jpeg` seul. `SecuriteConfig` inchangé (`/api/catalogue/images/**` reste public, la route couleur est sous `/monuments/**` donc authentifiée).
- `catalogue/ImportCatalogue.java` : `enregistrerImage` écrit aussi `<n>-nb.jpg` (méthode privée `noirEtBlanc(byte[])`, cf. ADR 0021) ; dans `figer`, passe idempotente sur les monuments avec `image_url` dont le `-nb.jpg` manque.
- Siècle : `annee > 0 ? (annee - 1) / 100 + 1 : -((-annee - 1) / 100 + 1)` ; année 0 inexistante (traitée comme négative → -1, sans importance).
- Front généré (`frontend/src/app/core/api`) : régénéré par dev-frontend après merge du contrat (les trois `lireImageMonument$Png/$Webp` disparaissent).

## Tests d'abord (rouges avant code)

1. `commun/ContratOpenApiTest` : la comparaison existante couvre le nouveau chemin et les réponses (401/404). Ajouter `ficheDecritLesDeuxEtats` : dans le contrat, `Monument` requiert `siecle`, `stats`, `histoire`, `photoUrl`, chacun nullable ; `Image.urlCouleur` requis et nullable ; et le YAML généré contient `siecle`, `photoUrl`, `urlCouleur`.
2. `catalogue/FicheMonumentTest` (existant, étendre) :
   - D non capturé, `annee=1675` → `siecle=17`, `image.url` en `-nb.jpg`, `stats`/`histoire`/`photoUrl`/`image.urlCouleur` null, nom/numéro/type/ville/rareté présents (R1-72).
   - Non capturé sans année → `siecle` null (R1-72b) ; `annee=-19` → `-1` ; `1700` → 17 ; `1701` → 18.
   - Liste `GET /monuments` : même verrou (aucune URL couleur pour un non capturé).
   - A capturé → stats complètes, histoire + source + licence, `urlCouleur`, `photoUrl`, `captureeLe` (R1-74).
   - Capturé, stat inconnue → `null` (R0-26).
   - Capturé sans histoire → `histoire` null ; `update histoire_texte` en base puis relecture → présente (R1-77).
   - Capturé puis photo remplacée → histoire toujours là (R1-76 ; si le remplacement r1-capturer-4 n'est pas mergé, simuler par mise à jour de `photo_id`).
   - Isolation : capturé par un autre explorateur → vue verrouillée pour moi (RG-037).
3. `catalogue/ImageCatalogueTest` (existant) : `<n>-nb.jpg` 200 sans jeton, cache public ; `<n>.jpg` / `.png` / `.webp` → 404 (R1-73) ; chemins forgés toujours 404. Route couleur : sans jeton 401, non capturé 404, capturé 200 + octets du fichier couleur + `private`.
4. `catalogue/ImportCatalogueTest` : après `figer`, `<n>-nb.jpg` existe, est un JPEG décodable en niveaux de gris (R = G = B sur quelques pixels), PNG transparent → fond blanc ; relancer `figer` ne réécrit pas (date de modification inchangée) et génère les manquants.

## Risques

- **Fuite par la liste** : `Resume` réutilise `fiche()` ; le verrou doit être dans `fiche()`, pas dans `lire()`. Test dédié.
- **Rétrocompatibilité** : `image.url` change de sens (couleur → N&B) ; aucun écran ne le consomme, mais contrôler `features/` avant merge.
- **Déploiement** : sans import relancé, pas de `-nb.jpg` → 404 → silhouette. devops : lancer `figer` après déploiement.
- **Oracle de capture** : la route couleur révèle seulement l'état de capture de l'appelant lui-même : pas de fuite.
- **Siècle** : contrat en entier (17), formaté par le front ; la formulation de l'AC (« XVIIe siècle ») est l'affichage, à confirmer par qa/product-owner.
