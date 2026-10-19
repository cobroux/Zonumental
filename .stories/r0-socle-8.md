# Story: Connexion, déconnexion et session

**ID:** r0-socle-8
**Epic:** r0-socle
**Sprint:** unassigned
**Status:** todo
**Points:** 5

## Context

En tant qu'explorateur, je veux me connecter, rester connecté et me déconnecter afin d'accéder à l'application sans ressaisir mon mot de passe.

## Acceptance Criteria

- [ ] Given un compte, When e-mail et mot de passe corrects, Then accès à l'appli et session conservée à la réouverture (R0-10, RG-008, RG-010)
- [ ] Given un mauvais mot de passe ou un e-mail inconnu, Then le même message « E-mail ou mot de passe incorrect » (R0-11, RG-008)
- [ ] Given un visiteur non connecté ouvrant un lien vers une page protégée, Then renvoi à la connexion puis à la page demandée ; seuls Bienvenue et pages légales restent publics (R0-15, RG-001)
- [ ] Given une session inactive depuis plus de 30 jours, Then reconnexion exigée ; Given un retour après 5 jours, Then toujours connecté (RG-010)
- [ ] Given une déconnexion volontaire, Then la session est fermée et le jeton de renouvellement invalidé (RG-010)
- [ ] Given un jeton d'accès de 15 min et un jeton de renouvellement en cookie httpOnly/Secure/SameSite, Then le renouvellement est silencieux (cahier §4)

## Technical Notes

Dépend de r0-socle-6. Compte en cours de suppression : traité par r0-socle-14. Page protégée de démonstration suffisante en R0 (profil).

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
