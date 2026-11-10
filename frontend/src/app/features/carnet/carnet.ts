import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MaCollection } from '../../core/api/models/ma-collection';
import { MonumentResume } from '../../core/api/models/monument-resume';
import { Rarete } from '../../core/api/models/rarete';
import { TypeMonument } from '../../core/api/models/type-monument';
import { Position } from '../../core/position/position';
import { distanceMetres } from '../../core/position/proximite';
import { ZnMessage } from '../../shared/ui/message';

const RARETES: Record<Rarete, string> = {
  COMMUN: 'commun',
  RARE: 'rare',
  LEGENDAIRE: 'légendaire',
};
const TYPES: Record<TypeMonument, string> = {
  CHATEAU: 'château',
  RELIGIEUX: 'religieux',
  PONT: 'pont',
  PHARE: 'phare',
  PALAIS: 'palais',
  TOUR: 'tour',
  MUSEE: 'musée',
  AUTRE: 'autre',
};
// Silhouettes génériques par type (viewBox 24), validées en attendant le dessin définitif (CDC §12).
const FORMES: Record<TypeMonument, string> = {
  CHATEAU: 'M3 21V8h4v3h3V8h4v3h3V8h4v13z',
  RELIGIEUX: 'M4 21V12l5-3v12zM9 21V9l3-6 3 6v12zM15 21V9l5 3v9z',
  PONT: 'M2 9h20v3H2zM4 12v9h3v-4a2 2 0 0 1 4 0v4h2v-4a2 2 0 0 1 4 0v4h3v-9',
  PHARE: 'M10 3h4v3h-4zM9 6h6l2 15H7z',
  PALAIS: 'M2 21V11h20v10zM2 11l10-7 10 7',
  TOUR: 'M10 2h4l1 19H9z',
  MUSEE: 'M2 9l10-6 10 6zM4 11h3v8H4zM10.500 11h3v8h-3zM17 11h3v8h-3zM2 20h20v2H2z',
  AUTRE: 'M12 2l8 10-8 10-8-10z',
};

/** Nombre de tampons à partir duquel les filtres apparaissent (RG-045, Q-13). */
export const SEUIL_FILTRES = 20;
type Etat = 'tous' | 'tamponnes' | 'a-decouvrir';
const ETATS: [Etat, string][] = [
  ['tous', 'Tous'],
  ['tamponnes', 'Tamponnés'],
  ['a-decouvrir', 'À découvrir'],
];

