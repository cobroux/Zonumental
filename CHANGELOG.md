# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### Ajouté
- r0-socle-1 : backend Spring Boot 4.1 / Java 25 en monolithe modulaire (`compte`, `catalogue`, `capture`, `progression`, `commun`), PostgreSQL/PostGIS avec Flyway, `GET /api/health` public, reste de l'API sous authentification (401), garde-fous Spotless, Checkstyle (refuse les packages par couche technique) et JaCoCo à 80 %.
- r0-socle-2 : frontend Angular 22 PWA zoneless, TypeScript 6.0, Vitest, ESLint avec frontières entre features, Prettier, service worker qui ne met pas `/api` en cache.
- r0-socle-3 : design system « Carnet d'explorateur » aligné sur les maquettes v4-v6 (tokens, polices auto-hébergées Gloock/Geist, bouton, champ, cases, pastilles de rareté, messages), page `/design-system` en dev, couverture front à 80 %.
- r0-socle-18 : import du catalogue en deux temps (fichier de relecture, puis figer en une transaction) : monuments historiques avec article fr.wikipedia, popularité Pageviews, quotas par ville, rareté, images copiées chez nous (jamais servies depuis Wikimedia).
- r0-socle-4 : contrat OpenAPI publié par springdoc (désactivé en prod) et comparé à `docs/api/openapi.yaml` par un test back ; client Angular généré par ng-openapi-gen (non versionné, régénéré par les scripts npm) ; la page `/design-system` affiche la santé du back via ce client.
- r0-socle-12 : pages légales publiques provisoires (`/cgu`, `/confidentialite`, `/mentions-legales`), version de chaque texte dans `core/legal/versions-legales.ts` pour dater les consentements.
- r0-socle-6 : inscription (`/inscription`, maquette O6) : âge minimum 15 ans, consentements datés et versionnés, mot de passe Argon2id, réponse identique si l'e-mail existe déjà, e-mail de vérification envoyé après enregistrement.
- r0-socle-7 : vérification de l'e-mail par lien à usage unique (24 h) et renvoi limité à un par minute, sans révéler si l'adresse existe ; page `/verifier-email`.
- r0-socle-8 : connexion (`/connexion`), jeton d'accès JWT de 15 min gardé en mémoire, session de renouvellement de 30 jours glissants en cookie HttpOnly, déconnexion, `GET /api/compte/moi` avec `emailVerifie`, contrôle d'origine par CORS.
- r0-socle-9 : blocage de 15 min après 5 échecs de connexion sur une même adresse (429 avec `Retry-After`, même réponse pour une adresse inconnue), purge nocturne des tentatives et des sessions expirées.

### Modifié
- CI passée en Java 25, Node lu via `.nvmrc`.
