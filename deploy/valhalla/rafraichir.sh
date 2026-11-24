#!/usr/bin/env bash
# Rafraichissement mensuel : reconstruit dans un nouveau dossier (service intact pendant 10-30 min),
# bascule le lien data/current, puis recree le conteneur (coupure de quelques secondes ; pas de vraie
# bascule sans coupure avec une seule instance). Retour arriere : relier data/current a l'ancien dossier.
set -euo pipefail
cd "$(dirname "$0")"
avant=$(readlink data/current 2>/dev/null || true)
./prepare-donnees.sh
[ "$(readlink data/current)" = "$avant" ] || docker compose up -d --force-recreate valhalla
