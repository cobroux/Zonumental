import type { StyleSpecification } from 'maplibre-gl';

export interface CouleursCarte {
  fond: string;
  rue: string;
  rueFine: string;
  eau: string;
}

/** OpenFreeMap en développement ; PMTiles servi par notre origine en production (ADR 0023 §3). */
export const URL_TUILES = 'https://tiles.openfreemap.org/planet';

/** Les couleurs viennent de tokens.css : une seule source, aucun hexadécimal ici. */
export function lireCouleurs(el: Element = document.documentElement): CouleursCarte {
  const style = getComputedStyle(el);
  const lire = (nom: string) => style.getPropertyValue(nom).trim();
  return {
    fond: lire('--zn-carte-fond'),
    rue: lire('--zn-carte-rue'),
    rueFine: lire('--zn-carte-rue-fine'),
    eau: lire('--zn-carte-eau'),
  };
}

const MAJEURES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];

/** Plan sans libellés (schéma OpenMapTiles) : fond, Seine, rues en deux gris. */
export function styleCarte(c: CouleursCarte, url = URL_TUILES): StyleSpecification {
  const source = 'osm';
  return {
    version: 8,
    sources: { [source]: { type: 'vector', url } },
    layers: [
      { id: 'fond', type: 'background', paint: { 'background-color': c.fond } },
      {
        id: 'eau',
        type: 'fill',
        source,
        'source-layer': 'water',
        paint: { 'fill-color': c.eau },
      },
      {
        id: 'rues-fines',
        type: 'line',
        source,
        'source-layer': 'transportation',
        filter: ['!', ['in', ['get', 'class'], ['literal', MAJEURES]]],
        paint: {
          'line-color': c.rueFine,
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 17, 2],
        },
      },
      {
        id: 'rues',
        type: 'line',
        source,
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', MAJEURES]],
        paint: {
          'line-color': c.rue,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 17, 5],
        },
      },
    ],
  };
}
