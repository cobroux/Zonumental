# Story: Projet backend Spring Boot par fonctionnalité avec garde-fous qualité

**ID:** r0-socle-1
**Epic:** r0-socle
**Sprint:** 1
**Status:** done
**Points:** 3

## Context

En tant qu'équipe, je veux un projet backend Spring Boot rangé par fonctionnalité (modules compte, catalogue, capture, progression) avec ses garde-fous qualité afin que chaque story suivante démarre sur une base vérifiée par la CI.

## Acceptance Criteria

- [ ] Given le dépôt cloné, When `mvnw verify` est lancé, Then le build passe avec Spotless, Checkstyle et JaCoCo actifs et un rapport de couverture produit
- [ ] Given un module qui lit les tables d'un autre module, When la vérification d'architecture (Spring Modulith, cahier §4) tourne, Then le build échoue
- [ ] Given un fichier mal formaté indexé, When le hook pre-commit tourne, Then `spotless:check checkstyle:check` bloque le commit
- [ ] Given l'arborescence, Then le code est sous `fr.zonumental.<module>` sans dossier global `controllers/` ni `services/`
- [ ] Given l'application démarrée, Then un endpoint de santé répond sans authentification

## Technical Notes

Cahier §4, §8, §9. Versions et ADR : tech-lead-back. Aucune règle métier ici.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
