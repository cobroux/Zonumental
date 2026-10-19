# ADR 0019 — Front : tests (Vitest, Playwright, axe, GPS simulé) et français seul sans framework i18n

- **Statut :** accepté (i18n : avis du client demandé)
- **Date :** 2026-10-19

## Contexte

Le cahier (§8) fixe : TDD ; tests unitaires avec l'outil par défaut d'Angular ; tests d'intégration avec appels d'API simulés ; ESLint pour les frontières entre fonctionnalités ; tests de bout en bout Playwright avec GPS simulé et axe ; couverture ≥ 80 % sur la logique métier. L'application est en français seulement en V1. Le « monde » arrive « plus tard », sans engagement de langue.

## Décision

**Tests unitaires et d'intégration**
- **Vitest**, le lanceur par défaut du CLI Angular 22 (`ng test`, builder `@angular/build:unit-test`, environnement jsdom). Vitest 5.0.5 est la dernière version sur npm, couverte par la plage `^4.0.8 || ^5.0.0` d'`@angular/build@22.2.3`.
- Composants testés avec `TestBed`. Appels d'API simulés avec `provideHttpClientTesting()` et `HttpTestingController` (c'est le niveau « intégration » du §8). Aucune bibliothèque de mocks en plus.
- À tester en priorité (logique métier côté client) : le calcul d'âge (RG-002, bornes 15 ans aujourd'hui et demain, fuseau Europe/Paris), les validateurs de pseudo et de mot de passe, la correspondance entre code d'erreur et message, l'intercepteur (un seul renouvellement pour N requêtes 401, pas de boucle, pas de Bearer vers une autre origine), les gardes (URL de retour, refus de `//evil.com`), la session.
- **Couverture** : fournisseur v8, seuil de **80 %** en lignes et en branches sur `src/app/**`, hors `core/api/` (code généré), `*.routes.ts` et `main.ts`. En dessous, la CI échoue.

**Bout en bout**
- **Playwright** 1.64.1 et **@axe-core/playwright** 4.14.0 (versions vérifiées sur npm), dans `frontend/e2e/`, rangés par fonctionnalité (`e2e/compte/inscription.spec.ts`).
- Projets : Chromium mobile (Pixel 7) et WebKit mobile (iPhone 14, qui représente iOS Safari) ; Chromium bureau pour la vérification multi-support.
- Exécution contre la **pile complète en conteneurs** (front buildé + back + PostgreSQL/PostGIS + boîte e-mail de test, voir r0-socle-5) : les parcours R0 (inscription → lien de vérification → connexion) traversent le vrai back. Les liens d'e-mail sont récupérés via l'API de la boîte de test. **[devops / back]** Il faut une boîte de type Mailpit, avec API HTTP, dans l'environnement de CI.
- **GPS simulé** : `context.grantPermissions(['geolocation'])` et `context.setGeolocation({ latitude, longitude, accuracy })`. Le refus se simule par un contexte sans permission accordée (la demande est alors refusée). En R0, cela sert à la story r0-socle-17 ; en R1, aux distances et à la précision (RG-031, RG-032).
- **axe** : une vérification par écran, avec les tags WCAG 2.2 AA (ADR 0018). 0 violation exigée.
- Une vérification « aucune violation CSP dans la console » sur chaque parcours, ce qui protège l'ADR 0015.

**i18n**
- **Pas de framework i18n** (ni `@angular/localize` ni Transloco). Les textes sont écrits en français directement dans les templates, avec le tutoiement des règles de gestion.
- `LOCALE_ID` à `fr-FR` avec `registerLocaleData(localeFr)` pour les dates (« 18 novembre 2026 ») et les nombres (« 1,8 km »).
- Les messages d'erreur liés aux codes d'API sont regroupés **par fonctionnalité** dans un fichier `messages.ts` (une table code → texte). Ce n'est pas une préparation à l'i18n : c'est l'endroit unique où l'`amoa` relit les formulations.

## Alternatives écartées

- **Karma / Jasmine** : ce n'est plus le choix par défaut d'Angular 22.
- **Jest** : il n'est pas l'outil par défaut, ce qui contredirait le §8.
- **E2E sur des API simulées** (`page.route`) : cela ne prouverait pas les scénarios de recette R0, qui exigent le vrai back. Les API simulées restent réservées aux tests unitaires et d'intégration.
- **Préparer l'i18n dès maintenant** (`i18n` sur chaque texte) : c'est du bruit dans chaque template pour une traduction qui n'est pas prévue. Ajouter `@angular/localize` plus tard est un travail mécanique (balisage puis extraction). Pour une ouverture hors de France, il faudra de toute façon traduire aussi le catalogue et les textes légaux.

## Conséquences

- **Question au client** : une version anglaise est-elle prévue avant R4 (lancement public) ? Si oui, on balise les textes dès R1, c'est moins cher que de tout rebaliser après coup.
- Le pipeline front de la CI comprend : `npm ci` (avec génération du client), `lint`, `prettier --check`, `ng test --coverage`, `ng build`, puis les E2E sur la pile en conteneurs.
