/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type NomIcone = 'erreur' | 'succes' | 'info' | 'oeil' | 'oeil-barre' | 'retour';

/** Icône du sprite `public/icons.svg`. Décorative : le libellé voisin porte le sens. */
@Component({
  selector: 'zn-icone',
  template: `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <use [attr.href]="'/icons.svg#' + nom()" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    svg {
      inline-size: 1.25em;
      block-size: 1.25em;
      fill: none;
      stroke: currentcolor;
      stroke-width: 2;
      stroke-linecap: square;
      stroke-linejoin: miter;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZnIcone {
  readonly nom = input.required<NomIcone>();
}
