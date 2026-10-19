# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### Ajouté
- r0-socle-1 : backend Spring Boot 4.1 / Java 25 en monolithe modulaire (`compte`, `catalogue`, `capture`, `progression`, `commun`), PostgreSQL/PostGIS avec Flyway, `GET /api/health` public, reste de l'API sous authentification (401), garde-fous Spotless, Checkstyle (refuse les packages par couche technique) et JaCoCo à 80 %.
- r0-socle-2 : frontend Angular 22 PWA zoneless, TypeScript 6.0, Vitest, ESLint avec frontières entre features, Prettier, service worker qui ne met pas `/api` en cache.

### Modifié
- CI passée en Java 25, Node lu via `.nvmrc`.
