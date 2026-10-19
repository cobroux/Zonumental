# Story: Contrat OpenAPI et client Angular généré

**ID:** r0-socle-4
**Epic:** r0-socle
**Sprint:** 1
**Status:** todo
**Points:** 3

## Context

En tant qu'équipe, je veux un contrat d'API OpenAPI publié par le backend et un client Angular généré depuis ce contrat afin que le front et le back ne divergent pas.

## Acceptance Criteria

- [ ] Given le backend lancé, Then le contrat OpenAPI est publié (springdoc) et versionné dans `docs/api/`
- [ ] Given le contrat modifié, When la génération est lancée, Then le client Angular est régénéré sans édition manuelle
- [ ] Given un contrat et un client désynchronisés, When la CI tourne, Then elle échoue
- [ ] Given l'endpoint de santé, Then il apparaît dans le contrat et le front l'appelle via le client généré

## Technical Notes

Dépend de r0-socle-1 et r0-socle-2. Cahier §4. Le contrat commun est écrit par les deux tech leads.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
