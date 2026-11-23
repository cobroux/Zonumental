# Contrat API — Itinéraire à pied

> **Contrat validé** par `tech-lead-front` (2026-11-24) pour itineraire-3, sans changement. Usage front : `docs/design/plans/itineraire-3.md`.

- **Statut :** implémenté par itineraire-1 (`openapi.yaml`, tag `itineraire`) ; validé par `tech-lead-front`.
- **Décisions :** ADR 0025. **Story :** #158 (itineraire-1).
- Conventions : Bearer obligatoire (401 `non-authentifie`), erreurs RFC 9457 (`Probleme`, `code` stable), pas de CSRF (jeton en en-tête, ADR 0004). Défauts appliqués tant que Q-39 à Q-44 ne sont pas tranchées : réservé aux comptes connectés (Q-39), 10 km maximum (Q-40).

## `POST /api/itineraire` — operationId `calculerItineraire`

POST et non GET : la position ne doit apparaître dans aucune URL (journaux d'accès, proxy, navigateur).

Requête :

```json
{ "depart": { "latitude": 48.8561, "longitude": 2.2988 }, "numero": 9 }
```

| Champ | Règle |
| --- | --- |
| `depart.latitude`, `depart.longitude` | Obligatoires, WGS84, degrés décimaux. Le serveur les arrondit à 4 décimales (~10 m) avant de les utiliser. |
| `numero` | Numéro du monument du catalogue (comme `/api/catalogue/monuments/{numero}`). La destination vient du catalogue, jamais du client. L'ADR parle de `monumentId` : le contrat reprend `numero`, identifiant déjà utilisé partout. |

Réponse 200 :

```json
{
  "distanceMetres": 1840,
  "dureeSecondes": 1380,
  "trace": { "type": "LineString", "coordinates": [[2.2988, 48.8561], [2.2960, 48.8570], [2.2945, 48.8584]] },
  "etapes": [
    { "instruction": "Marchez vers le nord-ouest.", "distanceMetres": 220 },
    { "instruction": "Vous êtes arrivé.", "distanceMetres": 0 }
  ]
}
```

- `trace` est un objet GeoJSON `LineString`, `coordinates` en `[longitude, latitude]` : directement utilisable comme `data` d'une source GeoJSON MapLibre (`type: 'Feature', geometry: trace`) pour une couche `line`. Premier point = départ arrondi, dernier = monument.
- `etapes` : instructions en français (alternative texte de la carte, liste `<ol>`), dans l'ordre ; la dernière (« Vous êtes arrivé ») a une distance 0. Jamais vide.
- `distanceMetres` et `dureeSecondes` : entiers, le front formate (« 23 min, 1,8 km »).
- Aucune position de l'utilisateur n'est renvoyée en dehors du `trace` (départ arrondi).

| Statut | `code` | Cas |
| --- | --- | --- |
| 400 | `validation` | Corps illisible ou champ manquant (`erreurs[]` par champ) ; ou départ hors Île-de-France, ou à plus de `zonumental.itineraire.distance-max-km` (10) du monument : `erreurs: [{champ: "depart", code: "format"}]`. Les valeurs fournies ne sont jamais recopiées. |
| 401 | `non-authentifie` | Jeton absent ou expiré. |
| 404 | `introuvable` | Monument absent du catalogue. |
| 429 | `limite-frequence` | Quota par compte atteint (30 calculs par heure glissante, `Retry-After` en secondes). Les 400 et 404 ne consomment pas de quota ; les échecs du moteur, si. |
| 502 | `indisponible` | Le moteur a refusé la demande (ex. aucun chemin) ou sa réponse est illisible. `Retry-After`. |
| 503 | `indisponible` | Moteur injoignable, trop lent ou en erreur serveur. `Retry-After`. |

Pour le front, 502 et 503 se traitent pareil : message d'échec et lien de repli (Q-44). Aucun détail du moteur n'est exposé (`detail` absent).

## Configuration

| Propriété | Variable | Défaut |
| --- | --- | --- |
| `zonumental.itineraire.url` | `ZONUMENTAL_ITINERAIRE_URL` | `https://valhalla1.openstreetmap.de` (DÉVELOPPEMENT seulement : jamais d'utilisateurs réels) |
| `zonumental.itineraire.distance-max-km` | | `10` (Q-40) |
| `zonumental.itineraire.quota-max` / `quota-fenetre` | | `30` / `1h` |
| `zonumental.itineraire.connexion-timeout` / `lecture-timeout` | | `2s` / `5s` |

Appel amont : `POST {url}/route`, `costing: pedestrian`, `language: fr-FR`, corps JSON (la position n'est pas dans l'URL).

## RG-036

Aucune table, aucune migration. Aucune position dans les journaux, les messages d'erreur ni les URL, y compris quand le moteur échoue (test dédié). Le quota est tenu en mémoire par compte (instance unique ; perdu au redémarrage).
