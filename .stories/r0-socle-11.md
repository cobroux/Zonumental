# Story: Profil : modifier ses consentements facultatifs

**ID:** r0-socle-11
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 2

## Context

En tant qu'explorateur, je veux activer ou retirer mes consentements facultatifs depuis mon profil afin de garder la maîtrise de mes données.

## Acceptance Criteria

- [ ] Given classement décoché, When Marco active puis désactive « e-mails », Then le changement est enregistré immédiatement avec sa date (R0-16, RG-003, RG-012)
- [ ] Given « e-mails » désactivé, Then plus aucun e-mail non indispensable n'est envoyé (RG-012)
- [ ] Given le profil, Then les liens légaux et l'accès à « Mes données » (export, suppression) sont visibles (cahier §12)

## Technical Notes

Dépend de r0-socle-8, r0-socle-12. Hors périmètre : changement de pseudo, de mot de passe connecté, d'e-mail (Q-14).

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
