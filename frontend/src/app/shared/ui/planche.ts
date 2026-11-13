/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Planche de papier : grille de cellules `<li>` projetées. Le `multiply` est posé une seule fois,
 * sur le calque de la grille, jamais par tampon (ADR 0022 §5). Le pied (pagination, phrase
 * d'accroche) se projette avec l'attribut `pied`, hors du calque.
 */
@Component({
  selector: 'zn-planche',
  template: `
    <section [attr.aria-labelledby]="idTitre">
      <h2 [id]="idTitre" class="zn-sr">{{ titre() }}</h2>
      <div class="calque">
        <ul class="grille" [class.aere]="aere()">
          <ng-content />
        </ul>
      </div>
      <ng-content select="[pied]" />
    </section>
  `,
  styleUrl: './planche.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZnPlanche {
  /** Titre lu par les lecteurs d'écran, par exemple « Paris, page 1 sur 4 ». */
  readonly titre = input.required<string>();
  /** Densité : aérée (moins de 6 tampons) ou dense. */
  readonly aere = input(false);
  protected readonly idTitre = `zn-planche-${compteur++}`;
}

let compteur = 0;
