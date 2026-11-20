import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Proximite, dureeAPied, formaterDistance } from '../../core/position/proximite';
import {
  ENCRE_PAR_RARETE,
  FORME_PAR_TYPE,
  contenuTampon,
  etiquetteTampon,
} from '../../shared/ui/tampon-monument';
import { ZnBientotEtat } from '../../shared/ui/bientot-etat';
import { ZnTampon } from '../../shared/ui/tampon';
import { libelle, pourcentage, rayon } from './calque';
import { FOND_CARTE, FondCarte } from './fond-carte';
import { lireCouleurs, styleCarte } from './style-carte';

const ZOOM_INITIAL = 12;
const PARIS: [number, number] = [2.32, 48.86]; // décalé à l'ouest : Eiffel et Louvre tiennent dans 390 px
const LIMITES_PARIS: [[number, number], [number, number]] = [
  [2.0, 48.7],
  [2.7, 49.0],
];
const RARETES = { COMMUN: 'Commun', RARE: 'Rare', LEGENDAIRE: 'Légendaire' };
const ECHELLES = ['Paris', 'France'] as const;

/** Carte de Paris : fond MapLibre, brouillard et épingles en calque Angular (ADR 0023). */
@Component({
  selector: 'app-carte',
  imports: [RouterLink, ZnBientotEtat, ZnTampon],
  template: `
    <div class="canevas" #canevas></div>
    @if (echelle() === 'Paris') {
      @if (repli()) {
        <p class="repli" role="status">
          Ta carte a besoin de WebGL, que ce navigateur n'offre pas. Retrouve tes monuments dans ton
          carnet.
        </p>
      }
      <svg class="brouillard" aria-hidden="true" focusable="false">
        <defs>
          <filter id="zn-flou-carte"><feGaussianBlur stdDeviation="14" /></filter>
          <mask id="zn-masque-carte">
            <rect class="plein" width="100%" height="100%" />
            <g filter="url(#zn-flou-carte)">
              @for (z of zones(); track z.numero) {
                <circle class="trou" [attr.cx]="z.x" [attr.cy]="z.y" [attr.r]="rayonPx()" />
              }
            </g>
          </mask>
        </defs>
        <rect class="voile" width="100%" height="100%" mask="url(#zn-masque-carte)" />
      </svg>
      <ul class="epingles" aria-label="Monuments de Paris">
        @for (p of epingles(); track p.m.numero) {
          <li [style.transform]="'translate(' + p.x + 'px,' + p.y + 'px)'">
            <button
              type="button"
              [class.obtenu]="p.obtenu"
              [attr.aria-pressed]="choisi() === p.m.numero"
              [attr.aria-label]="p.obtenu ? null : p.etiquette"
              (click)="choisir(p.m.numero)"
            >
              @if (p.obtenu) {
                <zn-tampon
                  [forme]="p.forme"
                  [encre]="p.encre"
                  [contenu]="p.contenu"
                  [etiquette]="p.etiquette"
                />
              } @else {
                <span class="num">{{ p.numero }}</span>
              }
            </button>
          </li>
        }
      </ul>
      @if (point(); as pt) {
        <svg class="position" aria-hidden="true" focusable="false">
          <g class="repere" [attr.transform]="'translate(' + pt.x + ' ' + pt.y + ')'">
            <circle class="halo" r="20" />
            <circle class="centre" r="7.5" />
          </g>
        </svg>
        <button
          type="button"
          class="recentrer"
          aria-label="Recentrer sur ma position"
          (click)="recentrer()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="6.5" />
            <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
          </svg>
        </button>
      }
    }
    <header>
      <div class="onglets" role="tablist" aria-label="Échelle de la carte">
        @for (e of echelles; track e) {
          <button
            type="button"
            role="tab"
            [id]="'echelle-' + e"
            [attr.aria-selected]="echelle() === e"
            [attr.aria-controls]="'panneau-carte'"
            [attr.tabindex]="echelle() === e ? 0 : -1"
            (click)="echelle.set(e)"
            (keydown)="clavier($event)"
          >
            {{ e }}
          </button>
        }
      </div>
      @if (echelle() === 'Paris') {
        <p class="pastille"><span class="point"></span>Paris dévoilé à {{ pct() }} %</p>
      }
    </header>
    <div id="panneau-carte" role="tabpanel" [attr.aria-labelledby]="'echelle-' + echelle()">
      @if (echelle() === 'France') {
        <zn-bientot-etat class="bientot" sujet="Carte de France" />
      }
    </div>
    @if (echelle() === 'Paris' && !selection() && procheAffiche(); as p) {
      <a class="proche" [routerLink]="['/monument', p.numero]">
        @if (p.image; as img) {
          <img [src]="img.url" alt="" />
        } @else {
          <span class="vignette"></span>
        }
        <span class="texte">
          <span class="num">{{ libelleDe(p) }} · {{ p.rareteLibelle }} · À découvrir</span>
          <strong>{{ p.nom }}</strong>
          <span class="distance">{{ p.distanceLibelle }}</span>
        </span>
        <span class="aller">Y aller</span>
      </a>
    }
    @if (selection(); as s) {
      <div class="selection">
        <a [routerLink]="['/monument', s.numero]">
          <span class="num">{{ libelleDe(s) }}</span>
          <strong>{{ s.nom }}</strong>
          <span class="voir">Voir la fiche</span>
        </a>
      </div>
    }
    <p class="attribution">
      ©
      <a href="https://www.openstreetmap.org/copyright" rel="noopener"
        >OpenStreetMap contributors</a
      >
      · <a href="https://openfreemap.org" rel="noopener">OpenFreeMap</a> ·
      <a href="https://openmaptiles.org" rel="noopener">OpenMapTiles</a>
    </p>
  `,
  styleUrl: './carte.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Carte {
  private readonly creer = inject(FOND_CARTE);
  private readonly proximite = inject(Proximite);
  private readonly monuments = this.proximite.monuments;
  private readonly canevas = viewChild.required<ElementRef<HTMLElement>>('canevas');

  protected readonly echelles = ECHELLES;
  protected readonly echelle = signal<(typeof ECHELLES)[number]>('Paris');
  protected readonly repli = signal(false);
  protected readonly choisi = signal<number | null>(null);
  protected readonly libelleDe = libelle;

  private readonly fond = signal<FondCarte | null>(null);
  private readonly mouvement = signal(0); // incrémenté à chaque `move` : repositionne le calque

  private readonly deParis = computed(() =>
    this.monuments().filter((m) => m.ville.nom === 'Paris'),
  );
  protected readonly pct = computed(() => pourcentage(this.monuments(), 'Paris'));
  protected readonly rayonPx = computed(() => {
    this.mouvement();
    return rayon(this.fond()?.getZoom() ?? ZOOM_INITIAL, ZOOM_INITIAL);
  });
  private readonly projetes = computed(() => {
    this.mouvement();
    const fond = this.fond();
    if (!fond) return [];
    return this.deParis().map((m) => ({
      m,
      ...fond.project([m.position.longitude, m.position.latitude]),
    }));
  });
  protected readonly zones = computed(() =>
    this.projetes()
      .filter((p) => p.m.captureeLe !== null)
      .map((p) => ({ numero: p.m.numero, x: p.x, y: p.y })),
  );
  protected readonly epingles = computed(() =>
    this.projetes().map((p) => {
      const obtenu = p.m.captureeLe !== null;
      return {
        ...p,
        obtenu,
        numero: String(p.m.numero).padStart(3, '0'),
        etiquette: obtenu ? etiquetteTampon(p.m) : libelle(p.m),
        forme: FORME_PAR_TYPE[p.m.type],
        encre: ENCRE_PAR_RARETE[p.m.rarete],
        contenu: obtenu ? contenuTampon(p.m) : { haut: '', centre: '', bas: '' },
      };
    }),
  );
  /** Position en mémoire seulement, jamais copiée ailleurs (RG-036). */
  private readonly coords = computed(() => {
    const { statut, coords } = this.proximite.position.etat();
    return statut === 'ok' ? (coords ?? null) : null;
  });
  protected readonly point = computed(() => {
    this.mouvement();
    const c = this.coords();
    return c ? this.fond()?.project([c.longitude, c.latitude]) : undefined;
  });
  protected readonly procheAffiche = computed(() => {
    const p = this.proximite.plusProche();
    if (!p) return null;
    const duree = dureeAPied(p.distance);
    return {
      ...p,
      rareteLibelle: RARETES[p.rarete],
      distanceLibelle: formaterDistance(p.distance) + (duree ? ` · ${duree}` : ''),
    };
  });
  protected readonly selection = computed(
    () => this.deParis().find((m) => m.numero === this.choisi()) ?? null,
  );

  constructor() {
    const detruit = inject(DestroyRef);
    let fond: FondCarte | undefined;
    let fini = false;
    detruit.onDestroy(() => {
      fini = true;
      fond?.remove();
    });
    afterNextRender(() => {
      const reduit = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      this.creer({
        conteneur: this.canevas().nativeElement,
        style: styleCarte(lireCouleurs()),
        centre: PARIS,
        zoom: ZOOM_INITIAL,
        limites: LIMITES_PARIS,
        zoomMin: 10,
        zoomMax: 17,
        reduit,
      })
        .then((f) => {
          if (fini) return f.remove();
          fond = f;
          f.on('move', () => this.mouvement.update((n) => n + 1));
          this.fond.set(f);
        })
        .catch(() => this.repli.set(true)); // sans WebGL : message, pas d'erreur
    });
  }

  protected recentrer(): void {
    const c = this.coords();
    if (c) this.fond()?.centrer([c.longitude, c.latitude]);
  }

  protected choisir(numero: number): void {
    this.choisi.update((n) => (n === numero ? null : numero));
  }

  /** Flèches gauche/droite entre onglets (motif WAI-ARIA). */
  protected clavier(e: KeyboardEvent): void {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const suivant = this.echelles.find((x) => x !== this.echelle())!;
    this.echelle.set(suivant);
    (e.currentTarget as HTMLElement).parentElement
      ?.querySelector<HTMLElement>(`#echelle-${suivant}`)
      ?.focus();
  }
}
