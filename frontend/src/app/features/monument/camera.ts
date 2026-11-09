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
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api/api';
import { capturer } from '../../core/api/fn/capture/capturer';
import { Position } from '../../core/position/position';
import { POINTS, capVers } from '../../core/position/proximite';
import { ZnMessage } from '../../shared/ui/message';

const COTE_LONG_MAX = 1600;
const OCTETS_MAX = 5_000_000;

interface Refus {
  texte: string;
  reessayer: boolean;
  distance?: number;
  email?: boolean;
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
    <h1>Prendre la photo</h1>
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
    @if (!cameraRefusee()) {
      <video #video autoplay playsinline muted aria-label="Aperçu de la caméra"></video>
      @if (photo && refus()?.reessayer) {
        <button type="button" data-reessayer [disabled]="envoi()" (click)="reessayer()">
          {{ envoi() ? 'Envoi en cours…' : 'Réessayer' }}
        </button>
      } @else {
        <button type="button" data-prendre [disabled]="envoi() || !pret()" (click)="prendre()">
          {{ envoi() ? 'Envoi en cours…' : 'Prendre la photo' }}
        </button>
      }
    }
  `,
  imports: [ZnMessage, RouterLink],
  styles: 'video { inline-size: 100%; max-block-size: 70dvh; background: #000; }',
  styleUrl: '../coquille.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Camera implements OnInit {
  readonly numero = input.required<string>();
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly pos = inject(Position);
  private readonly position = inject(Position).etat;
  private flux: MediaStream | null = null;
  protected readonly cameraRefusee = signal(false);
  protected readonly pret = signal(false);
  protected readonly envoi = signal(false);
  protected readonly refus = signal<Refus | null>(null);
  protected readonly cap = signal<number | null>(null);
  protected readonly point = computed(() => POINTS[Math.round((this.cap() ?? 0) / 45) % 8]);
  /** Reste en mémoire pour « Réessayer » ; perdue avec l'écran (RG-057, R1-82). */
  protected photo: Blob | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.flux?.getTracks().forEach((t) => t.stop()));
  }

  /** Atteint depuis « Aller le tamponner » : c'est l'appui qui déclenche la demande caméra (RG-026). */
  async ngOnInit(): Promise<void> {
    try {
      this.flux = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
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
  }

  protected async prendre(): Promise<void> {
    if (this.envoi()) return;
    const coords = this.position().coords; // lue au moment de la prise (RG-027)
    const v = this.video()?.nativeElement;
    if (!coords || !v) return this.sansPosition();
    this.envoi.set(true);
    this.refus.set(null);
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
    this.cap.set(null);
    try {
      await this.api.invoke(capturer, {
        body: {
          numero: Number(this.numero()),
          latitude: coords.latitude,
          longitude: coords.longitude,
          precisionMetres: coords.precision ?? 0,
          photo: this.photo!,
        },
      });
      // r1-capturer-17 branchera l'animation ici
      await this.router.navigate(['/monument', this.numero()]);
    } catch (e) {
      const refus = refusDe(e);
      if (refus && !refus.reessayer) this.photo = null;
      this.refus.set(refus);
      this.envoi.set(false);
      if (refus?.distance !== undefined) this.orienter(coords);
    }
  }

  /** Cap vers le monument, comme la fiche (#39) ; sans flèche si le monument est illisible. */
  private orienter(coords: { latitude: number; longitude: number }): void {
    this.http
      .get<{ position: { latitude: number; longitude: number } }>(
        `/api/catalogue/monuments/${this.numero()}`,
      )
      .subscribe({
        next: (m) => this.cap.set(capVers(coords, m.position)),
        error: () => undefined,
      });
  }
}
