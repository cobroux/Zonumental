# Plan technique — itineraire-4 (#161) : suivi de position et « Recalculer »

Contexte : ADR 0025 (Q-41 : pas de recalcul automatique), ADR 0020 (`watchPosition`, bouton seulement), RG-036.

## Fichiers (tout dans `features/carte/`, aucun service ni dépendance nouveaux)
| Fichier | Changement |
| --- | --- |
| `itineraire.ts` | `ecartMetres(coords, trace)` (projection locale plane, point-segment, aucun réseau) ; `ecarte(deja, distance)` (hystérésis 50 m / 40 m). |
| `carte.ts` | Signal `ecart` + `effect` : évalué seulement tant que `calcul.etat()` est `ok` (repasse à `false` à `effacer()`, changement de monument, recalcul, destruction) ; lectures de précision > 50 m ignorées. `recalculer()` relance `demarrerCalcul` (compteur anti-périmé et erreurs/429 existants). Bloc `.ecart` `role="status"` + bouton « Recalculer ». |
| `carte.css` | style `.ecart`. |
| `e2e/itineraire.spec.ts` | écart avec position simulée + capture. |

## Position
Le service `core/position` suit déjà (`watchPosition`, `activer()` au clic) et `Carte` affiche déjà le point. Le « suivi » d'itineraire-4 = évaluation de l'écart sur ce signal ; elle s'arrête avec l'itinéraire. Pas d'arrêt du watcher partagé (la liste de proximité en dépend ; il est déjà libéré à la destruction du service et page cachée).

## Tests
- `itineraire.spec.ts` : `ecartMetres` (sur le tracé, point-segment, au-delà d'une extrémité, trace vide) ; `ecarte` (hystérésis).
- `carte.spec.ts` : sur le tracé = rien ; > 50 m = annonce + bouton, sans requête ; lecture imprécise ignorée ; « Recalculer » poste la position courante puis disparaît ; « Effacer » et changement de monument arrêtent le suivi.
- e2e : écart avec position simulée, axe sans violation.
