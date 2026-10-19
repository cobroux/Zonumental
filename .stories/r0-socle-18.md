# Story: Import du catalogue Wikidata + Mérimée avec quotas paramétrables

**ID:** r0-socle-18
**Epic:** r0-socle
**Sprint:** 1
**Status:** in-progress
**Points:** 5

## Context

En tant qu'équipe, je veux importer les monuments les plus populaires des 10 plus grandes villes selon `catalogue-quotas.yml` afin de disposer du catalogue de départ sans interface d'administration.

## Acceptance Criteria

- [ ] Given `catalogue-quotas.yml` listant 10 villes (10 plus grandes de France, 10 monuments par ville, Paris 25, proposition amoa Q-16), When l'import tourne, Then au plus le quota par ville est importé, les plus populaires (vues Wikipédia via Wikidata) d'abord (R0-20, RG-016, RG-017)
- [ ] Given une égalité de popularité au dernier rang, Then le départage alphabétique est reproductible (RG-017)
- [ ] Given une ville avec moins de monuments éligibles que son quota, Then ceux qui existent sont importés (RG-016)
- [ ] Given un import relancé sans changement, Then aucun doublon, numéros et rayons inchangés ; un monument est identifié par ses identifiants Wikidata/Mérimée (R0-21, RG-018)
- [ ] Given Lyon passée de 10 à 12, When import, Then au plus 2 nouveaux monuments sont ajoutés (R0-22, RG-016)
- [ ] Given un monument déjà présent qui sort du quota ou des sources, Then il n'est jamais supprimé (RG-018, Q-7)
- [ ] Given chaque monument, Then un rayon de capture de 150 m par défaut est stocké, ajustable (min 50 m, max 500 m) et conservé aux imports suivants (RG-021, Q-15)

## Technical Notes

Dépend de r0-socle-1. Les sources externes sont appelées par la tâche d'import uniquement. Numérotation et rareté : r0-socle-19 ; sources/licences : r0-socle-20.

## Definition of Done

- [ ] Tests written first cover the acceptance criteria
- [ ] Code review and verification loop passed
- [ ] Code merged to main
