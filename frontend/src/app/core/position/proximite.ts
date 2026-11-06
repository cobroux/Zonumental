import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { MonumentResume } from '../api/models/monument-resume';
import { listerMonuments } from '../api/fn/catalogue/lister-monuments';
import { Session } from '../session/session';
import { Coords, EtatPosition, Position } from './position';

export const RAYON_LISTE_METRES = 2000;
export const PRECISION_MAX_METRES = 100; // RG-031

export type Proche = MonumentResume & { distance: number; capture: boolean };
export type EtatBouton = 'sans-position' | 'loin' | 'deja' | 'proche' | 'imprecis' | 'zone';

export function distanceMetres(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
}

/** Cap géographique de a vers b, en degrés (0 = nord, sens horaire). */
export function capVers(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = Math.PI / 180;
  const dl = (b.longitude - a.longitude) * rad;
  const y = Math.sin(dl) * Math.cos(b.latitude * rad);
  const x =
    Math.cos(a.latitude * rad) * Math.sin(b.latitude * rad) -
    Math.sin(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.cos(dl);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

export function formaterDistance(m: number): string {
  const arrondi = Math.round(m / 10) * 10;
  return arrondi < 1000 ? `${arrondi} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

export function proches(monuments: MonumentResume[], coords: Coords): Proche[] {
  return monuments
    .map((m) => ({
      ...m,
      distance: distanceMetres(coords, m.position),
      capture: m.captureeLe !== null,
    }))
    .filter((m) => m.distance < RAYON_LISTE_METRES)
    .sort((a, b) => a.distance - b.distance);
}

export function etatBouton(
  liste: Proche[],
  position: EtatPosition,
): { etat: EtatBouton; texte: string } {
  if (position.statut !== 'ok' || !position.coords)
    return { etat: 'sans-position', texte: 'Position' };
  if (!liste.length) return { etat: 'loin', texte: '> 2 km' };
  const cible = liste.find((m) => !m.capture);
  if (!cible) return { etat: 'deja', texte: 'Déjà tamponné ici' };
  if (cible.distance > cible.rayonCaptureMetres)
    return { etat: 'proche', texte: formaterDistance(cible.distance) };
  const precision = position.coords.precision;
  return precision === undefined || precision > PRECISION_MAX_METRES
    ? { etat: 'imprecis', texte: 'Signal faible' }
    : { etat: 'zone', texte: 'Tamponner' };
}

/** Catalogue + position -> monuments proches et état du bouton (ADR 0020). Calcul sur l'appareil (RG-036). */
@Injectable({ providedIn: 'root' })
export class Proximite {
  private readonly session = inject(Session);
  readonly position = inject(Position);
  private readonly catalogue = httpResource<MonumentResume[]>(() =>
    this.session.connecte() ? listerMonuments.PATH : undefined,
  );
  readonly erreur = computed(() => this.catalogue.error() !== undefined);
  readonly proches = computed(() => {
    const { coords } = this.position.etat();
    return coords ? proches(this.catalogue.value() ?? [], coords) : [];
  });
  readonly bouton = computed(() => etatBouton(this.proches(), this.position.etat()));

  recharger(): void {
    this.catalogue.reload();
  }
}
