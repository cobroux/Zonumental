import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Api } from '../../core/api/api';
import { calculerItineraire } from '../../core/api/fn/itineraire/calculer-itineraire';
import { Itineraire } from '../../core/api/models/itineraire';
import { Coords } from '../../core/position/position';
import { formaterDistance } from '../../core/position/proximite';

export interface Erreur {
  texte: string;
  repli: boolean;
}
export type EtatItineraire =
  | { statut: 'inactif' | 'chargement' }
  | { statut: 'ok'; itineraire: Itineraire }
  | ({ statut: 'erreur' } & Erreur);

function probleme(e: HttpErrorResponse): { code?: string; erreurs?: { champ: string }[] } | null {
  try {
    return typeof e.error === 'string' ? JSON.parse(e.error) : e.error;
  } catch {
    return null;
  }
}

function delai(e: HttpErrorResponse): string {
  const s = Number(e.headers?.get('Retry-After'));
  if (!s) return 'dans un instant';
  return s < 60 ? `dans ${s} s` : `dans ${Math.ceil(s / 60)} min`;
}

/** Un message par cause ; null = rien à afficher (401 géré par l'intercepteur). Aucune valeur de position. */
export function messageDe(e: unknown): Erreur | null {
  if (!(e instanceof HttpErrorResponse))
    return { texte: 'Itinéraire indisponible pour le moment.', repli: true };
  const indisponible = { texte: 'Itinéraire indisponible pour le moment.', repli: true };
  switch (e.status) {
    case 401:
      return null;
    case 0:
      return { texte: 'Pas de connexion.', repli: true };
    case 400:
      return probleme(e)?.erreurs?.some((x) => x.champ === 'depart')
        ? { texte: 'Trop loin pour un trajet à pied (10 km max).', repli: true }
        : indisponible;
    case 404:
      return { texte: 'Monument introuvable.', repli: false };
    case 429:
      return { texte: `Limite de calculs atteinte. Réessaie ${delai(e)}.`, repli: false };
    default:
      return indisponible;
  }
}

/** « 23 min · 1,8 km ». */
export function resume(it: Itineraire): string {
  const min = Math.round(it.dureeSecondes / 60);
  const duree =
    min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
  return `${duree} · ${formaterDistance(it.distanceMetres)}`;
}

const R_TERRE = 6_371_000;
export const SEUIL_ECART_M = 50;
const SEUIL_RETOUR_M = 40; // hystérésis : pas de clignotement autour de 50 m

/** Distance (m) d'un point à la polyligne : projection locale plane, point-segment, aucun appel réseau. */
export function ecartMetres(p: Coords, trace: Itineraire['trace']): number {
  const k = Math.cos((p.latitude * Math.PI) / 180);
  const xy = ([lng, lat]: number[]) => [
    ((lng - p.longitude) * Math.PI * R_TERRE * k) / 180,
    ((lat - p.latitude) * Math.PI * R_TERRE) / 180,
  ];
  const pts = trace.coordinates.map(xy);
  let min = pts.length ? Infinity : 0;
  pts.forEach(([x, y], i) => {
    const [x2, y2] = pts[i + 1] ?? [x, y];
    const dx = x2 - x;
    const dy = y2 - y;
    const t = dx || dy ? Math.max(0, Math.min(1, -(x * dx + y * dy) / (dx * dx + dy * dy))) : 0;
    min = Math.min(min, Math.hypot(x + t * dx, y + t * dy));
  });
  return min;
}

/** Écart avec hystérésis : s'allume au-dessus de 50 m, s'éteint sous 40 m. */
export function ecarte(deja: boolean, distance: number): boolean {
  return distance > (deja ? SEUIL_RETOUR_M : SEUIL_ECART_M);
}

/** Q-44 (repli OpenStreetMap) : à retirer en une ligne si refusé. Destination seule, jamais la position de l'utilisateur. */
export function lienRepli(m: { latitude: number; longitude: number }): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_valhalla_foot&route=%3B${m.latitude}%2C${m.longitude}`;
}

/**
 * Calcul d'itinéraire à pied ; la position n'est ni stockée ni journalisée (RG-036).
 * `root` et non `providers` du composant : celui-ci ajoute ~2 ko au paquet initial ; `Carte` l'efface à sa destruction.
 */
@Injectable({ providedIn: 'root' })
export class CalculItineraire {
  private readonly api = inject(Api);
  private readonly _etat = signal<EtatItineraire>({ statut: 'inactif' });
  readonly etat = this._etat.asReadonly();

  private rang = 0;

  async calculer(numero: number, depart: Coords): Promise<void> {
    const mien = ++this.rang;
    if (!navigator.onLine) {
      this._etat.set({ statut: 'erreur', texte: 'Pas de connexion.', repli: true });
      return;
    }
    this._etat.set({ statut: 'chargement' });
    try {
      const itineraire = await this.api.invoke(calculerItineraire, {
        body: { depart: { latitude: depart.latitude, longitude: depart.longitude }, numero },
      });
      if (mien === this.rang) this._etat.set({ statut: 'ok', itineraire });
    } catch (e) {
      if (mien !== this.rang) return; // résultat périmé (monument changé, écran quitté)
      const m = messageDe(e);
      this._etat.set(m ? { statut: 'erreur', ...m } : { statut: 'inactif' });
    }
  }

  effacer(): void {
    this.rang++;
    this._etat.set({ statut: 'inactif' });
  }
}
