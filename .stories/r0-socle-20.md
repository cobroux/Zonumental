# Story: Sources, licences et stats des fiches du catalogue

**ID:** r0-socle-20
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 3

## Context

En tant qu'équipe, je veux stocker source et licence de chaque texte et image et les stats d'un monument afin de respecter les licences et de ne jamais inventer de données.

## Acceptance Criteria

- [ ] Given un monument avec texte et image, Then la source et la licence du texte (ex. Wikipédia CC BY-SA) et de l'image (ex. Commons, licence, auteur) sont stockées et exposées par l'API (R0-25, RG-022)
- [ ] Given une image sans licence identifiable, Then elle n'est pas importée et la silhouette est indiquée à la place (R0-25, RG-022)
- [ ] Given une licence exigeant l'attribution, Then l'auteur est stocké (RG-022)
- [ ] Given un monument, Then numéro, nom, type, ville, année, style, hauteur, texte histoire et image de référence sont stockés ; une stat inconnue est exposée comme absente et affichée « — » sans valeur inventée (R0-26, RG-023)

## Technical Notes

Dépend de r0-socle-18. Pas d'écran de fiche en R0 (R1) : critères vérifiés via l'API/les données.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
