import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MaCollection } from '../../core/api/models/ma-collection';
import { MonumentResume } from '../../core/api/models/monument-resume';
import { Profil } from '../../core/api/models/profil';
import { TypeMonument } from '../../core/api/models/type-monument';
import { Position } from '../../core/position/position';
import { distanceMetres, formaterDistance } from '../../core/position/proximite';
import { ZnBandeau } from '../../shared/ui/bandeau';
import { ZnMessage } from '../../shared/ui/message';
import { placement } from '../../shared/ui/placement';
import { ZnPlanche } from '../../shared/ui/planche';
import { ZnTampon } from '../../shared/ui/tampon';
import {
  ENCRE_PAR_RARETE,
  FORME_PAR_TYPE,
  contenuTampon,
  etiquetteTampon,
} from '../../shared/ui/tampon-monument';

/** Nombre de tampons à partir duquel les filtres apparaissent (RG-045, Q-13). */
export const SEUIL_FILTRES = 20;
/** Densité progressive (cahier §6) : planche aérée sous ce nombre de tampons. */
const SEUIL_DENSE = 6;
const PAGE_AEREE = 6;
const PAGE_DENSE = 12;
const MAX_PUCES = 7;

const ETATS = [
  { id: 'tous', libelle: 'Tous' },
  { id: 'tamponnes', libelle: 'Tamponnés' },
  { id: 'a-decouvrir', libelle: 'À découvrir' },
];
const GROUPES: { id: string; libelle: string; types: TypeMonument[] }[] = [
  { id: 'tours', libelle: 'Tours', types: ['TOUR', 'PHARE'] },
  { id: 'religieux', libelle: 'Religieux', types: ['RELIGIEUX'] },
  { id: 'arcs-ponts', libelle: 'Arcs & ponts', types: ['PONT', 'AUTRE'] },
  { id: 'chateaux-palais', libelle: 'Châteaux & palais', types: ['CHATEAU', 'PALAIS'] },
  { id: 'musees', libelle: 'Musées', types: ['MUSEE'] },
];

