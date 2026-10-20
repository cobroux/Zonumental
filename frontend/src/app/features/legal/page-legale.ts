/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ZnMessage } from '../../shared/ui/message';

/** Gabarit commun : bandeau provisoire, version datée, navigation entre les 3 pages. */
@Component({
  selector: 'zn-page-legale',
  imports: [RouterLink, RouterLinkActive, ZnMessage],
  template: `
    <zn-message type="info">
      Texte provisoire, sans valeur juridique : le contenu définitif sera publié avant l'ouverture
      au public.
    </zn-message>
    <article>
      <ng-content />
      <p class="version">Version {{ version().version }} du {{ date() }}</p>
    </article>
    <nav aria-label="Pages légales">
      <a routerLink="/cgu" routerLinkActive="actif" ariaCurrentWhenActive="page">CGU</a>
      <a routerLink="/confidentialite" routerLinkActive="actif" ariaCurrentWhenActive="page"
        >Confidentialité</a
      >
      <a routerLink="/mentions-legales" routerLinkActive="actif" ariaCurrentWhenActive="page"
        >Mentions légales</a
      >
    </nav>
  `,
  styleUrl: './page-legale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLegale {
  readonly version = input.required<{ version: string; date: string }>();
  protected readonly date = computed(() => this.version().date.split('-').reverse().join('/'));
}
