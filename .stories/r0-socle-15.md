# Story: Avertissement et suppression des comptes inactifs

**ID:** r0-socle-15
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 3

## Context

En tant qu'explorateur, je veux être prévenu avant la suppression d'un compte inactif afin de ne pas perdre mon carnet par oubli.

## Acceptance Criteria

- [ ] Given aucune connexion depuis 3 ans, When la tâche planifiée tourne, Then un e-mail d'avertissement est envoyé (R0-19, RG-015)
- [ ] Given aucun retour sous 30 jours après l'avertissement, Then la suppression de r0-socle-14 est déclenchée (R0-19, RG-015)
- [ ] Given une reconnexion pendant ces 30 jours, Then la suppression est abandonnée (RG-015)
- [ ] Given un e-mail non vérifié, Then la suppression peut se faire sans avertissement (RG-015)

## Technical Notes

Dépend de r0-socle-14. Durées paramétrables pour permettre le test.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
