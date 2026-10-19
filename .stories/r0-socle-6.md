# Story: Inscription avec âge minimum et consentements datés

**ID:** r0-socle-6
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 5

## Context

En tant que visiteur, je veux créer mon compte (pseudo, e-mail, mot de passe, date de naissance, consentements) afin d'utiliser l'application.

## Acceptance Criteria

- [ ] Given un visiteur de 20 ans avec données valides et CGU cochées, When il valide, Then le compte est créé, un e-mail de vérification est envoyé et aucun consentement facultatif n'est coché (R0-01, RG-001, RG-003)
- [ ] Given une naissance donnant exactement 15 ans aujourd'hui, Then l'inscription est acceptée ; Given 15 ans demain, Then elle est refusée sans création de compte (R0-02, RG-002)
- [ ] Given une naissance donnant 14 ans ou une date future/invalide, Then message d'âge minimum et aucune donnée ni e-mail conservés (R0-03, RG-002)
- [ ] Given les CGU ou la politique de confidentialité non cochées, Then l'inscription est impossible (R0-04, RG-003)
- [ ] Given un mot de passe de 11 caractères, Then il est refusé avec la règle expliquée ; 12 caractères avec accents/espaces acceptés (R0-05, RG-006)
- [ ] Given le pseudo « Marco » existant, When un autre saisit « marco », Then refusé avec invitation à en choisir un autre ; pseudo de 3 à 20 caractères (lettres, chiffres, tiret, souligné) (R0-06, RG-005)
- [ ] Given une adresse e-mail déjà utilisée (casse et espaces ignorés), Then message générique sans révéler l'existence du compte (R0-07, RG-004)
- [ ] Given l'acceptation, Then chaque consentement est stocké avec sa date et la version du texte (RG-003) et le mot de passe est stocké uniquement haché avec Argon2id (RG-006)

## Technical Notes

Dépend de r0-socle-1, r0-socle-2, r0-socle-3, r0-socle-4. Les 3 consentements : CGU/confidentialité (obligatoire), classement et e-mails (facultatifs, décochés). Envoi de l'e-mail traité par r0-socle-7. L'écran s'insère dans l'onboarding r0-socle-16.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
