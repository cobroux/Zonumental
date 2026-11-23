# ADR 0025 — Itinéraire à pied vers un monument, dans la carte

- **Statut :** proposé
- **Date :** 2026-11-23
- **Stories :** itineraire-1 à itineraire-4 (à créer par `product-owner`)
- **Complète :** ADR 0009 (journaux), ADR 0015 et 0023 (CSP, carte), ADR 0020 (position)

## Contexte

Depuis `/carte` (MapLibre, ADR 0023), l'utilisateur veut tracer un itinéraire **à pied** jusqu'à un monument, dans l'appli : tracé sur la carte, distance et durée, liste des étapes et, si possible, suivi de sa position. Un simple lien vers une app tierce ne suffit pas.

Contraintes :
- Le point de départ est la position GPS de l'utilisateur. RG-036 interdit de la stocker, de la journaliser ou de l'exporter.
- La CSP impose `connect-src 'self'` en production (ADR 0015 et 0023).
- Le volume attendu est faible : environ 120 monuments à Paris, quelques calculs par session active, et un recalcul seulement à la demande. On reste sous 10 000 calculs par jour à l'horizon visible.
- L'hébergement doit rester dans l'UE.

## Options comparées

| | A. Service public appelé par le front | B. Service public via un proxy backend | C. Valhalla auto-hébergé via un proxy backend |
|---|---|---|---|
| Moteur | FOSSGIS (OSRM/Valhalla `*.openstreetmap.de`), ORS (HeiGIT), GraphHopper | idem | Valhalla et un extrait OSM Île-de-France (Geofabrik) |
| CGU, limites | FOSSGIS : service de démonstration, environ 1 requête/s, pas de garantie, usage intensif ou commercial à proscrire. ORS : clé gratuite, environ 2 000 itinéraires/jour, CGU commerciales à vérifier. GraphHopper gratuit : usage non commercial seulement | idem, plus une clé cachée côté serveur | Aucune limite de tiers. Données sous ODbL : attribution « © OpenStreetMap contributors », déjà affichée (ADR 0023) |
| Coût | 0 € | 0 € | Un conteneur de 1 à 2 Go de RAM et environ 1 Go de disque pour les tuiles IDF : quelques €/mois chez l'hébergeur UE retenu |
| RGPD | La position part chez un tiers (Allemagne), avec l'IP et le Referer : il faut un sous-traitant ou un responsable distinct au registre et une information spécifique | Le tiers reçoit la position, mais ni l'IP ni l'identité | **Rien ne sort de notre infrastructure** |
| CSP | `connect-src` doit être ouvert au tiers | inchangée | inchangée |
| Disponibilité | soumise au tiers | soumise au tiers | la nôtre |

Le **routage dans le navigateur** est écarté. Il faudrait télécharger un graphe piéton de plusieurs dizaines de Mo, et aucune bibliothèque mûre n'existe. Les tuiles PMTiles d'affichage ne sont pas routables.

## Décision

**Option C, préparée par B.** Le front appelle uniquement notre backend. Le backend appelle l'API Valhalla (`/route`, `costing: pedestrian`, `language: fr-FR`) à une URL de configuration `ZONUMENTAL_ITINERAIRE_URL`.
- En **développement** : l'instance publique FOSSGIS Valhalla. Elle ne reçoit jamais de données d'utilisateurs réels.
- En **production** : un conteneur Valhalla interne, sans port exposé, construit à partir de l'extrait Île-de-France et rafraîchi chaque mois.

Passer de l'un à l'autre ne change qu'une URL, comme pour les tuiles (ADR 0023).

On choisit Valhalla plutôt qu'OSRM ou GraphHopper pour trois raisons : il fournit nativement les **consignes en français** (ce qui sert directement l'alternative texte), il gère un vrai profil piéton (escaliers, zones piétonnes) et il demande peu de RAM pour une région.

### Esquisse du contrat (à finaliser avec `tech-lead-front` dans `docs/api/itineraire.md`)

```
POST /api/itineraire            (authentifié, CSRF comme le reste de l'API)
{ "depart": { "lat": 48.8584, "lng": 2.2945 }, "monumentId": "…" }

200 { "distanceM": 1840, "dureeS": 1380,
      "trace": { "type": "LineString", "coordinates": [[lng, lat], …] },
      "etapes": [ { "instruction": "Tournez à gauche sur le quai Branly.", "distanceM": 220 } ] }
400 départ invalide ou hors zone · 404 monument inconnu · 429 limite · 503 moteur indisponible (problem+json, ADR 0009)
```

- On utilise **POST et non GET** : la position ne doit pas apparaître dans une URL. Les URL finissent dans les journaux d'accès, du proxy inverse et du navigateur.
- La **destination est résolue côté serveur** à partir de `monumentId`. Le proxy n'est donc pas un service de routage ouvert à tous.
- **Validation** : le départ doit être dans une boîte englobante Île-de-France et à moins de N km du monument (Q-40). Sinon, 400.
- **Minimisation** : le départ est arrondi à 4 décimales (environ 10 m) avant l'appel au moteur.
- **Aucun stockage ni journalisation** : rien en base, et aucun log du corps de la requête, ni de la réponse, ni de la requête au moteur, y compris en cas d'erreur (ADR 0009). Les journaux d'accès du conteneur Valhalla sont désactivés. Un test vérifie que les coordonnées n'apparaissent pas dans les journaux.
- **Limitation** : un quota par session, sur le mécanisme de r0-socle-9 (par exemple 30 calculs par heure).
- **Module** : `fr.zonumental.itineraire` (contrôleur, service, client Valhalla en `RestClient`). Pas de table, pas de migration.

