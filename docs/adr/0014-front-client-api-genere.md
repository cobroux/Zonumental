# ADR 0014 — Front : client d'API généré par ng-openapi-gen

- **Statut :** accepté (régénération en CI à valider avec `tech-lead-back` et `devops`)
- **Date :** 2026-10-19

## Contexte

Le cahier (§4) prévoit un contrat OpenAPI publié par springdoc, et un client Angular **généré** depuis ce contrat. La story r0-socle-4 ajoute : régénération sans édition manuelle, et une CI qui échoue si le contrat et le client divergent. Le contrat de référence est `docs/api/openapi.yaml`.

## Décision

- **Outil : `ng-openapi-gen` 1.1.0** (publié le 2026-09-23, dépend uniquement de `@angular/core >=16` et `rxjs`, vérifié sur npm). Il génère des modèles TypeScript, une fonction par opération et un service `Api` qui s'appuie sur `HttpClient`, donc sur nos intercepteurs.
- Configuration `frontend/ng-openapi-gen.json` : `input: ../docs/api/openapi.yaml`, `output: src/app/core/api`, `enumStyle: alias` (unions de chaînes, pas d'`enum` TypeScript), `removeStaleFiles: true`.
- **Le code généré n'est pas versionné** (`src/app/core/api/` dans `.gitignore`, ignoré par ESLint et Prettier). Il est régénéré par le script `npm run api` et appelé automatiquement en `postinstall`, `prestart`, `prebuild`, `pretest` et `prelint`. Ainsi, le client n'est **jamais** désynchronisé du fichier `openapi.yaml` présent dans le dépôt.
- **Détection de divergence en CI**, en deux contrôles :
  1. côté back (à la charge de `tech-lead-back`) : le contrat produit par springdoc au build doit être identique à `docs/api/openapi.yaml`, sinon échec ;
  2. côté front : `npm run api && ng build`. Si le contrat retire ou renomme un champ utilisé par un écran, la compilation TypeScript échoue.
- Le contrat se modifie **d'abord** dans `docs/api/openapi.yaml`, écrit par les deux tech leads (approche « contrat d'abord »). Aucune fonctionnalité ne déclare ses propres interfaces de réponse d'API à la main.
- L'endpoint de santé du contrat est appelé par la page de démonstration du design system à travers le client généré (critère de r0-socle-4). **[back + devops]** Le back l'expose en `/actuator/health` (ADR 0009). Avec un proxy qui ne route que `/api/*` vers le back, il faut soit le placer sous `/api` (`management.endpoints.web.base-path=/api`, qui donne `/api/health`), soit ajouter une règle de proxy. Je recommande la première solution : une seule règle de proxy, et une exclusion `/api/**` unique dans le service worker.

## Alternatives écartées

- **openapi-generator-cli `typescript-angular`** : il exige Java côté front, produit un code volumineux et lent à générer, et le wrapper npm télécharge un JAR.
- **@hey-api/openapi-ts** : encore en 0.x (0.99.0), avec une API qui change.
- **orval** : orienté React Query, sa cible Angular est secondaire.
- **Versionner le code généré** : des diffs bruyants à chaque changement de contrat, avec un risque d'édition manuelle. La divergence se détecte mieux par la compilation.

## Conséquences

- Un `npm ci` suffit après un clone : le client est généré automatiquement.
- Le nom des opérations dans le client vient de l'`operationId`. **Le back doit fixer des `operationId` stables et lisibles** (exemple : `inscrire`, `seConnecter`), sinon chaque renommage casse le front.
