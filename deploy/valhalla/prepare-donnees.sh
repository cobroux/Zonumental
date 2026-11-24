#!/usr/bin/env bash
# Telecharge l'extrait OSM Ile-de-France (Geofabrik) et construit les tuiles pietonnes Valhalla.
# Idempotent : sans changement de l'extrait, ne fait rien (FORCE=1 pour reconstruire).
# Taille attendue : .osm.pbf ~ 400-450 Mo ; tuiles ~ 1 a 1,5 Go ; construction 10-30 min, ~4 Go de RAM.
# Resultat : data/current -> data/<horodatage> (lien symbolique remplace atomiquement).
set -euo pipefail

cd "$(dirname "$0")"
IMAGE="${VALHALLA_IMAGE:-ghcr.io/valhalla/valhalla-scripted:3.5.1}"
URL="https://download.geofabrik.de/europe/france/ile-de-france-latest.osm.pbf"
mkdir -p data/cache

# Somme de controle publiee par Geofabrik : change a chaque nouvel extrait.
md5_attendu=$(curl -fsSL "$URL.md5" | awk '{print $1}')
[ -n "$md5_attendu" ] || { echo "md5 Geofabrik introuvable" >&2; exit 1; }

if [ "${FORCE:-0}" != 1 ] && [ -e data/current/.md5 ] && [ "$(cat data/current/.md5)" = "$md5_attendu" ]; then
  echo "Donnees deja a jour ($md5_attendu)."; exit 0
fi

pbf=data/cache/ile-de-france.osm.pbf
md5_local() { if command -v md5sum >/dev/null; then md5sum "$1" | awk '{print $1}'; else md5 -q "$1"; fi; }
if [ ! -f "$pbf" ] || [ "$(md5_local "$pbf")" != "$md5_attendu" ]; then
  rm -f "$pbf"  # pas de reprise (-C) : un ancien extrait complet serait complete par du nouveau
  curl -fL --retry 3 -o "$pbf" "$URL"
fi
[ "$(md5_local "$pbf")" = "$md5_attendu" ] || { echo "Somme de controle invalide" >&2; rm -f "$pbf"; exit 1; }

nouveau="data/$(date +%Y%m%d%H%M%S)"
mkdir -p "$nouveau/tiles"
trap 'rm -rf "$nouveau"' ERR
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/data/cache:/in:ro" -v "$PWD/$nouveau:/out" "$IMAGE" sh -euc '
  valhalla_build_config --mjolnir-tile-dir /data/tiles --mjolnir-tile-extract /data/tiles.tar \
    --mjolnir-timezone /data/timezones.sqlite --mjolnir-admin /data/admins.sqlite > /out/valhalla.json
  # RG-036 : aucun journal des requetes (la position ne doit pas etre tracee).
  python3 - <<PY
import json
p="/out/valhalla.json"; c=json.load(open(p))
for s in c.values():
    if isinstance(s,dict): s.pop("logging",None)
json.dump(c,open(p,"w"))
PY
  sed -i "s#/data/#/out/#g" /out/valhalla.json
  valhalla_build_timezones > /out/timezones.sqlite
  valhalla_build_admins -c /out/valhalla.json /in/ile-de-france.osm.pbf
  valhalla_build_tiles -c /out/valhalla.json /in/ile-de-france.osm.pbf
  sed -i "s#/out/#/data/#g" /out/valhalla.json
'
echo "$md5_attendu" > "$nouveau/.md5"
ln -sfn "$(basename "$nouveau")" data/current
# Garde la version precedente pour retour arriere, supprime les plus anciennes.
ls -dt data/2* | tail -n +3 | xargs -r rm -rf
echo "Tuiles pretes : $nouveau"
