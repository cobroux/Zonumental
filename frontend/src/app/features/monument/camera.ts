import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api/api';
import { capturer } from '../../core/api/fn/capture/capturer';
import { Position } from '../../core/position/position';
import { Monument } from '../../core/api/models/monument';
import {
  POINTS,
  PRECISION_MAX_METRES,
  capVers,
  distanceMetres,
  dureeAPied,
  formaterDistance,
} from '../../core/position/proximite';
import { ZnMessage } from '../../shared/ui/message';
import { AutoriserCamera } from './autoriser-camera';

const COTE_LONG_MAX = 1600;
const OCTETS_MAX = 5_000_000;

interface Refus {
  texte: string;
  reessayer: boolean;
  distance?: number;
  email?: boolean;
  remplacer?: boolean;
}

/** Corps problem+json (le client généré le livre en chaîne). */
function lireProbleme(e: unknown): { code?: string; distanceMetres?: number } | null {
  if (!(e instanceof HttpErrorResponse)) return null;
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

/** Un message par cause, d'après le code `problem+json` ; null = rien à afficher (401 géré par l'intercepteur). */
export function refusDe(e: unknown): Refus | null {
  const code = lireProbleme(e)?.code;
  if (e instanceof HttpErrorResponse && e.status === 401) return null;
  if (e instanceof HttpErrorResponse && e.status === 0)
    return { texte: 'Pas de connexion.', reessayer: true };
  switch (code) {
    case 'trop-loin':
      return {
        texte: `Tu es à ${lireProbleme(e)?.distanceMetres} m, rapproche-toi !`,
        reessayer: true,
        distance: lireProbleme(e)?.distanceMetres,
      };
    case 'precision-insuffisante':
      return { texte: 'Signal trop faible, réessaie à découvert.', reessayer: true };
    case 'limite-frequence':
      return {
        texte: `Tu as atteint la limite de captures. Réessaie ${delai(e as HttpErrorResponse)}.`,
        reessayer: true,
      };
    case 'deplacement-improbable':
      return {
        texte: `Cette capture n'a pas pu être validée. Réessaie ${delai(e as HttpErrorResponse)}.`,
        reessayer: true,
      };
    case 'indisponible':
      return {
        texte: `Le service est très sollicité. Réessaie ${delai(e as HttpErrorResponse)}.`,
        reessayer: true,
      };
    case 'image-invalide':
    case 'validation':
      return {
        texte: "Cette photo n'est pas valide ou dépasse 5 Mo. Reprends-en une.",
        reessayer: false,
      };
    case 'deja-capture':
      return {
        texte: 'Ce monument est déjà tamponné. Tu peux remplacer ta photo souvenir.',
        reessayer: false,
        remplacer: true,
      };
    case 'email-non-verifie':
      return { texte: 'Vérifie ton e-mail pour pouvoir tamponner.', reessayer: false, email: true };
    default:
      return { texte: 'La capture a échoué. Réessaie.', reessayer: true };
  }
}

export function dimensionsReduites(l: number, h: number): [number, number] {
  const k = Math.min(1, COTE_LONG_MAX / Math.max(l, h));
  return [Math.round(l * k), Math.round(h * k)];
}

function enBlob(canvas: HTMLCanvasElement, qualite: number): Promise<Blob | null> {
  return new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', qualite));
}

/** Prise de photo en direct uniquement (RG-026) ; la photo reste en mémoire (RG-057). Pas de file hors ligne (RG-040). */
@Component({
  selector: 'app-camera',
  template: `
    <svg class="voile voile-haut" aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <defs>
        <linearGradient id="voile-haut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="currentColor" stop-opacity=".7" />
          <stop offset="1" stop-color="currentColor" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#voile-haut)" />
    </svg>
    <svg class="voile voile-bas" aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <defs>
        <linearGradient id="voile-bas" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="currentColor" stop-opacity="0" />
          <stop offset=".55" stop-color="currentColor" stop-opacity=".86" />
          <stop offset="1" stop-color="currentColor" stop-opacity=".9" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#voile-bas)" />
    </svg>
    @if (feuille()) {
      <app-autoriser-camera (accepter)="ouvrir()" (plusTard)="plusTard()" />
    }
    @if (!cameraRefusee()) {
      <video
        #video
        autoplay
        playsinline
        muted
        aria-label="Aperçu de la caméra"
        [class.attenue]="zone().etat === 'hors'"
      ></video>
    }
    @if (flash()) {
      <span class="flash" aria-hidden="true"></span>
    }
    <header class="entete">
      <a class="rond" [routerLink]="['/monument', numero()]" aria-label="Fermer la caméra">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </a>
      <p class="puce" [attr.data-etat]="zone().etat">
        @if (zone().etat === 'dans') {
          <span class="point" aria-hidden="true"></span>
        }
        {{ zone().texte }}
      </p>
      @if (torcheDispo()) {
        <button
          type="button"
          class="rond rond-droit"
          aria-label="Flash"
          [attr.aria-pressed]="torche()"
          (click)="basculerTorche()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3 5 14h6l-1 7 8-11h-6z" /></svg>
        </button>
      }
    </header>
    <p class="sr-only" aria-live="polite">{{ zone().annonce }}</p>
    @if (zone().etat === 'dans') {
      <div class="cadre" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
    }
    <div class="bas">
      @if (refus(); as r) {
        <zn-message type="erreur">
          {{ r.texte }}
          @if (cap() !== null) {
            <span data-fleche aria-hidden="true" [style.transform]="'rotate(' + cap() + 'deg)'"
              >↑</span
            >
            Direction : {{ point() }}.
          }
          @if (r.email) {
            <a routerLink="/inscription/verifie-ton-email">Vérifier mon e-mail</a>
          }
        </zn-message>
      }
      @if (zone().etat === 'hors') {
        <section class="boussole">
          <span class="aiguille" aria-hidden="true">
            <svg viewBox="0 0 24 24" [style.transform]="'rotate(' + capHors() + 'deg)'">
              <path d="M12 3.5l5 15-5-3.6-5 3.6z" />
            </svg>
          </span>
          <span class="texte">
            <span class="kicker">{{ kicker() }}</span>
            <strong>{{ monument.hasValue() ? monument.value().nom : '' }}</strong>
            <span class="trajet">{{ trajet() }}</span>
          </span>
        </section>
      } @else {
        <section class="monument">
          @if (monument.hasValue()) {
            <p class="kicker">{{ kicker() }} · {{ monument.value().ville.nom }}</p>
            <h1>{{ monument.value().nom }}</h1>
          } @else {
            <h1>Prendre la photo</h1>
          }
          <p class="consigne" role="status">
            {{ envoi() ? 'Envoi en cours…' : 'Cadre le monument entier, puis déclenche.' }}
          </p>
        </section>
      }
    </div>
    @if (!cameraRefusee()) {
      <footer class="pied">
        @if (photo && refus()?.remplacer) {
          <button
            type="button"
            class="action"
            data-remplacer
            [disabled]="envoi()"
            (click)="reessayer()"
          >
            {{ envoi() ? 'Envoi en cours…' : 'Remplacer la photo' }}
          </button>
        } @else if (photo && refus()?.reessayer) {
          <button
            type="button"
            class="action"
            data-reessayer
            [disabled]="envoi()"
            (click)="reessayer()"
          >
            {{ envoi() ? 'Envoi en cours…' : 'Réessayer' }}
          </button>
        } @else {
          <a class="carnet" routerLink="/carnet" aria-label="Ouvrir le carnet">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <g fill="none" stroke="currentColor">
                <circle cx="60" cy="60" r="54" stroke-width="5" />
                <circle cx="60" cy="60" r="34" stroke-width="3" />
              </g>
            </svg>
          </a>
          <button
            type="button"
            class="declencheur"
            data-prendre
            [attr.aria-label]="
              verrouille()
                ? 'Déclencheur verrouillé : rapproche-toi à moins de ' + rayon() + ' mètres'
                : 'Prendre la photo'
            "
            [attr.aria-disabled]="verrouille() || null"
            [attr.aria-describedby]="verrouille() ? 'aide-declencheur' : null"
            [disabled]="envoi() || !pret()"
            (click)="verrouille() || prendre()"
          >
            @if (verrouille()) {
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            } @else {
              <span aria-hidden="true"></span>
            }
          </button>
          @if (plusieursCameras()) {
            <button
              type="button"
              class="rond rond-droit"
              aria-label="Changer de caméra"
              (click)="changerCamera()"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <path d="M9.5 12.5a2.5 2.5 0 0 1 4.6-1.3M14.5 13.5a2.5 2.5 0 0 1-4.6 1.3" />
              </svg>
            </button>
          }
          @if (verrouille()) {
            <p class="aide" id="aide-declencheur">{{ aide() }}</p>
          }
        }
      </footer>
    }
  `,
  imports: [ZnMessage, RouterLink, AutoriserCamera],
  styleUrl: './camera.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Camera implements OnInit {
  readonly numero = input.required<string>();
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly pos = inject(Position);
  private readonly position = inject(Position).etat;
  private flux: MediaStream | null = null;
  protected readonly feuille = signal(false);
  protected readonly cameraRefusee = signal(false);
  protected readonly pret = signal(false);
  protected readonly envoi = signal(false);
  protected readonly refus = signal<Refus | null>(null);
  protected readonly flash = signal(false);
  protected readonly torcheDispo = signal(false);
  protected readonly torche = signal(false);
  protected readonly plusieursCameras = signal(false);
  private face: 'environment' | 'user' = 'environment';
  protected readonly monument = httpResource<Monument>(
    () => `/api/catalogue/monuments/${this.numero()}`,
  );
  protected readonly raretes = { COMMUN: 'COMMUN', RARE: 'RARE', LEGENDAIRE: 'LÉGENDAIRE' };
  protected readonly numero3 = (n: number) => String(n).padStart(3, '0');
  private readonly distance = computed(() => {
    const coords = this.position().coords;
    const m = this.monument.hasValue() ? this.monument.value() : undefined;
    return coords && m ? distanceMetres(coords, m.position) : null;
  });
  protected readonly rayon = computed(() =>
    this.monument.hasValue() ? this.monument.value().rayonCaptureMetres : 0,
  );
  /** Statut de zone calculé sur l'appareil, en direct (RG-036) : mêmes seuils que le bouton central. */
  protected readonly zone = computed(() => {
    const coords = this.position().coords;
    const distance = this.distance();
    if (!coords || distance === null)
      return { etat: 'inconnue', texte: 'Position en cours…', annonce: '' };
    const d = formaterDistance(distance);
    if (distance > this.rayon())
      return { etat: 'hors', texte: `Hors zone · ${d}`, annonce: 'Hors zone' };
    if (coords.precision === undefined || coords.precision > PRECISION_MAX_METRES)
      return {
        etat: 'imprecis',
        texte: 'Position imprécise',
        annonce: 'Position imprécise, réessaie à découvert',
      };
    return { etat: 'dans', texte: `Dans la zone · ${d}`, annonce: 'Dans la zone' };
  });
  protected readonly verrouille = computed(() => this.zone().etat === 'hors');
  protected readonly kicker = computed(() => {
    if (!this.monument.hasValue()) return '';
    const m = this.monument.value();
    return `N°${this.numero3(m.numero)} · ${this.raretes[m.rarete]}`;
  });
  /** Cap boussole hors zone : calculé depuis la position, sans capteur d'orientation. */
  protected readonly capHors = computed(() => {
    const coords = this.position().coords;
    return coords && this.monument.hasValue() ? capVers(coords, this.monument.value().position) : 0;
  });
  protected readonly trajet = computed(() => {
    const d = this.distance() ?? 0;
    const pied = dureeAPied(d);
    return `${formaterDistance(d)} au ${POINTS[Math.round(this.capHors() / 45) % 8]}${pied ? ` · ${pied}` : ''}`;
  });
  protected readonly aide = computed(() => {
    const reste = formaterDistance(Math.max(0, (this.distance() ?? 0) - this.rayon()));
    return `Le déclencheur s'active à ${this.rayon()} m · encore ${reste}`;
  });
  /** Cap vers le monument après « trop loin », comme la fiche (#39) ; sans flèche si le monument est illisible. */
  protected readonly cap = computed(() => {
    const coords = this.position().coords;
    const m = this.monument.hasValue() ? this.monument.value() : undefined;
    return this.refus()?.distance !== undefined && coords && m ? capVers(coords, m.position) : null;
  });
  protected readonly point = computed(() => POINTS[Math.round((this.cap() ?? 0) / 45) % 8]);
  /** Reste en mémoire pour « Réessayer » ; perdue avec l'écran (RG-057, R1-82). */
  protected photo: Blob | null = null;
  /** Ouverte depuis la fiche, ou après `deja-capture` : les envois remplacent la photo, sans récompense. */
  private remplacement = history.state?.remplacer === true;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.flux?.getTracks().forEach((t) => t.stop()));
  }

  /** Atteint depuis « Aller le tamponner » : sans permission déjà accordée, la feuille O3 précède la demande système (RG-026). */
  async ngOnInit(): Promise<void> {
    const etat = await navigator.permissions
      ?.query({ name: 'camera' as PermissionName })
      .then((p) => p.state)
      .catch(() => null); // Safari/Firefox : pas de permission « camera » interrogeable
    if (etat === 'granted') return this.ouvrir();
    this.feuille.set(true);
  }

  protected plusTard(): void {
    this.feuille.set(false);
    void this.router.navigate(['/monument', this.numero()]);
  }

  protected async ouvrir(): Promise<void> {
    this.feuille.set(false);
    this.flux?.getTracks().forEach((t) => t.stop());
    this.torche.set(false);
    try {
      this.flux = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.face },
        audio: false,
      });
    } catch {
      this.cameraRefusee.set(true);
      this.refus.set({
        texte:
          'Zonumental a besoin de la caméra pour tamponner. Autorise-la dans les réglages de ton navigateur, puis reviens.',
        reessayer: false,
      });
      return;
    }
    // le <video> existe après le prochain rendu
    queueMicrotask(() => {
      const v = this.video()?.nativeElement;
      if (v) v.srcObject = this.flux;
    });
    this.pret.set(true);
    // flash et changement de caméra : masqués si le navigateur ne les gère pas
    this.torcheDispo.set(
      !!(this.piste()?.getCapabilities?.() as { torch?: boolean } | undefined)?.torch,
    );
    const peripheriques = (await navigator.mediaDevices.enumerateDevices?.().catch(() => [])) ?? [];
    this.plusieursCameras.set(peripheriques.filter((d) => d.kind === 'videoinput').length > 1);
  }

  private piste = () => this.flux?.getVideoTracks?.()[0];

  protected async basculerTorche(): Promise<void> {
    const allumee = !this.torche();
    await this.piste()
      ?.applyConstraints({ advanced: [{ torch: allumee } as MediaTrackConstraintSet] })
      .then(() => this.torche.set(allumee))
      .catch(() => this.torcheDispo.set(false));
  }

  protected changerCamera(): Promise<void> {
    this.face = this.face === 'environment' ? 'user' : 'environment';
    return this.ouvrir();
  }

  protected async prendre(): Promise<void> {
    if (this.envoi()) return;
    const coords = this.position().coords; // lue au moment de la prise (RG-027)
    const v = this.video()?.nativeElement;
    if (!coords || !v) return this.sansPosition();
    this.envoi.set(true);
    this.refus.set(null);
    this.flash.set(true);
    setTimeout(() => this.flash.set(false), 200);
    try {
      const [l, h] = dimensionsReduites(v.videoWidth, v.videoHeight);
      const canvas = document.createElement('canvas');
      canvas.width = l;
      canvas.height = h;
      canvas.getContext('2d')?.drawImage(v, 0, 0, l, h);
      let photo = await enBlob(canvas, 0.85);
      if (photo && photo.size >= OCTETS_MAX) photo = await enBlob(canvas, 0.6);
      if (!photo || photo.size >= OCTETS_MAX) throw new Error('photo');
      this.photo = photo;
    } catch {
      this.refus.set({ texte: 'La capture a échoué. Réessaie.', reessayer: false });
      this.envoi.set(false);
      return;
    }
    await this.envoyer(coords);
  }

  /** Même photo, position relue (jamais celle d'avant : RG-057). */
  protected async reessayer(): Promise<void> {
    if (this.envoi()) return;
    this.remplacement ||= !!this.refus()?.remplacer;
    this.envoi.set(true);
    this.refus.set(null);
    const coords = await this.pos.relire();
    if (!coords) {
      this.envoi.set(false);
      return this.sansPosition(true);
    }
    await this.envoyer(coords);
  }

  private sansPosition(reessayer = false): void {
    this.refus.set({
      texte:
        'Zonumental a besoin de ta position pour tamponner. Active-la dans les réglages, puis réessaie.',
      reessayer,
    });
  }

  private async envoyer(coords: { latitude: number; longitude: number; precision?: number }) {
    this.envoi.set(true);
    try {
      const r = await this.api.invoke(capturer, {
        body: {
          numero: Number(this.numero()),
          latitude: coords.latitude,
          longitude: coords.longitude,
          precisionMetres: coords.precision ?? 0,
          photo: this.photo!,
          ...(this.remplacement && { remplacer: true }),
        },
      });
      // la fiche joue l'animation du tampon (r1-capturer-17), sauf remplacement : pas de récompense
      await this.router.navigate(
        ['/monument', this.numero()],
        this.remplacement ? undefined : { state: { capture: true, succes: r?.succesGagnes ?? [] } },
      );
    } catch (e) {
      const refus = refusDe(e);
      if (refus && !refus.reessayer && !refus.remplacer) this.photo = null;
      this.refus.set(refus);
      this.envoi.set(false);
    }
  }
}
