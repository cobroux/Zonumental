# Architecture — Zonumental

Point d'entrée de l'architecture technique. Le produit est décrit dans `docs/fonctionnel/cahier-des-charges.md`.

| Document | Contenu |
| --- | --- |
| [`architecture/backend.md`](architecture/backend.md) | Spring Boot 4.1 / Java 25, monolithe modulaire (Spring Modulith), PostgreSQL 18 + PostGIS, modèle de données R0, plan technique des stories |
| [`architecture/frontend.md`](architecture/frontend.md) | Angular 22 PWA / Node 24, organisation par fonctionnalité, session, design system, routes R0, plan technique des stories |
| [`api/openapi.yaml`](api/openapi.yaml) | Contrat d'API OpenAPI 3.1 (source de vérité : modifié d'abord ici, puis vérifié contre springdoc) |
| [`adr/`](adr/) | Décisions : 0001-0009 backend, 0010-0019 frontend |

Principes communs : front et API sur la même origine (`/api` derrière le reverse proxy), session par cookie `httpOnly` + jeton d'accès en mémoire, erreurs au format RFC 9457 avec un `code` stable, aucune position GPS stockée.
