import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export interface Coords {
  latitude: number;
  longitude: number;
  precision?: number;
}
export interface EtatPosition {
  statut: 'attente' | 'refus' | 'indisponible' | 'ok';
  coords?: Coords;
}

/** Position de l'explorateur, en mémoire seulement (RG-036, ADR 0020). */
@Injectable({ providedIn: 'root' })
export class Position {
  private readonly doc = inject(DOCUMENT);
  private readonly _etat = signal<EtatPosition>({ statut: 'attente' });
  readonly etat = this._etat.asReadonly();
  private suivi: number | null = null;
  private voulu = false; // autorisé : on suit tant que la page est visible

  constructor() {
    const surVisibilite = () => {
      if (!this.voulu) return;
      if (this.doc.visibilityState === 'hidden') {
        this.arreter();
        this._etat.update((e) => (e.statut === 'ok' ? { statut: 'attente' } : e));
      } else this.demarrer();
    };
    this.doc.addEventListener('visibilitychange', surVisibilite);
    inject(DestroyRef).onDestroy(() => {
      this.doc.removeEventListener('visibilitychange', surVisibilite);
      this.arreter();
    });
    const permissions = navigator.permissions?.query({ name: 'geolocation' });
    permissions
      ?.then((p) => {
        if (p.state === 'granted') this.activer();
        else if (p.state === 'denied') this._etat.set({ statut: 'refus' });
      })
      .catch(() => undefined);
  }

  /** À appeler depuis un bouton seulement : déclenche la demande système. */
  activer(): void {
    this.voulu = true;
    this.demarrer();
  }

  /** Lecture fraîche (jamais de cache), pour « Réessayer » (RG-057) ; null si indisponible. */
  relire(): Promise<Coords | null> {
    const geo = navigator.geolocation;
    if (!geo) return Promise.resolve(null);
    return new Promise((fin) =>
      geo.getCurrentPosition(
        (p) => {
          const coords = {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            precision: p.coords.accuracy,
          };
          this._etat.set({ statut: 'ok', coords });
          fin(coords);
        },
        () => fin(null),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      ),
    );
  }

  private demarrer(): void {
    if (this.suivi !== null) return;
    const geo = navigator.geolocation;
    if (!geo) return void this._etat.set({ statut: 'indisponible' });
    this.suivi = geo.watchPosition(
      (p) =>
        this._etat.set({
          statut: 'ok',
          coords: {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            precision: p.coords.accuracy,
          },
        }),
      (e) => this._etat.set({ statut: e.code === 1 ? 'refus' : 'indisponible' }),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 },
    );
  }

  private arreter(): void {
    if (this.suivi !== null) navigator.geolocation?.clearWatch(this.suivi);
    this.suivi = null;
  }
}
