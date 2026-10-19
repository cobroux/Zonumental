/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ZnIcone } from './icone';

export type TypeMessage = 'erreur' | 'succes' | 'info';

const ETIQUETTES: Record<TypeMessage, string> = {
  erreur: 'Erreur',
  succes: 'Réussi',
  info: 'À savoir',
};

/** Message d'état : icône, étiquette écrite et texte. Jamais la couleur seule (WCAG 1.4.1). */
@Component({
  selector: 'zn-message',
  imports: [ZnIcone],
  template: `
    <zn-icone [nom]="type()" />
    <p>
      <strong class="zn-message__etiquette">{{ etiquette() }}</strong>
      <ng-content />
    </p>
  `,
  styleUrl: './message.css',
  host: {
    '[attr.role]': "type() === 'erreur' ? 'alert' : 'status'",
    '[attr.data-type]': 'type()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZnMessage {
  readonly type = input.required<TypeMessage>();
  protected readonly etiquette = computed(() => ETIQUETTES[this.type()]);
}
