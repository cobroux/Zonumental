import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  untracked,
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
import { ZnMessage } from '../../shared/ui/message';
import { ZnBientotEtat } from '../../shared/ui/bientot-etat';
import { ZnTampon } from '../../shared/ui/tampon';
import { libelle, pourcentage, rayon } from './calque';
import { FOND_CARTE, FondCarte } from './fond-carte';
import {
  CalculItineraire,
  SEUIL_ECART_M,
  ecarte,
  ecartMetres,
  lienRepli,
  resume,
} from './itineraire';
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
  imports: [RouterLink, ZnBientotEtat, ZnMessage, ZnTampon],
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
      <div class="selection" #selectionZone tabindex="-1">
        <a [routerLink]="['/monument', s.numero]">
          <span class="num">{{ libelleDe(s) }}</span>
          <strong>{{ s.nom }}</strong>
          <span class="voir">Voir la fiche</span>
        </a>
        @if (mention()) {
          <p class="mention">
            Ta position arrondie (~10 m) est envoyée à notre serveur pour calculer le trajet. Elle
            n'est pas conservée.
            <a routerLink="/confidentialite">Politique de confidentialité</a>
          </p>
        }
        @if (positionRefusee()) {
          <zn-message type="erreur">
            Active ta position pour obtenir un itinéraire.
            <a [href]="lienOsm(s)" target="_blank" rel="noopener noreferrer"
              >Ouvrir dans OpenStreetMap</a
            >
          </zn-message>
        }
        @if (erreur(); as e) {
          <zn-message type="erreur">
            {{ e.texte }}
            @if (e.repli) {
              <a [href]="lienOsm(s)" target="_blank" rel="noopener noreferrer"
                >Ouvrir dans OpenStreetMap</a
              >
            }
          </zn-message>
        }
        <div class="actions">
          @if (mention()) {
            <button type="button" class="action" (click)="confirmer()">Calculer</button>
          } @else {
            <button
              #boutonItineraire
              type="button"
              class="action"
              [disabled]="calcul.etat().statut === 'chargement'"
              [attr.aria-busy]="calcul.etat().statut === 'chargement' || null"
              (click)="lancer()"
            >
              {{ calcul.etat().statut === 'chargement' ? 'Calcul…' : 'Itinéraire' }}
            </button>
          }
          @if (trajet()) {
            <button type="button" class="action secondaire" (click)="effacer()">
              Effacer l'itinéraire
            </button>
          }
        </div>
        @if (trajet(); as t) {
          <p class="resume" role="status">{{ t.resume }}</p>
          <p class="ecart" role="status">
            @if (ecart()) {
              Tu t'es écarté de l'itinéraire
            }
          </p>
          @if (ecart()) {
            <button type="button" class="action" (click)="recalculer()">Recalculer</button>
          }
          <details class="etapes">
            <summary>Étapes ({{ t.etapes.length }})</summary>
            <ol>
              @for (e of t.etapes; track $index) {
                <li>{{ e.instruction }} · {{ e.distance }}</li>
              }
            </ol>
          </details>
        }
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
  private readonly zoneSelection = viewChild<ElementRef<HTMLElement>>('selectionZone');
  private readonly boutonItineraire = viewChild<ElementRef<HTMLButtonElement>>('boutonItineraire');
  protected readonly calcul = inject(CalculItineraire);

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
  // Mention RGPD (Q-43, provisoire) : en mémoire du composant seulement, jamais de stockage (RG-036).
  private readonly mentionVue = signal(false);
  protected readonly mention = signal(false);
  private readonly attentePosition = signal(false);
  protected readonly positionRefusee = computed(() => {
    const { statut } = this.proximite.position.etat();
    return this.attentePosition() && (statut === 'refus' || statut === 'indisponible');
  });
  protected readonly erreur = computed(() => {
    const e = this.calcul.etat();
    return e.statut === 'erreur' ? e : null;
  });
  protected readonly trajet = computed(() => {
    const e = this.calcul.etat();
    if (e.statut !== 'ok') return null;
    return {
      resume: resume(e.itineraire),
      etapes: e.itineraire.etapes.map((x) => ({
        instruction: x.instruction,
        distance: formaterDistance(x.distanceMetres),
      })),
    };
  });
  /** Écart au tracé (> 50 m, hystérésis) ; évalué seulement tant qu'un itinéraire est affiché. */
  protected readonly ecart = signal(false);
  protected readonly lienOsm = (m: { position: { latitude: number; longitude: number } }) =>
    lienRepli(m.position);
  protected readonly selection = computed(
    () => this.deParis().find((m) => m.numero === this.choisi()) ?? null,
  );

  constructor() {
    effect(() => {
      const e = this.calcul.etat();
      const fond = this.fond();
      if (!fond) return;
      if (e.statut === 'ok') fond.tracer(e.itineraire.trace);
      else fond.effacer();
    });
    // suivi : calcul local pur, aucune requête ; s'arrête avec l'itinéraire (effacer, monument, destruction)
    effect(() => {
      const e = this.calcul.etat();
      const c = this.coords();
      if (e.statut !== 'ok') return this.ecart.set(false);
      if (!c || (c.precision ?? 0) > SEUIL_ECART_M) return; // lecture trop imprécise : on ne conclut pas
      this.ecart.update((d) => ecarte(d, ecartMetres(c, e.itineraire.trace)));
    });
    // la position demandée au clic arrive : le calcul peut partir
    effect(() => {
      const c = this.coords();
      if (c && untracked(this.attentePosition)) untracked(() => this.demarrerCalcul(c));
    });
    const detruit = inject(DestroyRef);
    let fond: FondCarte | undefined;
    let fini = false;
    detruit.onDestroy(() => {
      this.calcul.effacer(); // itinéraire et position ne survivent pas à l'écran (RG-036)
      fini = true;
      fond?.remove();
    });
    afterNextRender(() => {
      const couleurs = lireCouleurs();
      const reduit = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      this.creer({
        conteneur: this.canevas().nativeElement,
        style: styleCarte(couleurs),
        couleurItineraire: couleurs.itineraire,
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

  /** Premier clic : mention d'information, puis calcul (geste utilisateur : ADR 0020). */
  protected lancer(): void {
    if (this.mentionVue()) this.confirmer();
    else this.mention.set(true);
  }

  protected confirmer(): void {
    this.mentionVue.set(true);
    this.mention.set(false);
    const c = this.coords();
    if (c) return this.demarrerCalcul(c);
    this.attentePosition.set(true);
    if (this.proximite.position.etat().statut === 'attente') this.proximite.position.activer();
  }

  private demarrerCalcul(c: { latitude: number; longitude: number }): void {
    this.attentePosition.set(false);
    const n = this.choisi();
    if (n !== null) void this.calcul.calculer(n, c);
  }

  protected recalculer(): void {
    const c = this.coords();
    if (!c) return;
    // le bouton disparaît pendant le calcul : le focus reste dans la zone de sélection
    this.zoneSelection()?.nativeElement.focus();
    this.demarrerCalcul(c);
  }

  protected effacer(): void {
    this.reinitialiser();
    // « Effacer » disparaît avec la liste : le focus revient au bouton « Itinéraire »
    this.boutonItineraire()?.nativeElement.focus();
  }

  private reinitialiser(): void {
    this.calcul.effacer();
    this.mention.set(false);
    this.attentePosition.set(false);
  }

  protected choisir(numero: number): void {
    this.reinitialiser();
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
