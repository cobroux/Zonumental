import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaCollection } from '../../core/api/models/ma-collection';
import { MonumentResume } from '../../core/api/models/monument-resume';
import { ZnIcone } from '../../shared/ui/icone';
import { ZnMessage } from '../../shared/ui/message';
import { placement } from '../../shared/ui/placement';
import { ZnPlanche } from '../../shared/ui/planche';
import { SILHOUETTE } from '../../shared/ui/silhouettes';
import { ZnTampon } from '../../shared/ui/tampon';
import {
  ENCRE_PAR_RARETE,
  FORME_PAR_TYPE,
  contenuTampon,
  etiquetteTampon,
} from '../../shared/ui/tampon-monument';
import { pourcent } from './collections';

/** Mêmes seuils et pages que le carnet (spec fidélité §4.2) : 6 par page sous 6 tampons, 12 ensuite. */
const SEUIL_DENSE = 6;
const PAGE_AEREE = 6;
const PAGE_DENSE = 12;
const MAX_PUCES = 7;
const ARC_MAX = 34;

/** Détail d'une collection : la planche du carnet, paginée, avec la silhouette de leur type pour les cases vides. */
@Component({
  selector: 'app-collection',
  imports: [RouterLink, ZnIcone, ZnMessage, ZnPlanche, ZnTampon],
  template: `
    <header>
      <a class="retour" routerLink="/carnet/collections" aria-label="Retour">
        <zn-icone nom="retour" />
      </a>
      <span class="rubrique">COLLECTION</span>
    </header>
    @if (collections.error() || monuments.error()) {
      <h1 tabindex="-1">Collection</h1>
      <zn-message type="erreur">
        Collection indisponible.
        <button type="button" (click)="recharger()">Réessayer</button>
      </zn-message>
    } @else if (!collections.hasValue() || !monuments.hasValue()) {
      <h1 tabindex="-1">Collection</h1>
      <p class="zn-sr" role="status">Chargement de la collection</p>
      <zn-planche titre="Chargement de la collection" [aere]="true">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <li class="fantome"></li>
        }
      </zn-planche>
    } @else if (collection(); as c) {
      <h1 tabindex="-1">{{ c.nom }}</h1>
      <p class="bilan">{{ c.captures }} monuments sur {{ c.total }} · {{ pourcent(c) }} %</p>
      <progress
        aria-hidden="true"
        [class.complete]="c.complete"
        [value]="c.captures"
        [max]="c.total"
      ></progress>
      @if (c.complete) {
        <zn-tampon
          class="complete-tampon"
          forme="cercle"
          encre="legendaire"
          [contenu]="contenuComplete()"
          [etiquette]="'Collection complète, ' + c.total + ' sur ' + c.total"
        />
      }
      <p class="etiquette" aria-live="polite">{{ libellePage() }}</p>
      <zn-planche
        [titre]="c.nom + ', page ' + pageAffichee() + ' sur ' + nbPages()"
        [aere]="aere()"
      >
        @for (x of cellules(); track x.numero) {
          <li>
            @if (x.captureeLe) {
              <a class="tampon" [routerLink]="['/monument', x.numero]">
                <zn-tampon
                  class="pose"
                  [class.aere]="aere()"
                  [style]="pose(x.numero)"
                  [forme]="forme(x)"
                  [encre]="encre(x)"
                  [contenu]="contenu(x)"
                  [etiquette]="etiquette(x)"
                />
              </a>
            } @else {
              <a
                class="vide"
                [class.aere]="aere()"
                [routerLink]="['/monument', x.numero]"
                [attr.aria-label]="numero(x) + ', à découvrir'"
              >
                <svg class="silhouette" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                  <path [attr.d]="silhouette(x)" fill-rule="evenodd" />
                </svg>
                <span class="num">{{ numero(x) }}</span>
              </a>
            }
          </li>
        }
        @if (nbPages() > 1) {
          <nav pied class="pages" [attr.aria-label]="'Pages de ' + c.nom">
            <button
              type="button"
              aria-label="Page précédente"
              [attr.aria-disabled]="pageAffichee() === 1 ? 'true' : null"
              (click)="aller(-1)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            @if (nbPages() <= maxPuces) {
              <span class="puces" aria-hidden="true">
                @for (n of numerosPages(); track n) {
                  <span [class.courante]="n === pageAffichee()"></span>
                }
              </span>
            }
            <button
              type="button"
              aria-label="Page suivante"
              [attr.aria-disabled]="pageAffichee() === nbPages() ? 'true' : null"
              (click)="aller(1)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </nav>
        }
      </zn-planche>
    } @else {
      <h1 tabindex="-1">Cette collection n’existe pas ou n’est pas encore ouverte</h1>
      <a class="lien" routerLink="/carnet/collections">Retour aux collections</a>
    }
  `,
  styleUrls: ['../coquille.css', './planche-cellules.css', './collection.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Collection {
  readonly code = input.required<string>();
  private readonly injector = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly collections = httpResource<MaCollection[]>(
    () => '/api/progression/collections',
  );
  protected readonly monuments = httpResource<MonumentResume[]>(() => '/api/catalogue/monuments');
  protected readonly pourcent = pourcent;
  protected readonly maxPuces = MAX_PUCES;
  private readonly numPage = signal(1);

  /** Une collection sans capture n'est pas encore ouverte (RG-R2-07). */
  protected readonly collection = computed(() =>
    this.collections.hasValue()
      ? this.collections.value().find((c) => c.code === this.code() && c.captures > 0)
      : undefined,
  );
  private readonly parNumero = computed(
    () =>
      new Map((this.monuments.hasValue() ? this.monuments.value() : []).map((x) => [x.numero, x])),
  );
  private readonly liste = computed(() =>
    (this.collection()?.monuments ?? [])
      .map((r) => this.parNumero().get(r.numero))
      .filter((x): x is MonumentResume => !!x)
      .sort((a, b) => a.numero - b.numero),
  );
  /** Densité selon les tampons du joueur au total, comme le carnet. */
  protected readonly aere = computed(
    () => [...this.parNumero().values()].filter((x) => x.captureeLe).length < SEUIL_DENSE,
  );
  private readonly taillePage = computed(() => (this.aere() ? PAGE_AEREE : PAGE_DENSE));
  protected readonly nbPages = computed(() =>
    Math.max(1, Math.ceil(this.liste().length / this.taillePage())),
  );
  protected readonly pageAffichee = computed(() => Math.min(this.numPage(), this.nbPages()));
  protected readonly numerosPages = computed(() =>
    Array.from({ length: this.nbPages() }, (_, i) => i + 1),
  );
  protected readonly cellules = computed(() => {
    const debut = (this.pageAffichee() - 1) * this.taillePage();
    return this.liste().slice(debut, debut + this.taillePage());
  });
  protected readonly libellePage = computed(
    () =>
      `Page ${this.pageAffichee()}${this.nbPages() > 1 ? ` / ${this.nbPages()}` : ''} — ${this.collection()?.nom}`,
  );
  protected readonly contenuComplete = computed(() => {
    const c = this.collection();
    const nom = (c?.nom ?? '').toLocaleUpperCase('fr-FR');
    const debut = 'COLLECTION COMPLÈTE · ';
    const place = ARC_MAX - debut.length - 2;
    return {
      haut: `${debut}${nom.length > place ? `${nom.slice(0, place - 1)}…` : nom} ·`,
      centre: 'COMPLÈTE',
      bas: `${c?.total} / ${c?.total}`,
    };
  });

  constructor() {
    // le h1 définitif remplace celui du chargement : on y ramène le focus
    effect(() => {
      if (this.collections.hasValue() && this.monuments.hasValue())
        afterNextRender(() => this.hote.querySelector<HTMLElement>('h1')?.focus(), {
          injector: this.injector,
        });
    });
  }

  protected recharger() {
    this.collections.reload();
    this.monuments.reload();
  }
  protected aller(sens: number) {
    this.numPage.set(Math.min(this.nbPages(), Math.max(1, this.pageAffichee() + sens)));
  }
  protected numero(x: MonumentResume) {
    return `N°${String(x.numero).padStart(3, '0')}`;
  }
  protected forme(x: MonumentResume) {
    return FORME_PAR_TYPE[x.type];
  }
  protected encre(x: MonumentResume) {
    return ENCRE_PAR_RARETE[x.rarete];
  }
  protected contenu(x: MonumentResume) {
    return contenuTampon(x);
  }
  protected etiquette(x: MonumentResume) {
    return etiquetteTampon(x);
  }
  protected silhouette(x: MonumentResume) {
    return SILHOUETTE[x.type];
  }
  protected pose(numero: number) {
    const { rotation, dx, dy } = placement(numero);
    return `--rot: ${rotation}deg; --dx: ${dx}%; --dy: ${dy}%`;
  }
}
