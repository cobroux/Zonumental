import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Position } from '../../core/position/position';
import {
  PRECISION_MAX_METRES,
  capVers,
  distanceMetres,
  formaterDistance,
} from '../../core/position/proximite';
import { Monument } from '../../core/api/models/monument';
import { formaterSiecle } from './siecle';

/** Blob authentifié (intercepteur Bearer) -> URL objet, révoquée au changement et à la destruction (ADR 0021). */
function urlBlob(url: () => string | undefined): Signal<string | null> {
  const blob = httpResource.blob(url);
  const objet = signal<string | null>(null);
  effect((onCleanup) => {
    const b = blob.hasValue() ? blob.value() : undefined;
    if (!b) return objet.set(null);
    const u = URL.createObjectURL(b);
    objet.set(u);
    onCleanup(() => URL.revokeObjectURL(u));
  });
  return objet;
}

/** ISO -> jj/mm/aaaa, heure de Paris (RG-043). */
function formaterDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}

const RARETES = { COMMUN: 'Commun', RARE: 'Rare', LEGENDAIRE: 'Légendaire' };
const TYPES = {
  CHATEAU: 'Château',
  RELIGIEUX: 'Édifice religieux',
  PONT: 'Pont',
  PHARE: 'Phare',
  PALAIS: 'Palais',
  TOUR: 'Tour',
  MUSEE: 'Musée',
  AUTRE: 'Monument',
};
const POINTS = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest'];

/** Fiche monument : verrouillée (indices, N&B) tant que non capturé (RG-042, RG-054). */
@Component({
  selector: 'app-fiche',
  template: `
    @if (monument.hasValue(); as _) {
      @let m = monument.value();
      <h1>{{ m.nom }}</h1>
      <p>N° {{ m.numero }} · {{ types[m.type] }} · {{ raretes[m.rarete] }}</p>
      <p>{{ m.ville.nom }} · {{ siecle(m.siecle) }}</p>
      @if (!m.captureeLe) {
        @if (visee(); as v) {
          <p>
            {{ v.distance }}
            <span aria-hidden="true" class="fleche" [style.transform]="'rotate(' + v.cap + 'deg)'"
              >↑</span
            >
            <span>Direction : {{ v.point }}</span>
          </p>
        }
        <button type="button" [disabled]="!dansLaZone()" (click)="aller()">
          Aller le tamponner
        </button>
      }
      @if (!m.image) {
        <div data-silhouette role="img" aria-label="Image indisponible"></div>
      } @else if (m.image; as i) {
        <figure>
          <img [src]="couleur() ?? i.url" [alt]="m.nom" />
          <figcaption>
            Source : <a [href]="i.sourceUrl">{{ i.auteur ?? 'Wikimedia Commons' }}</a
            >,
            {{ i.licence }}
            @if (!couleur()) {
              <span>(image modifiée : noir et blanc)</span>
            }
          </figcaption>
        </figure>
      }
      @if (m.captureeLe) {
        <p data-tampon>Capturé le {{ date(m.captureeLe) }}</p>
        @if (photo(); as p) {
          <img data-photo [src]="p" alt="Ta photo" />
        }
        <!-- Flux dépendant de la caméra : r1-capturer-15 -->
        <button type="button">Remplacer la photo</button>
        @if (m.stats; as s) {
          <dl>
            <dt>Année</dt>
            <dd>{{ s.annee ?? '—' }}</dd>
            <dt>Style</dt>
            <dd>{{ s.style ?? '—' }}</dd>
            <dt>Hauteur</dt>
            <dd>{{ s.hauteurMetres === null ? '—' : s.hauteurMetres + ' m' }}</dd>
          </dl>
        }
        <h2>Histoire</h2>
        @if (m.histoire; as h) {
          <p>{{ h.texte }}</p>
          <p><a [href]="h.sourceUrl">Source</a>, {{ h.licence }}</p>
        } @else {
          <p>Histoire à venir</p>
        }
      } @else {
        <h2>Histoire</h2>
        <p>Histoire verrouillée : tamponne ce monument pour la lire.</p>
        <p>Stats verrouillées</p>
      }
    } @else if (monument.error()) {
      @if (horsLigne()) {
        <p role="alert">
          Pas de connexion.
          <button type="button" (click)="monument.reload()">Réessayer</button>
        </p>
      } @else {
        <p role="alert">Monument introuvable.</p>
      }
    }
  `,
  styleUrl: '../coquille.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Fiche {
  readonly numero = input.required<string>();
  protected readonly monument = httpResource<Monument>(
    () => `/api/catalogue/monuments/${this.numero()}`,
  );
  private readonly position = inject(Position).etat;
  private readonly router = inject(Router);
  protected readonly siecle = formaterSiecle;
  protected readonly date = formaterDate;
  protected readonly raretes = RARETES;
  protected readonly types = TYPES;
  protected readonly horsLigne = computed(
    () => (this.monument.error() as { status?: number } | undefined)?.status === 0,
  );
  private readonly mesure = computed(() => {
    const coords = this.position().coords;
    const m = this.monument.hasValue() ? this.monument.value() : undefined;
    return coords && m ? { coords, m, distance: distanceMetres(coords, m.position) } : null;
  });
  protected readonly visee = computed(() => {
    const x = this.mesure();
    if (!x) return null;
    const cap = capVers(x.coords, x.m.position);
    return {
      distance: formaterDistance(x.distance),
      cap,
      point: POINTS[Math.round(cap / 45) % 8],
    };
  });
  protected readonly dansLaZone = computed(() => {
    const x = this.mesure();
    const p = x?.coords.precision;
    return (
      !!x && x.distance <= x.m.rayonCaptureMetres && p !== undefined && p <= PRECISION_MAX_METRES
    );
  });
  protected aller(): void {
    void this.router.navigate(['/monument', this.numero(), 'capturer']);
  }
  protected readonly couleur = urlBlob(() => {
    const m = this.monument.hasValue() ? this.monument.value() : undefined;
    return m?.captureeLe ? (m.image?.urlCouleur ?? undefined) : undefined;
  });
  protected readonly photo = urlBlob(() => {
    const m = this.monument.hasValue() ? this.monument.value() : undefined;
    return m?.captureeLe ? (m.photoUrl ?? undefined) : undefined;
  });
}
