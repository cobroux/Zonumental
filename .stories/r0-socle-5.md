# Story: Déploiement conteneurisé d'un environnement

**ID:** r0-socle-5
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 5

## Context

En tant qu'équipe, je veux déployer backend, frontend et base de données dans un environnement conteneurisé en ligne afin que R0 soit testable par le client (résultat R0 : « une app en ligne »).

## Acceptance Criteria

- [ ] Given un merge sur `main`, When le pipeline de déploiement tourne, Then backend, frontend et PostgreSQL/PostGIS démarrent dans l'environnement en HTTPS
- [ ] Given l'environnement, Then les secrets sont fournis uniquement par variables d'environnement et `.env.example` seul est versionné
- [ ] Given une requête depuis un autre site, Then le CORS la refuse ; Then les en-têtes de sécurité (CSP...) sont présents
- [ ] Given l'environnement, Then le stockage objet S3 compatible et les hébergeurs sont dans l'UE (cahier §7)
- [ ] Given l'environnement, Then les e-mails transactionnels partent vers une boîte de test consultable
- [ ] Given gitleaks et Dependabot, Then ils sont actifs dans la CI

## Technical Notes

Dépend de r0-socle-1, r0-socle-2. Décision ouverte avant démarrage : hébergeur et budget (cahier §11), à lever par le client. Le stockage objet est provisionné mais non utilisé en R0.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
