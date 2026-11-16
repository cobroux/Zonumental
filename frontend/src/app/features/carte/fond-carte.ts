import { InjectionToken } from '@angular/core';
import type { StyleSpecification } from 'maplibre-gl';

/** Ce que le composant utilise de MapLibre (ADR 0023 §5) : un faux suffit en test, sans WebGL. */
export interface FondCarte {
  project(lngLat: [number, number]): { x: number; y: number };
  getZoom(): number;
  on(evenement: 'move', rappel: () => void): void;
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

export async function creerFond(options: OptionsFond): Promise<FondCarte> {
  const maplibre = await import('maplibre-gl');
  const url = new URL(WORKER, document.baseURI).href;
  autoriserWorker(url);
  maplibre.setWorkerUrl(url);
  return new maplibre.Map({
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
}
