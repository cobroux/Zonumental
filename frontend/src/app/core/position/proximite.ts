import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { MonumentResume } from '../api/models/monument-resume';
import { listerMonuments } from '../api/fn/catalogue/lister-monuments';
import { Session } from '../session/session';
import { Coords, EtatPosition, Position } from './position';

export const RAYON_LISTE_METRES = 2000;
export const PRECISION_MAX_METRES = 100; // RG-031

export type Proche = MonumentResume & { distance: number; capture: boolean };
export type EtatBouton = 'loin' | 'deja' | 'proche' | 'imprecis' | 'zone';

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

export const POINTS = [
  'nord',
  'nord-est',
  'est',
  'sud-est',
  'sud',
  'sud-ouest',
  'ouest',
  'nord-ouest',
];

export function formaterDistance(m: number): string {
  const arrondi = Math.round(m / 10) * 10;
  return arrondi < 1000 ? `${arrondi} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

const MARCHE_M_PAR_MIN = 5000 / 60; // 5 km/h
const MARCHE_MAX_MIN = 120;

/** Durée à pied ; vide au-delà de 2 h (peu pertinent). */
export function dureeAPied(m: number): string {
  const min = Math.round(m / MARCHE_M_PAR_MIN);
  if (min > MARCHE_MAX_MIN) return '';
  if (min < 60) return `${min} min à pied`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} à pied`;
}

export function proches(
  monuments: MonumentResume[],
  coords: Coords,
  rayon = RAYON_LISTE_METRES,
): Proche[] {
  return monuments
    .map((m) => ({
      ...m,
      distance: distanceMetres(coords, m.position),
      capture: m.captureeLe !== null,
    }))
    .filter((m) => m.distance < rayon)
    .sort((a, b) => a.distance - b.distance);
}

/** `href` : où mène le bouton central (fiche du plus proche, caméra dans la zone, sinon l'écran Tamponner). */
export function etatBouton(
  liste: Proche[],
  position: EtatPosition,
  tous: Proche[] = liste,
): { etat: EtatBouton; texte: string; href: string } {
  const fiche = (m: MonumentResume) => `/monument/${m.numero}`;
  // position inconnue : même état que « loin » (maquette NavBar, fidélité §6.3)
  if (position.statut !== 'ok' || !position.coords || !liste.length) {
    const plusProche = position.statut === 'ok' ? tous.find((m) => !m.capture) : undefined;
    return { etat: 'loin', texte: '> 2 km', href: plusProche ? fiche(plusProche) : '/tamponner' };
  }
  const cible = liste.find((m) => !m.capture);
  if (!cible) return { etat: 'deja', texte: 'Déjà tamponné', href: '/tamponner' };
  if (cible.distance > cible.rayonCaptureMetres)
    return { etat: 'proche', texte: formaterDistance(cible.distance), href: fiche(cible) };
  const precision = position.coords.precision;
  return precision === undefined || precision > PRECISION_MAX_METRES
    ? { etat: 'imprecis', texte: 'Signal faible', href: '/tamponner' }
    : { etat: 'zone', texte: 'Tamponner', href: `${fiche(cible)}/capturer` };
}

/** Catalogue + position -> monuments proches et état du bouton (ADR 0020). Calcul sur l'appareil (RG-036). */
@Injectable({ providedIn: 'root' })
export class Proximite {
  private readonly session = inject(Session);
  readonly position = inject(Position);
  private readonly catalogue = httpResource<MonumentResume[]>(() =>
    this.session.connecte() ? listerMonuments.PATH : undefined,
  );
  readonly monuments = computed(() => this.catalogue.value() ?? []);
  readonly erreur = computed(() => this.catalogue.error() !== undefined);
  /** Tout le catalogue trié par distance : cible du bouton quand rien n'est à moins de 2 km. */
  private readonly tous = computed(() => {
    const { coords } = this.position.etat();
    return coords ? proches(this.catalogue.value() ?? [], coords, Infinity) : [];
  });
  readonly proches = computed(() => this.tous().filter((m) => m.distance < RAYON_LISTE_METRES));
  readonly bouton = computed(() => etatBouton(this.proches(), this.position.etat(), this.tous()));

  recharger(): void {
    this.catalogue.reload();
  }
}
