# Valhalla piéton interne (itineraire-2)

Moteur de calcul d'itinéraire à pied (ADR 0025). Conteneur **interne** : la position de l'utilisateur ne sort pas de notre infrastructure (RG-036). **Non testé de bout en bout** : à valider par la première exécution.

## Démarrage local

```bash
cd deploy/valhalla
./prepare-donnees.sh        # ~450 Mo à télécharger, tuiles ~1-1,5 Go, 10-30 min, ~4 Go de RAM pendant la construction
docker compose -f compose.yaml -f compose.dev.yaml up -d   # publie 127.0.0.1:8002 (dev seulement)
```

Sans `compose.dev.yaml`, aucun port n'est publié : seul un conteneur du réseau `zonumental-interne` (le backend) peut joindre `http://valhalla:8002`.

## Vérification

```bash
curl -fsS http://127.0.0.1:8002/status
# Tour Eiffel -> Arc de Triomphe (monuments publics)
curl -sS http://127.0.0.1:8002/route -d '{"locations":[{"lat":48.8584,"lon":2.2945},{"lat":48.8738,"lon":2.2950}],"costing":"pedestrian","language":"fr-FR"}'
```

## Branchement backend

`ZONUMENTAL_ITINERAIRE_URL=http://127.0.0.1:8002` (backend sur l'hôte) ou `http://valhalla:8002` (backend dans le réseau `zonumental-interne`). Sans cette variable, le dev utilise l'instance publique FOSSGIS : jamais en production.

Sonde de santé : `GET /status` (déjà en `healthcheck` du compose) ; à brancher sur la supervision du déploiement quand il sera choisi.

## Rafraîchissement mensuel

`./rafraichir.sh` reconstruit dans un nouveau dossier (service intact), bascule `data/current` et recrée le conteneur (coupure de quelques secondes, instance unique). La version précédente est gardée pour retour arrière. Exemple cron :

```
0 3 2 * * cd /chemin/deploy/valhalla && ./rafraichir.sh >> /var/log/valhalla-refresh.log 2>&1
```

## Limites, coût, licence

- 2 Go de RAM max (`mem_limit`), 1 thread ; quelques €/mois attendus, **à confirmer (Q-42)**. Aucun hébergeur choisi, pas de déploiement en CI.
- Données © contributeurs OpenStreetMap, licence ODbL : l'attribution doit rester visible sur la carte.
- RG-036 : le script retire la section `logging` de la config Valhalla pour ne rien journaliser ; **à vérifier** sur `docker compose logs valhalla` après une requête (aucune coordonnée). Ne pas ajouter de proxy ni de journal d'accès devant le conteneur.
