# Story: Design system dans le code à partir des tokens validés

**ID:** r0-socle-3
**Epic:** r0-socle
**Sprint:** 1
**Status:** in-progress
**Points:** 3

## Context

En tant qu'équipe, je veux le design system « Carnet d'explorateur » codé (tokens, typographies, composants de base) afin que tous les écrans respectent l'identité visuelle validée (cahier §10, §12).

## Acceptance Criteria

- [ ] Given la palette validée, Then les tokens papier #F4F1EA, encre #1A1C20, marine #1F3A5F, bordeaux #8C2F39, sapin #2F5D4A et ocre #B07A2A sont définis une seule fois et utilisés par les composants
- [ ] Given les typographies, Then Gloock (titres), Geist (interface) et Geist Mono (numéros, dates) sont chargées et appliquées
- [ ] Given une page de démonstration des composants (bouton, champ, message d'erreur, lien, navigation), Then chaque composant respecte les contrastes WCAG AA et a un état focus visible
- [ ] Given les interdits du cahier §10, Then aucun style Material tel quel, dégradé violet ni emoji à la place d'icône n'est présent
- [ ] Given un état d'information (erreur, succès), Then il n'est jamais porté par la couleur seule (texte ou icône associé)

## Technical Notes

Dépend de r0-socle-2. Hors périmètre : tampons, silhouettes, barre de navigation à 5 onglets (R1).

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
