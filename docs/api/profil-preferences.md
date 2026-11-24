# Contrat API — Préférences du compte (« Mode facile »)

- **Statut :** proposé par `tech-lead-back` pour reglages-1, à valider par `tech-lead-front`. Plan : `docs/design/plans/reglages-1.md`.
- **Besoin :** l'itinéraire piéton (ADR 0025, itineraire-1/3/4) n'est proposé sur la carte que si l'explorateur active « Mode facile » dans Profil > Préférences. Préférence stockée sur le compte (suit l'utilisateur d'un appareil à l'autre).
- Conventions : Bearer obligatoire (401 `non-authentifie`), erreurs RFC 9457 (`Probleme`), pas de CSRF (ADR 0004). Même forme que `/api/compte/consentements` (PUT de l'état complet, réponse = nouvel état).

## Lecture — `GET /api/compte/moi` (operationId `monCompte`, existant)

Le profil gagne un champ, pas de nouveau GET :

```json
{ "id": "…", "pseudo": "lea", "email": "lea@example.fr", "emailVerifie": true, "modeFacile": false }
```

`modeFacile` : booléen, toujours présent, `false` par défaut (comptes existants et nouveaux).

## Modification — `PUT /api/compte/preferences` (operationId `modifierPreferences`)

Requête et réponse 200 (schéma `Preferences`) :

```json
{ "modeFacile": true }
```

| Code | Cas |
| --- | --- |
| 200 | Nouvel état. Idempotent. |
| 400 `validation` | Corps absent, `modeFacile` absent, `null` ou non booléen (pas de coercition `"true"` → `true`). |
| 401 `non-authentifie` | Pas de jeton, ou compte introuvable / suppression demandée (comme `monCompte`). |

PUT de l'objet complet : un futur réglage ajoutera un champ obligatoire au schéma (changement coordonné front/back), pas un nouvel endpoint. Pas de GET dédié (YAGNI : `monCompte` suffit).

## RGPD

- **Export** (`GET /api/compte/export`) : `donnees.json` → `compte.modeFacile` (booléen).
- **Effacement** : colonne de `compte.utilisateur`, supprimée avec la ligne par `PurgeComptes`. Rien à ajouter.

## Itinéraire

`POST /api/itineraire` inchangé : pas de contrôle serveur du mode facile (préférence d'affichage, pas une autorisation). Voir le plan, §Décisions.
