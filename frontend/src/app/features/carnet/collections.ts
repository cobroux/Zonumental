import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaCollection } from '../../core/api/models/ma-collection';
import { ZnIcone } from '../../shared/ui/icone';
import { ZnMessage } from '../../shared/ui/message';

/** Pourcentage entier de la progression, partagé avec le détail. */
export const pourcent = (c: Pick<MaCollection, 'captures' | 'total'>) =>
  c.captures === c.total ? 100 : Math.min(99, Math.round((c.captures / c.total) * 100));

/** Écran Collections : celles où l'on a au moins une capture (RG-R2-07), en cours puis terminées. */
@Component({
  selector: 'app-collections',
  imports: [RouterLink, ZnIcone, ZnMessage],
  template: `
    <header>
      <a class="retour" routerLink="/carnet" aria-label="Retour"><zn-icone nom="retour" /></a>
      <span class="rubrique">COLLECTIONS</span>
    </header>
    <h1 tabindex="-1">Collections</h1>
    @if (api.error()) {
      <zn-message type="erreur">
        Collections indisponibles.
        <button type="button" (click)="api.reload()">Réessayer</button>
      </zn-message>
    } @else if (!api.hasValue()) {
      <p class="zn-sr" role="status">Chargement des collections</p>
      <ul class="liste" aria-hidden="true">
        @for (i of [1, 2, 3]; track i) {
          <li class="carte fantome"></li>
        }
      </ul>
    } @else if (!ouvertes().length) {
      <div class="vide">
        <p>Aucune collection pour l’instant. Tamponne ton premier monument pour en ouvrir une.</p>
        <a class="bouton" routerLink="/explorer">Voir la carte</a>
      </div>
    } @else {
      <p class="bilan">{{ bilan() }}</p>
      <ul class="liste">
        @for (c of ouvertes(); track c.code) {
          <li>
            <a class="carte" [routerLink]="['/carnet/collections', c.code]">
              <span class="nom">{{ c.nom }}</span>
              <span class="compteur"
                >{{ c.captures }} / {{ c.total }}<span class="zn-sr"> monuments</span></span
              >
              @if (c.complete) {
                <span class="terminee">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  Terminée
                </span>
              }
              <progress
                aria-hidden="true"
                [class.complete]="c.complete"
                [value]="c.captures"
                [max]="c.total"
              ></progress>
            </a>
          </li>
        }
      </ul>
    }
  `,
  styleUrl: './collections.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Collections {
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly api = httpResource<MaCollection[]>(() => '/api/progression/collections');
  protected readonly ouvertes = computed(() =>
    (this.api.hasValue() ? this.api.value() : [])
      .filter((c) => c.captures > 0)
      .sort(
        (a, b) =>
          Number(a.complete) - Number(b.complete) ||
          (a.complete ? 0 : pourcent(b) - pourcent(a)) ||
          a.nom.localeCompare(b.nom, 'fr'),
      ),
  );
  protected readonly bilan = computed(() => {
    const faites = this.ouvertes().filter((c) => c.complete).length;
    const enCours = this.ouvertes().length - faites;
    return `${faites} terminée${faites > 1 ? 's' : ''} · ${enCours} en cours`;
  });

  constructor() {
    afterNextRender(() => this.hote.querySelector<HTMLElement>('h1')?.focus());
  }
}
