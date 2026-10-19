/* eslint-disable @angular-eslint/component-selector, @angular-eslint/directive-selector -- préfixe `zn` du design system (ADR 0016) */
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ZnIcone } from './icone';

let compteur = 0;

/** Champ de formulaire : libellé visible, aide, erreur liée au `<input znSaisie>` projeté. */
@Component({
  selector: 'zn-champ',
  imports: [ZnIcone],
  template: `
    <label [for]="id">{{ label() }}</label>
    @if (aide(); as texte) {
      <p class="zn-champ__aide" [id]="aideId">{{ texte }}</p>
    }
    <div class="zn-champ__saisie">
      <ng-content select="input" />
      @if (motDePasse()) {
        <button type="button" [attr.aria-controls]="id" (click)="visible.set(!visible())">
          <zn-icone [nom]="visible() ? 'oeil-barre' : 'oeil'" />
          {{ visible() ? 'Masquer' : 'Afficher' }}
        </button>
      }
    </div>
    @if (erreur(); as texte) {
      <p class="zn-champ__erreur" [id]="erreurId">
        <zn-icone nom="erreur" />
        <span><strong>Erreur</strong> <span class="zn-sr">:</span> {{ texte }}</span>
      </p>
    }
  `,
  styleUrl: './champ.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZnChamp {
  readonly label = input.required<string>();
  readonly aide = input<string | null>(null);
  readonly erreur = input<string | null>(null);
  readonly motDePasse = input(false);

  readonly id = `zn-champ-${++compteur}`;
  readonly aideId = `${this.id}-aide`;
  readonly erreurId = `${this.id}-erreur`;
  readonly visible = signal(false);

  readonly decritPar = computed(
    () =>
      [this.aide() ? this.aideId : null, this.erreur() ? this.erreurId : null]
        .filter(Boolean)
        .join(' ') || null,
  );
}

/** À poser sur le `<input>` projeté dans `<zn-champ>` : id, aria-describedby, aria-invalid. */
@Directive({
  selector: 'input[znSaisie]',
  host: {
    '[id]': 'champ.id',
    '[attr.aria-describedby]': 'champ.decritPar()',
    '[attr.aria-invalid]': "champ.erreur() ? 'true' : null",
  },
})
export class ZnSaisie {
  protected readonly champ = inject(ZnChamp);
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  constructor() {
    effect(() => {
      if (this.champ.motDePasse()) {
        this.input.type = this.champ.visible() ? 'text' : 'password';
      }
    });
  }
}
