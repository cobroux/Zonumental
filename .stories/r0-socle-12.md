# Story: Pages légales publiques (CGU, confidentialité, mentions)

**ID:** r0-socle-12
**Epic:** r0-socle
**Sprint:** 1
**Status:** in-progress
**Points:** 2

## Context

En tant que visiteur, je veux lire les CGU, la politique de confidentialité et les mentions légales sans compte afin de savoir à quoi je m'engage avant de m'inscrire.

## Acceptance Criteria

- [ ] Given un visiteur non connecté, When il ouvre chacune des 3 pages, Then elles s'affichent sans connexion (RG-001)
- [ ] Given le formulaire d'inscription, Then les cases CGU et confidentialité renvoient vers ces pages (RG-003)
- [ ] Given chaque texte, Then sa version est identifiable et réutilisée pour dater les consentements (RG-003)
- [ ] Given un lecteur d'écran, Then les pages sont structurées (titres, navigation clavier)

## Technical Notes

Dépend de r0-socle-2, r0-socle-3. Les textes sont des livrables amoa (docs/rgpd/) : un texte provisoire marqué comme tel suffit pour livrer la story ; le contenu définitif est requis avant la mise en ligne publique.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