### Front (`features/carte`)

- Bouton « Itinéraire à pied » sur l'épingle ou sur la carte du plus proche. La position vient du service existant (ADR 0020), jamais du stockage.
- **Le tracé est une couche MapLibre `line`** sur une source GeoJSON. C'est une exception assumée au calque Angular de l'ADR 0023 : une ligne n'a pas besoin de flou, et la couche suit le zoom sans recalcul. `FondCarte` reçoit deux méthodes de plus : `tracerItineraire(geojson)` et `effacerItineraire()`.
- **Accessibilité** : un résumé « 23 min, 1,8 km » dans une région `aria-live="polite"`, et la liste ordonnée `<ol>` des étapes, en texte, focusable et lisible sans la carte. Les couleurs viennent des tokens, avec un contraste de la ligne d'au moins 3:1. Avec `prefers-reduced-motion`, on utilise `fitBounds` sans animation.
- **Suivi** : le point de l'utilisateur est mis à jour par `watchPosition` (déjà en place, ADR 0020). Il n'y a **pas de recalcul automatique**. Un bouton « Recalculer » apparaît quand l'utilisateur s'écarte de plus de 50 m du tracé. Le guidage vocal virage par virage est hors périmètre.
- **Échec et hors-ligne** : si `navigator.onLine` est faux ou si l'API répond 503 ou ne répond pas, un message s'affiche avec un lien de repli « Ouvrir dans mon app de plans ». Ce lien ne contient que les coordonnées du monument, jamais la position de l'utilisateur. Rien n'est mis en cache.
- **RGPD** : avant le premier calcul, une mention courte explique que la position est utilisée pour calculer le trajet et n'est pas conservée. La base légale est l'exécution du service demandé, pas un consentement (à confirmer par `amoa`, Q-43). La politique de confidentialité est mise à jour.

## Alternatives écartées

- **A (front vers tiers)** : la position et l'IP partent chez un tiers, il faut ouvrir la CSP et, avec ORS, la clé est exposée. Les CGU des services gratuits excluent un usage de production.
- **B seul en production** : il dépend d'un service de démonstration sans garantie ni droit d'usage commercial. Il est gardé pour le développement uniquement.
- **OSRM auto-hébergé** : il est plus rapide, mais ses consignes doivent être générées côté client (`osrm-text-instructions`) et son profil piéton est moins riche. La vitesse n'apporte rien à notre volume.
- **Routage dans le navigateur** : voir plus haut.

## Conséquences

- Un service de plus à exploiter (`devops`) : image Valhalla, construction des tuiles IDF au déploiement, puis un rafraîchissement mensuel planifié et une sonde de santé.
- La CSP ne change pas, et aucune dépendance n'est ajoutée côté front.
- À mettre à jour à la mise en œuvre : `docs/architecture/backend.md` (module `itineraire`, variable `ZONUMENTAL_ITINERAIRE_URL`), `docs/architecture/frontend.md` (carte : couche itinéraire, panneau des étapes), la section Backend de `docs/ARCHITECTURE.md` et le registre RGPD (traitement « calcul d'itinéraire », sans conservation).

## Découpage proposé

| Story | Contenu | Points | Dépend de |
|---|---|---|---|
| itineraire-1 (back) | Contrat `docs/api/itineraire.md`, module `itineraire`, validation, arrondi, quota, absence de logs ; tests avec un faux Valhalla (WireMock) | 5 | — |
| itineraire-2 (devops) | Conteneur Valhalla et extrait IDF, réseau interne, rafraîchissement mensuel, santé | 3 | Q-42 |
| itineraire-3 (front) | Bouton, appel, couche `line`, résumé `aria-live`, liste des étapes, états d'échec et hors-ligne, mention RGPD | 5 | itineraire-1 (contrat) |
| itineraire-4 (front) | Point suivi en direct, détection d'écart, bouton « Recalculer » | 3 | itineraire-3, Q-41 |

Total : 16 points. Les stories 1 et 3 peuvent avancer en parallèle dès que le contrat est validé. La story 2 bloque seulement la mise en production.

## Questions client

- **Q-39** : l'itinéraire est-il réservé aux comptes connectés ? (proposition : oui)
- **Q-40** : faut-il une distance maximale entre l'utilisateur et le monument ? (proposition : 10 km, Paris et la petite couronne)
- **Q-41** : un suivi de position avec « Recalculer » à la demande suffit-il, ou faut-il un vrai guidage pas à pas ?
- **Q-42** : acceptez-vous le coût d'un conteneur Valhalla en production (quelques €/mois, 1 à 2 Go de RAM) plutôt que de dépendre d'un service public gratuit sans garantie ?
- **Q-43** : une information au moment du clic, plus la politique de confidentialité, suffit-elle, sans consentement explicite ? (à valider par `amoa` et le DPO)
- **Q-44** : le lien de repli vers une app de plans tierce est-il acceptable en cas d'échec ?
