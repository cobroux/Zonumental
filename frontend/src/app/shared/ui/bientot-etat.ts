/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ZnTampon } from './tampon';

/** État « Bientôt » d'une fonctionnalité non livrée (D6) : tampon d'encre + phrase, sans écran vide. */
@Component({
  selector: 'zn-bientot-etat',
  imports: [ZnTampon],
  template: `
    <zn-tampon
      class="tampon"
      forme="rectangle"
      [contenu]="{ haut: '', centre: 'BIENTÔT', bas: '' }"
      [decoratif]="true"
    />
    <p>{{ sujet() }} : bientôt disponible. On y travaille.</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding-block: var(--zn-esp-6);
      text-align: center;
      color: var(--zn-gris-45);
    }
    .tampon {
      inline-size: 9rem;
      transform: rotate(-4deg);
    }
    p {
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZnBientotEtat {
  readonly sujet = input.required<string>();
}
