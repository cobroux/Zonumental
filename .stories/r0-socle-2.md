# Story: Projet frontend Angular PWA par fonctionnalité avec garde-fous qualité

**ID:** r0-socle-2
**Epic:** r0-socle
**Sprint:** 1
**Status:** todo
**Points:** 3

## Context

En tant qu'équipe, je veux un projet frontend Angular installable (PWA) rangé par fonctionnalité avec ESLint et Prettier afin que l'interface soit développée sur une base homogène et vérifiée.

## Acceptance Criteria

- [ ] Given le dépôt cloné, When `npm run lint`, `prettier --check`, les tests et le build sont lancés, Then tout passe en CI
- [ ] Given l'arborescence, Then le code est sous `src/app/features/<feature>` et `shared/` sans dossier global par couche
- [ ] Given l'application servie en HTTPS, Then elle est installable (manifeste, service worker) sur mobile
- [ ] Given un fichier mal formaté indexé, When le hook pre-commit tourne, Then lint et Prettier bloquent le commit

## Technical Notes

Cahier §4, §8, §9. Versions et ADR : tech-lead-front. Mobile-first.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
