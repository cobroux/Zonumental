# Story: Onboarding : explication de la localisation avant la demande système

**ID:** r0-socle-17
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 2

## Context

En tant qu'explorateur, je veux comprendre pourquoi l'appli veut ma position avant que le navigateur ne me la demande afin de décider en confiance.

## Acceptance Criteria

- [ ] Given la fin de la création du carnet, Then un écran explicatif présente 3 engagements RGPD (position jamais stockée, seule la distance conservée, usage limité à la vérification) avant toute demande système (RG-036)
- [ ] Given l'écran explicatif, When l'explorateur continue, Then la demande système de localisation s'affiche
- [ ] Given un refus système ou « plus tard », Then l'explorateur poursuit sans blocage et un message explique comment l'activer plus tard (RG-027)

## Technical Notes

Dépend de r0-socle-16. Aucune lecture ni envoi de position en R0 : seule l'autorisation est demandée. Textes des engagements validés par amoa.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
