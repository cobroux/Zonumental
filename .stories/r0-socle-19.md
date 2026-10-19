# Story: Numéros fixes jamais réutilisés et rareté calculée à l'import

**ID:** r0-socle-19
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 3

## Context

En tant qu'équipe, je veux que chaque monument ait un numéro définitif et une rareté calculée afin que le futur carnet soit stable et que la rareté soit disponible dès R1.

## Acceptance Criteria

- [ ] Given le premier import, Then les numéros sont attribués par popularité décroissante (n° 1 = le plus populaire) (Q-18, RG-019)
- [ ] Given 118 monuments numérotés de 1 à 118, When un monument est ajouté, Then il reçoit le n° 119 ; les anciens numéros ne changent pas (RG-019, R0-22)
- [ ] Given le monument n° 5 retiré des sources, When import, Then un nouveau monument ne reçoit pas le n° 5 (R0-23, RG-019)
- [ ] Given 120 monuments, Then 6 Légendaires, 24 Rares et 90 Communs sont stockés avec arrondi à l'entier le plus proche (R0-24, RG-020)
- [ ] Given un import ultérieur, Then seuls les nouveaux monuments reçoivent une rareté, les existants gardent la leur (Q-8, RG-020)

## Technical Notes

Dépend de r0-socle-18.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
