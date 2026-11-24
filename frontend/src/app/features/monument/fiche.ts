import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  Signal,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Position } from '../../core/position/position';
import {
  POINTS,
  PRECISION_MAX_METRES,
  capVers,
  distanceMetres,
  formaterDistance,
} from '../../core/position/proximite';
import { Monument } from '../../core/api/models/monument';
import { ZnIcone } from '../../shared/ui/icone';
import { ConsentementsFacultatifs } from '../../core/api/models/consentements-facultatifs';
import { MaCollection } from '../../core/api/models/ma-collection';
import { MesSucces } from '../../core/api/models/mes-succes';
import { Profil } from '../../core/api/models/profil';
import { styleMedaille } from '../../shared/ui/medaille-catalogue';
import { ZnMedaille } from '../../shared/ui/medaille';
import { placement } from '../../shared/ui/placement';
import { ZnTampon } from '../../shared/ui/tampon';
import { ENCRE_PAR_RARETE, FORME_PAR_TYPE, contenuTampon } from '../../shared/ui/tampon-monument';
import { Celebration, CRITERE } from './celebration';
import { genererImage, partager, pseudoPartage, rang } from './partage';
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

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = ko;
    i.src = src;
  });
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

/** Fiche monument : verrouillée (indices, N&B) tant que non capturé (RG-042, RG-054). */
@Component({
  selector: 'app-fiche',
  imports: [Celebration, RouterLink, ZnIcone, ZnMedaille, ZnTampon],
  template: `
    @if (monument.hasValue(); as _) {
      @let m = monument.value();
      @if (animation()) {
        <app-celebration [monument]="m" [succes]="succes()" (fermer)="fin()" />
      }
      <a class="rond retour" routerLink="/carnet" aria-label="Retour au carnet">
        <zn-icone nom="retour" />
      </a>
      <div class="hero">
        @if (!m.image) {
          <div class="photo" data-silhouette role="img" aria-label="Image indisponible"></div>
        } @else if (m.image; as i) {
          <img class="photo" [class.avant]="!couleur()" [src]="couleur() ?? i.url" [alt]="m.nom" />
        }
        @if (m.captureeLe) {
          <!-- illustration : la date et le nom sont déjà dans la fiche (RG-043) -->
          <zn-tampon
            class="tampon-photo"
            aria-hidden="true"
            [attr.data-etat]="etatTampon()"
            [style]="'--rot: ' + rotation(m.numero) + 'deg'"
            [forme]="forme[m.type]"
            [encre]="encres[m.rarete]"
            [contenu]="contenu(m)"
            [decoratif]="true"
          />
        }
      </div>
      <p class="sr-only" aria-live="polite">{{ annonce() }}</p>
      <div class="feuille" [attr.data-rarete]="m.rarete">
        <p class="kicker">N°{{ numero3(m.numero) }} · {{ m.ville.nom.toUpperCase() }}</p>
        <h1 tabindex="-1">{{ m.nom }}</h1>
        <p class="pastilles">
          <span class="rarete">{{ raretes[m.rarete] }}</span>
          <span class="type">{{ types[m.type] }}</span>
        </p>
        @if (m.captureeLe) {
          <dl class="stats">
            <div>
              <dt>Année</dt>
              <dd>{{ m.stats?.annee ?? '—' }}</dd>
            </div>
            <div>
              <dt>Hauteur</dt>
              <dd>{{ hauteur(m.stats?.hauteurMetres) }}</dd>
            </div>
            <div>
              <dt>Matériau</dt>
              <dd>{{ m.stats?.materiau ?? '—' }}</dd>
            </div>
          </dl>
          <h2>Histoire</h2>
          @if (m.histoire; as h) {
            <p class="histoire">{{ h.texte }}</p>
            <p class="credit">Texte : <a [href]="h.sourceUrl">Source</a>, {{ h.licence }}</p>
          } @else {
            <p class="histoire">Histoire à venir</p>
          }
          <p class="date" data-tampon>Capturé le {{ date(m.captureeLe) }}</p>
          @if (lie(); as l) {
            <section class="lie" aria-labelledby="titre-lie">
              <h2 id="titre-lie">Succès débloqués</h2>
              <p class="ligne">
                <span class="medaille" aria-hidden="true">
                  <zn-medaille
                    [nom]="l.libelle"
                    [encre]="l.style.encre"
                    [glyphe]="l.style.glyphe"
                    [texte]="l.style.texte"
                    [rotation]="l.style.rotation"
                  />
                </span>
                <span class="nom">{{ l.libelle }}</span>
                @if (l.critere) {
                  <span class="critere">{{ l.critere }}</span>
                }
              </p>
            </section>
          }
          @if (photo(); as p) {
            <img class="ta-photo" data-photo [src]="p" alt="Ta photo" />
          }
        } @else {
          <p class="meta">{{ m.ville.nom }} · {{ siecle(m.siecle) }}</p>
          @if (visee(); as v) {
            <p class="visee">
              {{ v.distance }}
              <span aria-hidden="true" class="fleche" [style.transform]="'rotate(' + v.cap + 'deg)'"
                >↑</span
              >
              <span>Direction : {{ v.point }}</span>
            </p>
          }
          <h2>Histoire</h2>
          <p class="histoire">Histoire verrouillée : tamponne ce monument pour la lire.</p>
          <p class="verrou">Stats verrouillées</p>
        }
        @if (m.image; as i) {
          <p class="credit">
            Image : <a [href]="i.sourceUrl">{{ i.auteur ?? 'Wikimedia Commons' }}</a
            >,
            {{ i.licence }}
            @if (!couleur()) {
              <span>(image modifiée : noir et blanc, teintée et floutée)</span>
            }
          </p>
        }
        <p class="sr-only" role="status">{{ statutPartage() }}</p>
        @if (partageErreur()) {
          <p class="erreur" role="alert">Impossible de préparer l'image. Réessaie.</p>
        }
        <div class="actions">
          @if (m.captureeLe) {
            <button
              type="button"
              class="principal"
              [disabled]="partageEnCours()"
              [attr.aria-busy]="partageEnCours()"
              (click)="partagerPage(m)"
            >
              {{ partageEnCours() ? 'Préparation…' : 'Partager ma page' }}
            </button>
            <button type="button" class="secondaire" (click)="aller(true)">
              Remplacer la photo
            </button>
          } @else {
            <button type="button" class="principal" [disabled]="!dansLaZone()" (click)="aller()">
              Aller le tamponner
            </button>
          }
        </div>
      </div>
    } @else if (monument.error()) {
      @if (horsLigne()) {
        <p class="erreur" role="alert">
          Pas de connexion.
          <button type="button" (click)="monument.reload()">Réessayer</button>
        </p>
      } @else {
        <p class="erreur" role="alert">Monument introuvable.</p>
      }
    }
  `,
  styleUrl: './fiche.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Fiche {
  readonly numero = input.required<string>();
  protected readonly monument = httpResource<Monument>(
    () => `/api/catalogue/monuments/${this.numero()}`,
  );
  /** Posé par la caméra après une capture réussie ; l'histoire vient déjà avec la fiche capturée (RG-055). */
  protected readonly animation = signal(history.state?.capture === true);
  /** Succès gagnés par la capture, dans la feuille de célébration (spec fidélité §8.2). */
  protected readonly succes = signal<{ code: string; libelle: string }[]>(
    history.state?.succes ?? [],
  );
  /** Retour de capture : le tampon se pose une fois la feuille fermée (jamais sous le voile). */
  private readonly aPoser = history.state?.capture === true;
  protected readonly etatTampon = computed(() =>
    this.aPoser ? (this.animation() ? 'attente' : 'pose') : null,
  );
  /** Annonce unique, après la feuille (qui a déjà annoncé la capture) ; vide sinon. */
  protected readonly annonce = computed(() =>
    this.etatTampon() === 'pose' ? 'Tampon posé sur la fiche.' : '',
  );
  protected readonly forme = FORME_PAR_TYPE;
  protected readonly encres = ENCRE_PAR_RARETE;
  protected readonly contenu = contenuTampon;
  protected readonly rotation = (n: number) => placement(n).rotation;
  private readonly succesApi = httpResource<MesSucces>(() =>
    this.monument.hasValue() && this.monument.value().captureeLe
      ? '/api/progression/succes'
      : undefined,
  );
  /** Pas de lien monument-succès dans l'API : le succès obtenu avec la capture (même instant, ±60 s). */
  protected readonly lie = computed(() => {
    const m = this.monument.hasValue() ? this.monument.value() : undefined;
    if (!m?.captureeLe || !this.succesApi.hasValue()) return null;
    const t = Date.parse(m.captureeLe);
    const s = this.succesApi
      .value()
      .obtenus.find((o) => Math.abs(Date.parse(o.obtenuLe) - t) < 60_000);
    return s && { ...s, style: styleMedaille(s.code), critere: CRITERE[s.code] };
  });
  /** « Continuer » : ferme la feuille et ramène le focus sur le titre de la fiche. */
  protected fin(): void {
    this.animation.set(false);
    this.succes.set([]);
    history.replaceState({ ...history.state, capture: undefined, succes: undefined }, '');
    afterNextRender(() => this.hote.querySelector<HTMLElement>('h1')?.focus(), {
      injector: this.injector,
    });
  }
  private readonly http = inject(HttpClient);
  protected readonly partageEnCours = signal(false);
  protected readonly partageErreur = signal(false);
  protected readonly statutPartage = signal('');
  /** Image 1080 x 1920 de la page de carnet ; données lues à la demande (aucun endpoint dédié). */
  protected async partagerPage(m: Monument): Promise<void> {
    this.partageEnCours.set(true);
    this.partageErreur.set(false);
    this.statutPartage.set('Préparation de l’image.');
    try {
      const [collections, moi, consentements] = await Promise.all([
        firstValueFrom(this.http.get<MaCollection[]>('/api/progression/collections')),
        firstValueFrom(this.http.get<Profil>('/api/compte/moi')).catch(() => undefined),
        firstValueFrom(this.http.get<ConsentementsFacultatifs>('/api/compte/consentements')).catch(
          () => undefined,
        ),
      ]);
      const css = getComputedStyle(document.documentElement);
      const token = (t: string) => css.getPropertyValue(t).trim();
      const source = this.photo() ?? this.couleur();
      const photo = source ? await chargerImage(source).catch(() => null) : null;
      const { n, total } = rang(collections);
      const blob = await genererImage(
        {
          nom: m.nom,
          ville: m.ville.nom,
          numero: m.numero,
          rarete: m.rarete === 'LEGENDAIRE' ? 'LÉGENDAIRE' : m.rarete,
          encre: `--zn-tampon-${this.encres[m.rarete]}`,
          iso: m.captureeLe!,
          annee: m.stats?.annee ?? null,
          pseudo: pseudoPartage(moi?.pseudo, consentements?.classement === true),
          capturesFrance: n,
          totalFrance: total,
          photo,
        },
        {
          couleur: token,
          police: {
            titre: token('--zn-police-titre'),
            ui: token('--zn-police-ui'),
            mono: token('--zn-police-mono'),
          },
        },
      );
      const mode = await partager(blob, `zonumental-${m.numero}`);
      this.statutPartage.set(mode === 'partage' ? '' : 'Image téléchargée.');
    } catch {
      this.partageErreur.set(true);
      this.statutPartage.set('');
    } finally {
      this.partageEnCours.set(false);
    }
  }
  private readonly position = inject(Position).etat;
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly siecle = formaterSiecle;
  protected readonly hauteur = (h?: number | null) => (h == null ? '—' : `${h} m`);
  protected readonly numero3 = (n: number) => String(n).padStart(3, '0');
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
  protected aller(remplacer = false): void {
    void this.router.navigate(
      ['/monument', this.numero(), 'capturer'],
      remplacer ? { state: { remplacer: true } } : undefined,
    );
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