/** Carnet numéroté : une planche par ville, des tampons libres puis des cases vides (RG-054). Rien n'est stocké (RG-057). */
@Component({
  selector: 'app-carnet',
  imports: [NgTemplateOutlet, RouterLink, ZnBandeau, ZnMessage, ZnPlanche, ZnTampon],
  template: `
    <ng-template #cellule let-x let-aere="aere" let-indice="indice">
      <li>
        @if (x.captureeLe) {
          <a class="tampon" [routerLink]="['/monument', x.numero]">
            <zn-tampon
              class="pose"
              [class.aere]="aere"
              [style]="pose(x.numero)"
              [forme]="forme(x)"
              [encre]="encre(x)"
              [contenu]="contenu(x)"
              [etiquette]="etiquette(x)"
            />
          </a>
        } @else {
          @let info = indice ? indiceDe(x) : '';
          <a
            class="vide"
            [class.aere]="aere"
            [class.suivante]="indice && x.numero === suivant()"
            [routerLink]="['/monument', x.numero]"
            [attr.aria-label]="nomAccessible(x, info)"
          >
            <span class="num">{{ numero(x) }}</span>
            @if (info) {
              <span class="indice"> {{ info }}</span>
            }
          </a>
        }
      </li>
    </ng-template>

    @if (monuments.error()) {
      <h1 class="zn-sr" tabindex="-1">Mon carnet</h1>
      <zn-message type="erreur">
        Pas de connexion.
        <button type="button" (click)="monuments.reload()">Réessayer</button>
      </zn-message>
    } @else if (monuments.hasValue()) {
      <div class="entete">
        <zn-bandeau
          [pseudo]="pseudo()"
          [tampons]="captures()"
          [legendaires]="legendaires()"
          [villes]="villesAvecTampon()"
          [totalVilles]="pages().length"
        />
        <a class="profil" routerLink="/profil" aria-label="Mon profil"></a>
      </div>
      @if (total() === 0) {
        <p>Aucun monument dans cette ville pour l’instant</p>
      } @else {
        <nav aria-label="Villes" class="villes">
          <ul>
            @for (p of pages(); track p.nom) {
              <li>
                <button
                  type="button"
                  [attr.aria-current]="p.nom === pageCourante()?.nom ? 'page' : null"
                  (click)="choisirVille(p.nom)"
                >
                  <span class="ville">{{ p.nom }}</span>
                  <span class="compte"> {{ p.captures }}/{{ p.monuments.length }}</span>
                  <span class="zn-sr"> tampons</span>
                </button>
              </li>
            }
          </ul>
        </nav>
        @if (captures() >= seuil) {
          <div class="filtres" role="group" aria-label="Filtrer par type">
            @for (c of chips(); track c.id) {
              <button
                type="button"
                [attr.aria-pressed]="filtre() === c.id"
                (click)="basculer(c.id)"
              >
                {{ c.libelle }}
              </button>
            }
          </div>
          <p class="resultats zn-sr" role="status">
            {{ visibles().length }} {{ visibles().length > 1 ? 'monuments' : 'monument' }}
          </p>
        }
        <div class="rangee">
          <p class="etiquette" aria-live="polite">{{ libellePage() }}</p>
          @if (collections().length) {
            <a class="lien-collections" routerLink="/carnet/collections">
              {{ libelleCollections() }}
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </a>
          }
        </div>
        @if (visibles().length === 0) {
          <p>Aucun monument ne correspond</p>
          <button type="button" (click)="effacer()">Effacer les filtres</button>
        } @else {
          <zn-planche [titre]="titrePlanche()" [aere]="aere()">
            @for (x of cellules(); track x.numero) {
              <ng-container
                *ngTemplateOutlet="cellule; context: { $implicit: x, aere: aere(), indice: true }"
              />
            }
            @if (captures() === 0) {
              <p pied class="accroche">
                Chaque monument visité remplit une case.
                {{ pageCourante()?.monuments?.length }} cases t’attendent à
                {{ pageCourante()?.nom }}.
              </p>
            } @else if (nbPages() > 1) {
              <nav pied class="pages" [attr.aria-label]="'Pages de ' + pageCourante()?.nom">
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
        }
      }
    } @else {
      <h1 class="zn-sr" tabindex="-1">Mon carnet</h1>
      <p class="zn-sr" role="status">Chargement du carnet</p>
      <zn-planche class="squelette" titre="Chargement du carnet" [aere]="true">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <li class="fantome"></li>
        }
      </zn-planche>
    }
  `,
  styleUrls: ['../coquille.css', './planche-cellules.css', './carnet.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Carnet {
  private readonly injector = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly position = inject(Position);
  protected readonly monuments = httpResource<MonumentResume[]>(() => '/api/catalogue/monuments');
  private readonly collectionsApi = httpResource<MaCollection[]>(
    () => '/api/progression/collections',
  );
  private readonly compte = httpResource<Profil>(() => '/api/compte/moi');
  protected readonly seuil = SEUIL_FILTRES;
  protected readonly maxPuces = MAX_PUCES;
  private readonly villeChoisie = signal<string | null>(null);
  private readonly numPage = signal(1);
  protected readonly filtre = signal('tous');

  private readonly liste = computed(() =>
    this.monuments.hasValue() ? this.monuments.value() : [],
  );
  protected readonly pseudo = computed(
    () => `@${this.compte.hasValue() ? this.compte.value().pseudo : 'explorateur'}`,
  );
  // RG-R2-07 : une collection n'apparaît qu'à partir d'une capture ; erreur = lien absent.
  protected readonly collections = computed(() =>
    this.collectionsApi.hasValue() ? this.collectionsApi.value().filter((c) => c.captures > 0) : [],
  );
  protected readonly libelleCollections = computed(() => {
    const n = this.collections().filter((c) => c.complete).length;
    return n ? `Collections · ${n} terminée${n > 1 ? 's' : ''}` : 'Collections';
  });
  protected readonly total = computed(() => this.liste().length);
  protected readonly captures = computed(() => this.liste().filter((x) => x.captureeLe).length);
  protected readonly legendaires = computed(
    () => this.liste().filter((x) => x.captureeLe && x.rarete === 'LEGENDAIRE').length,
  );
  protected readonly villesAvecTampon = computed(
    () =>
      new Set(
        this.liste()
          .filter((x) => x.captureeLe)
          .map((x) => x.ville.nom),
      ).size,
  );
  /** Onglets : plus de monuments d'abord, puis par nom. */
  protected readonly pages = computed(() => {
    const parVille = new Map<string, MonumentResume[]>();
    for (const x of [...this.liste()].sort((a, b) => a.numero - b.numero)) {
      parVille.set(x.ville.nom, [...(parVille.get(x.ville.nom) ?? []), x]);
    }
    return [...parVille]
      .map(([nom, monuments]) => ({
        nom,
        monuments,
        captures: monuments.filter((x) => x.captureeLe).length,
      }))
      .sort((a, b) => b.monuments.length - a.monuments.length || a.nom.localeCompare(b.nom, 'fr'));
  });
  // Distance à chaque monument non capturé : calcul sur l'appareil (RG-036), rien sans position.
  private readonly distances = computed(() => {
    const coords = this.position.etat().coords;
    const d = new Map<number, number>();
    if (coords)
      for (const x of this.liste())
        if (!x.captureeLe && x.position) d.set(x.numero, distanceMetres(coords, x.position));
    return d;
  });
  /** Le monument à tamponner en premier : le plus proche des non capturés. */
  protected readonly suivant = computed(() => {
    let meilleur: [number, number] | undefined;
    for (const e of this.distances()) if (!meilleur || e[1] < meilleur[1]) meilleur = e;
    return meilleur?.[0];
  });
  protected readonly pageCourante = computed(() => {
    const nom = this.villeChoisie() ?? this.villeLaPlusProche();
    return this.pages().find((p) => p.nom === nom) ?? this.pages()[0];
  });
  // Ville ouverte par défaut : celle du monument le plus proche, sinon Paris.
  private readonly villeLaPlusProche = computed(() => {
    const coords = this.position.etat().coords;
    if (!coords) return 'Paris';
    let meilleur: { nom: string; d: number } | undefined;
    for (const x of this.liste()) {
      const d = x.position ? distanceMetres(coords, x.position) : Infinity;
      if (!meilleur || d < meilleur.d) meilleur = { nom: x.ville.nom, d };
    }
    return meilleur?.nom ?? 'Paris';
  });

  protected readonly chips = computed(() => {
    const ville = this.pageCourante()?.monuments ?? [];
    return [...ETATS, ...GROUPES.filter((g) => ville.some((x) => g.types.includes(x.type)))];
  });
  protected readonly visibles = computed(() => {
    const f = this.filtre();
    const groupe = GROUPES.find((g) => g.id === f);
    const actif = this.captures() >= SEUIL_FILTRES;
    return (this.pageCourante()?.monuments ?? []).filter(
      (x) =>
        !actif ||
        f === 'tous' ||
        (groupe ? groupe.types.includes(x.type) : !!x.captureeLe === (f === 'tamponnes')),
    );
  });
  protected readonly aere = computed(() => this.captures() < SEUIL_DENSE);
  private readonly taillePage = computed(() => (this.aere() ? PAGE_AEREE : PAGE_DENSE));
  protected readonly nbPages = computed(() =>
    Math.max(1, Math.ceil(this.visibles().length / this.taillePage())),
  );
  protected readonly pageAffichee = computed(() => Math.min(this.numPage(), this.nbPages()));
  protected readonly numerosPages = computed(() =>
    Array.from({ length: this.nbPages() }, (_, i) => i + 1),
  );
  protected readonly cellules = computed(() => {
    const debut = (this.pageAffichee() - 1) * this.taillePage();
    return this.visibles().slice(debut, debut + this.taillePage());
  });
  // Au jour 0 : une seule page, sans pagination.
  private readonly paginee = computed(() => this.captures() > 0 && this.nbPages() > 1);
  protected readonly libellePage = computed(
    () =>
      `Page ${this.pageAffichee()}${this.paginee() ? ` / ${this.nbPages()}` : ''} — ${this.pageCourante()?.nom}`,
  );
  protected readonly titrePlanche = computed(
    () => `${this.pageCourante()?.nom}, page ${this.pageAffichee()} sur ${this.nbPages()}`,
  );

  constructor() {
    afterNextRender(() => this.focusTitre());
    // Le h1 du bandeau remplace celui du chargement : on y ramène le focus.
    effect(() => {
      if (this.monuments.hasValue())
        afterNextRender(() => this.focusTitre(), { injector: this.injector });
    });
  }

  private focusTitre() {
    this.hote.nativeElement.querySelector('h1')?.focus();
  }
  protected choisirVille(nom: string) {
    this.villeChoisie.set(nom);
    this.filtre.set('tous');
    this.numPage.set(1);
  }
  protected basculer(id: string) {
    this.filtre.set(this.filtre() === id ? 'tous' : id);
    this.numPage.set(1);
  }
  protected effacer() {
    this.basculer('tous');
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
  protected pose(numero: number) {
    const { rotation, dx, dy } = placement(numero);
    return `--rot: ${rotation}deg; --dx: ${dx}%; --dy: ${dy}%`;
  }
  /** Distance, ou « Le plus proche · » / « Ton premier tampon · » pour le prochain monument. */
  protected indiceDe(x: MonumentResume) {
    const d = this.distances().get(x.numero);
    if (d === undefined) return '';
    const distance = formaterDistance(d);
    if (x.numero !== this.suivant()) return distance;
    return `${this.captures() === 0 ? 'Ton premier tampon' : 'Le plus proche'} · ${distance}`;
  }
  /** Contient le texte visible dans l'ordre (WCAG 2.5.3) ; jamais le nom du monument (RG-054). */
  protected nomAccessible(x: MonumentResume, indice: string) {
    return `${this.numero(x)}${indice ? ` ${indice}` : ''}, à découvrir`;
  }
}
