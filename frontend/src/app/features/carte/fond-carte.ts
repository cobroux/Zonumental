import { InjectionToken } from '@angular/core';
import type { StyleSpecification } from 'maplibre-gl';
import { Itineraire } from '../../core/api/models/itineraire';

/** Ce que le composant utilise de MapLibre (ADR 0023 §5) : un faux suffit en test, sans WebGL. */
export interface FondCarte {
  project(lngLat: [number, number]): { x: number; y: number };
  getZoom(): number;
  on(evenement: 'move', rappel: () => void): void;
  /** Recentre sur la position ; sans animation si `reduit` (prefers-reduced-motion). */
  centrer(lngLat: [number, number]): void;
  /** Dessine l'itinéraire (GeoJSON LineString) et cadre la carte dessus ; sans animation si `reduit`. */
  tracer(trace: Itineraire['trace']): void;
  /** Retire le tracé ; sans effet s'il n'y en a pas. */
  effacer(): void;
  remove(): void;
}

export interface OptionsFond {
  conteneur: HTMLElement;
  style: StyleSpecification;
  centre: [number, number];
  zoom: number;
  limites: [[number, number], [number, number]];
  zoomMin: number;
  zoomMax: number;
  reduit: boolean;
  couleurItineraire: string;
}

export const FOND_CARTE = new InjectionToken<(options: OptionsFond) => Promise<FondCarte>>(
  'FOND_CARTE',
  { factory: () => creerFond },
);

/** Worker copié dans nos assets (angular.json) : `worker-src 'self'`, sans `blob:` (ADR 0023 §7). */
const WORKER = 'maplibre/maplibre-gl-worker.mjs';

/**
 * Trusted Types (ADR 0015) : `new Worker(url)` exige un TrustedScriptURL. MapLibre manipule l'URL
 * comme une chaîne, donc politique `default` qui n'accepte que l'URL exacte du worker.
 */
function autoriserWorker(url: string): void {
  const tt = (
    globalThis as {
      trustedTypes?: {
        defaultPolicy: unknown;
        createPolicy(nom: string, regles: { createScriptURL(valeur: string): string }): unknown;
      };
    }
  ).trustedTypes;
  if (!tt || tt.defaultPolicy) return;
  tt.createPolicy('default', {
    createScriptURL: (valeur) => {
      if (valeur !== url) throw new TypeError('URL de script refusée');
      return valeur;
    },
  });
}

const TRACE = 'itineraire';

export async function creerFond(options: OptionsFond): Promise<FondCarte> {
  const maplibre = await import('maplibre-gl');
  const url = new URL(WORKER, document.baseURI).href;
  autoriserWorker(url);
  maplibre.setWorkerUrl(url);
  const carte = new maplibre.Map({
    container: options.conteneur,
    style: options.style,
    center: options.centre,
    zoom: options.zoom,
    minZoom: options.zoomMin,
    maxZoom: options.zoomMax,
    maxBounds: options.limites,
    attributionControl: false, // mention maison, toujours visible (ADR 0023 §6)
    fadeDuration: options.reduit ? 0 : 300,
    pitchWithRotate: false,
    dragRotate: false,
    touchPitch: false,
  });
  const effacer = () => {
    if (carte.getLayer(TRACE)) carte.removeLayer(TRACE);
    if (carte.getSource(TRACE)) carte.removeSource(TRACE);
  };
  return Object.assign(carte, {
    centrer: (centre: [number, number]) =>
      options.reduit ? carte.jumpTo({ center: centre }) : carte.easeTo({ center: centre }),
    effacer,
    tracer: (trace: Itineraire['trace']) => {
      effacer();
      carte.addSource(TRACE, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: trace },
      });
      carte.addLayer({
        id: TRACE,
        type: 'line',
        source: TRACE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': options.couleurItineraire, 'line-width': 5 },
      });
      const bornes = new maplibre.LngLatBounds();
      for (const [lng, lat] of trace.coordinates) bornes.extend([lng, lat]);
      // marge basse : le panneau d'itinéraire recouvre le bas de la carte
      carte.fitBounds(bornes, {
        padding: { top: 90, bottom: 280, left: 32, right: 32 },
        ...(options.reduit && { duration: 0 }),
      });
    },
  });
}
