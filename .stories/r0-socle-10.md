# Story: Mot de passe oublié et réinitialisation

**ID:** r0-socle-10
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 3

## Context

En tant qu'explorateur, je veux réinitialiser mon mot de passe par e-mail afin de retrouver l'accès à mon compte.

## Acceptance Criteria

- [ ] Given une adresse connue ou inconnue, When demande, Then message identique ; adresse connue : lien reçu valable 1 h, usage unique (R0-13, RG-011)
- [ ] Given plusieurs demandes successives, Then seul le dernier lien est valide (RG-011)
- [ ] Given un lien valide et un nouveau mot de passe de moins de 12 caractères, Then refusé ; 12 caractères ou plus, Then accepté (R0-14, RG-006)
- [ ] Given une réinitialisation réussie, Then toutes les sessions existantes sont fermées (R0-14, RG-010)

## Technical Notes

Dépend de r0-socle-8.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
