import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Api } from '../../core/api/api';
import { capturer } from '../../core/api/fn/capture/capturer';
import { Position } from '../../core/position/position';

const COTE_LONG_MAX = 1600;
const OCTETS_MAX = 5_000_000;

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
    @if (probleme(); as p) {
      <p role="alert">{{ p }}</p>
    }
    @if (!cameraRefusee()) {
      <video #video autoplay playsinline muted aria-label="Aperçu de la caméra"></video>
      <button type="button" data-prendre [disabled]="envoi() || !pret()" (click)="prendre()">
        {{ envoi() ? 'Envoi en cours…' : 'Prendre la photo' }}
      </button>
    }
  `,
  styles: 'video { inline-size: 100%; max-block-size: 70dvh; background: #000; }',
  styleUrl: '../coquille.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Camera implements OnInit {
  readonly numero = input.required<string>();
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly position = inject(Position).etat;
  private flux: MediaStream | null = null;
  protected readonly cameraRefusee = signal(false);
  protected readonly pret = signal(false);
  protected readonly envoi = signal(false);
  protected readonly probleme = signal('');

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
      this.probleme.set(
        'Zonumental a besoin de la caméra pour tamponner. Autorise-la dans les réglages de ton navigateur, puis reviens.',
      );
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
    if (!coords || !v) {
      this.probleme.set(
        'Zonumental a besoin de ta position pour tamponner. Active-la dans les réglages, puis réessaie.',
      );
      return;
    }
    this.envoi.set(true);
    this.probleme.set('');
    try {
      const [l, h] = dimensionsReduites(v.videoWidth, v.videoHeight);
      const canvas = document.createElement('canvas');
      canvas.width = l;
      canvas.height = h;
      canvas.getContext('2d')?.drawImage(v, 0, 0, l, h);
      let photo = await enBlob(canvas, 0.85);
      if (photo && photo.size >= OCTETS_MAX) photo = await enBlob(canvas, 0.6);
      if (!photo || photo.size >= OCTETS_MAX) throw new Error('photo');
      await this.api.invoke(capturer, {
        body: {
          numero: Number(this.numero()),
          latitude: coords.latitude,
          longitude: coords.longitude,
          precisionMetres: coords.precision ?? 0,
          photo,
        },
      });
      // r1-capturer-17 branchera l'animation ici
      await this.router.navigate(['/monument', this.numero()]);
    } catch {
      this.probleme.set('La capture a échoué. Réessaie.');
      this.envoi.set(false);
    }
  }
}
