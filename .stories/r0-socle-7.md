# Story: Vérification de l'e-mail par lien et renvoi

**ID:** r0-socle-7
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 3

## Context

En tant qu'explorateur, je veux confirmer mon adresse e-mail par un lien afin de prouver qu'elle m'appartient et débloquer la capture dès R1.

## Acceptance Criteria

- [ ] Given un lien reçu depuis moins de 24 h, When clic, Then « E-mail confirmé » ; When second clic, Then « lien déjà utilisé » (R0-08, RG-007)
- [ ] Given un lien de plus de 24 h, When clic, Then message d'expiration et bouton de renvoi (R0-09, RG-007)
- [ ] Given un renvoi demandé, Then un nouveau lien est envoyé et l'ancien ne fonctionne plus (R0-09, RG-007)
- [ ] Given le lien ouvert sur un autre appareil, Then la vérification aboutit (RG-007)
- [ ] Given un compte non vérifié, Then l'état « vérifié / non vérifié » est exposé par l'API afin que R1 refuse la capture (RG-007, RG-029)

## Technical Notes

Dépend de r0-socle-6. La capture elle-même est en R1 : ici seul l'état est exposé.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
