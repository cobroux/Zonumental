import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MonumentResume } from '../../core/api/models/monument-resume';
import { Rarete } from '../../core/api/models/rarete';
import { TypeMonument } from '../../core/api/models/type-monument';
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
          <progress
            [value]="captures()"
            [max]="total()"
            aria-label="Progression du carnet"
          ></progress>
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
          <h2 tabindex="-1">{{ pageCourante()?.nom }}</h2>
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
        <p class="sous-compteur">
          {{ capturesVille() }} sur {{ pageCourante()?.monuments?.length }}
        </p>
        <p role="status" class="sr">{{ pageCourante()?.nom }}</p>
        <ul class="grille">
          @for (x of pageCourante()?.monuments; track x.numero) {
            <li>
              <a
                [routerLink]="['/monument', x.numero]"
                [class]="x.captureeLe ? 'tampon ' + x.rarete.toLowerCase() : 'vide'"
                [attr.aria-label]="nomAccessible(x)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path [attr.d]="formes[x.type]" />
                </svg>
                <span class="num" aria-hidden="true">{{
                  x.captureeLe ? numero(x) : x.numero
                }}</span>
                @if (x.captureeLe) {
                  <span class="nom" aria-hidden="true">{{ x.nom }}</span>
                  <span class="meta" aria-hidden="true"
                    >{{ types[x.type] }} · {{ raretes[x.rarete] | titlecase }}</span
                  >
                }
              </a>
            </li>
          }
        </ul>
      }
    } @else {
      <p class="sr" role="status">Chargement du carnet</p>
    }
  `,
  styleUrls: ['../coquille.css', './carnet.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Carnet {
  protected readonly monuments = httpResource<MonumentResume[]>(() => '/api/catalogue/monuments');
  protected readonly formes = FORMES;
  protected readonly types = TYPES;
  protected readonly raretes = RARETES;
  protected readonly page = signal<number | null>(null);

  private readonly liste = computed(() =>
    this.monuments.hasValue() ? this.monuments.value() : [],
  );
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
    // shortcut: ville la plus proche non gérée (pas de géoloc ici), Paris par défaut ; à brancher avec la localisation.
    const p = this.page();
    return (
      p ??
      Math.max(
        0,
        this.pages().findIndex((v) => v.nom === 'Paris'),
      )
    );
  });
  protected readonly pageCourante = computed(() => this.pages()[this.index()]);
  protected readonly capturesVille = computed(
    () => this.pageCourante()?.monuments.filter((x) => x.captureeLe).length ?? 0,
  );

  protected aller(sens: number) {
    this.page.set(this.index() + sens);
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
