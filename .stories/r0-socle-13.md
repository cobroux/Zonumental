# Story: Export des données personnelles

**ID:** r0-socle-13
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 3

## Context

En tant qu'explorateur, je veux télécharger mes données afin d'exercer mon droit de portabilité.

## Acceptance Criteria

- [ ] Given Marco connecté, When « Exporter », Then un fichier JSON (compte, consentements datés, captures) est téléchargeable (R0-17, RG-013)
- [ ] Given un compte sans capture, Then l'export est valide sans photo (RG-013)
- [ ] Given le fichier, Then il ne contient ni mot de passe ni position GPS (R0-17, RG-006, RG-036)
- [ ] Given le format d'archive, Then les photos seront incluses dans un zip aux côtés du JSON dès que des captures existeront (structure prévue, non testable en R0)

## Technical Notes

Dépend de r0-socle-8, r0-socle-11. L'export des 2 tampons de R0-17 se vérifie complètement en R1.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
