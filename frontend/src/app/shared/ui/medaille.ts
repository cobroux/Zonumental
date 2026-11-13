/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Encre } from './tampon';

export type EtatMedaille = 'obtenue' | 'en-cours' | 'a-decouvrir';

/** Médaille de succès : même encre que les tampons ; en cours = progression, à découvrir = « ? ». */
@Component({
  selector: 'zn-medaille',
  template: `
    @switch (etat()) {
      @case ('obtenue') {
        <svg
          class="sceau zn-encre"
          viewBox="0 0 64 64"
          role="img"
          [attr.aria-label]="'Succès obtenu : ' + nom()"
          [style.transform]="'rotate(' + rotation() + 'deg)'"
          focusable="false"
        >
          <g fill="none" stroke="currentColor">
            <circle cx="32" cy="32" r="29" stroke-width="2.4" />
            <circle cx="32" cy="32" r="24" stroke-width="1" />
            @if (glyphe()) {
              <path
                [attr.d]="glyphe()"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                transform="translate(20 20)"
              />
            } @else {
              <text x="32" y="36" text-anchor="middle" fill="currentColor" stroke="none">
                {{ texte() }}
              </text>
            }
          </g>
        </svg>
      }
      @case ('en-cours') {
        <span class="sceau rond" role="img" [attr.aria-label]="libelleEnCours()">
          <span aria-hidden="true">{{ valeur() }} / {{ seuil() }}</span>
        </span>
      }
      @default {
        <span class="sceau rond" role="img" [attr.aria-label]="'Succès à découvrir : ' + nom()">
          <span aria-hidden="true">?</span>
        </span>
      }
    }
  `,
  styleUrl: './medaille.css',
  host: { '[attr.data-encre]': 'encre()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZnMedaille {
  readonly nom = input.required<string>();
  readonly etat = input<EtatMedaille>('obtenue');
  readonly encre = input<Encre>('commun');
  /** Tracé 24 × 24 du glyphe ; à défaut, `texte` (par exemple « 10 »). */
  readonly glyphe = input('');
  readonly texte = input('');
  /** Degrés, voir `placement()`. */
  readonly rotation = input(0);
  readonly valeur = input(0);
  readonly seuil = input(0);
  protected readonly libelleEnCours = computed(
    () => `Succès en cours : ${this.nom()}, ${this.valeur()} sur ${this.seuil()}`,
  );
}
