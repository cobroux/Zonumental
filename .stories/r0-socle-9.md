# Story: Limitation des tentatives de connexion

**ID:** r0-socle-9
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 2

## Context

En tant qu'explorateur, je veux que mon compte soit protégé contre les essais répétés afin qu'un tiers ne devine pas mon mot de passe.

## Acceptance Criteria

- [ ] Given 5 échecs consécutifs, When 6e essai avec le bon mot de passe, Then refusé jusqu'à la fin du blocage de 15 min ; après 15 min, accepté (R0-12, RG-009)
- [ ] Given un succès avant le 5e échec, Then le compteur repart à zéro (RG-009)
- [ ] Given une adresse inexistante, Then le même blocage et le même message s'appliquent (RG-009, RG-008)

## Technical Notes

Dépend de r0-socle-8.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
