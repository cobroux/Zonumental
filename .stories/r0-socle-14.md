# Story: Suppression du compte avec délai de 30 jours et annulation

**ID:** r0-socle-14
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 5

## Context

En tant qu'explorateur, je veux supprimer mon compte afin que toutes mes données soient effacées définitivement.

## Acceptance Criteria

- [ ] Given Marco confirme explicitement dans le profil, When suppression, Then le compte est désactivé immédiatement et la connexion est refusée (R0-18, RG-014, RG-008)
- [ ] Given une demande de suppression, Then un e-mail de confirmation est envoyé
- [ ] Given une reconnexion avec les bons identifiants pendant les 30 jours, Then la suppression peut être annulée (Q-9, RG-014)
- [ ] Given 30 jours écoulés, When la tâche de purge tourne, Then compte, consentements et données liées (captures et photos quand elles existent) sont effacés définitivement (R0-18, RG-014)
- [ ] Given la purge, Then pseudo et e-mail redeviennent disponibles (Q-9, RG-005)
- [ ] Given une purge en échec partiel, Then elle est rejouable sans doublon ni perte

## Technical Notes

Dépend de r0-socle-8. La purge doit être conçue pour qu'un module futur (captures, photos) s'y raccroche par événement interne (cahier §4).

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