/** Carnet numéroté : une page par ville, silhouettes (RG-054) puis tampons. Rien n'est stocké (RG-057). */
@Component({
  selector: 'app-carnet',
  imports: [RouterLink, TitleCasePipe, ZnMessage],
  template: `
    <a class="profil" routerLink="/profil" aria-label="Mon profil">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 4a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7zM5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" />
      </svg>
    </a>
    <h1 #titre tabindex="-1">Mon carnet</h1>
    @if (monuments.error()) {
      <zn-message type="erreur">
        Pas de connexion.
        <button type="button" (click)="monuments.reload()">Réessayer</button>
      </zn-message>
    } @else if (monuments.hasValue()) {
      @if (total() === 0) {
        <p>Aucun monument dans cette ville pour l’instant</p>
      } @else {
        @if (captures() === 0) {
          <ol class="guide">
            <li>Rapproche-toi d’un monument</li>
            <li>Prends-le en photo</li>
            <li>Reçois ton tampon</li>
          </ol>
          <a class="carte" routerLink="/tamponner">Voir la carte</a>
        }
        <p class="compteur">
          {{ captures() }} sur {{ total() }}
          <span
            class="barre"
            role="progressbar"
            aria-label="Progression du carnet"
            aria-valuemin="0"
            [attr.aria-valuenow]="captures()"
            [attr.aria-valuemax]="total()"
            ><span [style.inline-size.%]="(100 * captures()) / total()"></span
          ></span>
        </p>
        <nav aria-label="Villes" class="villes">
          <button
            type="button"
            aria-label="Ville précédente"
            [disabled]="index() === 0"
            (click)="aller(-1)"
          >
            ‹
          </button>
          <h2 #ville tabindex="-1">{{ pageCourante()?.nom }}</h2>
          <span>{{ index() + 1 }}/{{ pages().length }}</span>
          <button
            type="button"
            aria-label="Ville suivante"
            [disabled]="index() === pages().length - 1"
            (click)="aller(1)"
          >
            ›
          </button>
        </nav>
        @if (captures() >= seuil) {
          <div class="filtres" role="group" aria-label="Filtres">
            @for (e of etats; track e[0]) {
              <button type="button" [attr.aria-pressed]="etat() === e[0]" (click)="etat.set(e[0])">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z" />
                </svg>
                {{ e[1] }}
                @if (etat() === e[0]) {
                  <svg class="coche" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                }
              </button>
            }
            @for (t of typesListe; track t) {
              <button type="button" [attr.aria-pressed]="type() === t" (click)="basculerType(t)">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path [attr.d]="formes[t]" />
                </svg>
                {{ types[t] | titlecase }}
                @if (type() === t) {
                  <svg class="coche" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                }
              </button>
            }
          </div>
          <p class="resultats" role="status">
            {{ visibles().length }} {{ visibles().length > 1 ? 'résultats' : 'résultat' }}
          </p>
          @if (visibles().length === 0) {
            <p>Aucun monument ne correspond</p>
            <button type="button" (click)="effacer()">Effacer les filtres</button>
          }
        }
        <p class="sous-compteur">
          {{ capturesVille() }} sur {{ pageCourante()?.monuments?.length }}
        </p>
        <p role="status" class="sr">{{ pageCourante()?.nom }}</p>
        <ul class="grille">
          @for (x of visibles(); track x.numero) {
            <li>
              <a
                [routerLink]="['/monument', x.numero]"
                [class]="x.captureeLe ? 'tampon ' + x.rarete.toLowerCase() : 'vide'"
                [attr.aria-label]="nomAccessible(x)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path [attr.d]="formes[x.type]" />
                </svg>
                <span class="num" aria-hidden="true">{{ numero(x) }}</span>
                @if (x.captureeLe) {
                  @if (x.rarete === 'LEGENDAIRE') {
                    <svg class="etoile" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d="M12 2l3 7 7 .6-5.3 4.7 1.700 7.200L12 17.800 5.600 21.500l1.700-7.200L2 9.600 9 9z"
                      />
                    </svg>
                  }
                  <span class="nom" aria-hidden="true">{{ x.nom }}</span>
                  <span class="meta" aria-hidden="true"
                    >{{ types[x.type] }} · {{ raretes[x.rarete] | titlecase }}</span
                  >
                }
              </a>
            </li>
          }
        </ul>
        @if (collections().length) {
          <section class="collections" aria-labelledby="titre-collections">
            <h2 id="titre-collections">Collections</h2>
            <ul>
              @for (c of collections(); track c.code) {
                <li>
                  <button
                    type="button"
                    [attr.aria-expanded]="ouverte() === c.code"
                    [attr.aria-controls]="'col-' + c.code"
                    (click)="ouverte.set(ouverte() === c.code ? null : c.code)"
                  >
                    <span>{{ c.nom }}</span>
                    <span class="progression">{{ c.captures }} / {{ c.total }}</span>
                  </button>
                  @if (ouverte() === c.code) {
                    <ul class="grille" [id]="'col-' + c.code">
                      @for (r of c.monuments; track r.numero) {
                        @let n = parNumero().get(r.numero);
                        <li>
                          @if (n) {
                            <a
                              [routerLink]="['/monument', n.numero]"
                              [class]="n.captureeLe ? 'tampon ' + n.rarete.toLowerCase() : 'vide'"
                              [attr.aria-label]="nomAccessible(n)"
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path [attr.d]="formes[n.type]" />
                              </svg>
                              <span class="num" aria-hidden="true">{{ numero(n) }}</span>
                              @if (n.captureeLe) {
                                <span class="nom" aria-hidden="true">{{ n.nom }}</span>
                              }
                            </a>
                          }
                        </li>
                      }
                    </ul>
                  }
                </li>
              }
            </ul>
          </section>
        }
      }
    } @else {
      <p class="sr" role="status">Chargement du carnet</p>
      <ul class="grille squelette" aria-hidden="true">
        @for (i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track i) {
          <li></li>
        }
      </ul>
    }
  `,
  styleUrls: ['../coquille.css', './carnet.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Carnet {
  private readonly injector = inject(Injector);
  private readonly position = inject(Position);
  private readonly titre = viewChild<ElementRef<HTMLElement>>('titre');
  private readonly ville = viewChild<ElementRef<HTMLElement>>('ville');
  protected readonly monuments = httpResource<MonumentResume[]>(() => '/api/catalogue/monuments');
  private readonly collectionsApi = httpResource<MaCollection[]>(
    () => '/api/progression/collections',
  );
  protected readonly ouverte = signal<string | null>(null);
  protected readonly formes = FORMES;
  protected readonly types = TYPES;
  protected readonly raretes = RARETES;
  protected readonly page = signal<number | null>(null);
  protected readonly seuil = SEUIL_FILTRES;
  protected readonly etats = ETATS;
  protected readonly typesListe = Object.keys(TYPES) as TypeMonument[];
  protected readonly etat = signal<Etat>('tous');
  protected readonly type = signal<TypeMonument | null>(null);

  private readonly liste = computed(() =>
    this.monuments.hasValue() ? this.monuments.value() : [],
  );
  // RG-R2-07 : une collection n'apparaît qu'à partir d'une capture ; erreur = section absente.
  protected readonly collections = computed(() =>
    this.collectionsApi.hasValue() ? this.collectionsApi.value().filter((c) => c.captures > 0) : [],
  );
  protected readonly parNumero = computed(() => new Map(this.liste().map((x) => [x.numero, x])));
  protected readonly total = computed(() => this.liste().length);
  protected readonly captures = computed(() => this.liste().filter((x) => x.captureeLe).length);
  protected readonly pages = computed(() => {
    const parVille = new Map<string, MonumentResume[]>();
    for (const x of [...this.liste()].sort((a, b) => a.numero - b.numero)) {
      parVille.set(x.ville.nom, [...(parVille.get(x.ville.nom) ?? []), x]);
    }
    return [...parVille].map(([nom, monuments]) => ({ nom, monuments }));
  });
  protected readonly index = computed(() => {
    const p = this.page();
    if (p !== null) return p;
    const coords = this.position.etat().coords;
    const proche = coords
      ? this.liste().reduce<MonumentResume | undefined>(
          (m, x) =>
            !m || distanceMetres(coords, x.position) < distanceMetres(coords, m.position) ? x : m,
          undefined,
        )
      : undefined;
    const nom = proche?.ville.nom ?? 'Paris';
    return Math.max(
      0,
      this.pages().findIndex((v) => v.nom === nom),
    );
  });
  protected readonly pageCourante = computed(() => this.pages()[this.index()]);
  protected readonly capturesVille = computed(
    () => this.pageCourante()?.monuments.filter((x) => x.captureeLe).length ?? 0,
  );

  protected readonly visibles = computed(() => {
    const filtres = this.captures() >= SEUIL_FILTRES;
    return (this.pageCourante()?.monuments ?? []).filter(
      (x) =>
        !filtres ||
        ((this.etat() === 'tous' || !!x.captureeLe === (this.etat() === 'tamponnes')) &&
          (!this.type() || x.type === this.type())),
    );
  });

  constructor() {
    afterNextRender(() => this.titre()?.nativeElement.focus());
  }

  protected aller(sens: number) {
    this.page.set(this.index() + sens);
    afterNextRender(() => this.ville()?.nativeElement.focus(), { injector: this.injector });
  }
  protected basculerType(t: TypeMonument) {
    this.type.set(this.type() === t ? null : t);
  }
  protected effacer() {
    this.etat.set('tous');
    this.type.set(null);
  }
  protected numero(x: MonumentResume) {
    return `N° ${String(x.numero).padStart(3, '0')}`;
  }
  protected nomAccessible(x: MonumentResume) {
    const n = this.numero(x);
    return x.captureeLe
      ? `${n}, ${x.nom}, ${TYPES[x.type]}, ${RARETES[x.rarete]}, capturé`
      : `${n}, à découvrir`;
  }
}
