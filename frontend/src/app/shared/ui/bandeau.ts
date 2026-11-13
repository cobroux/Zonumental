/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Bandeau marine du carnet : pseudo, sceau Z décoratif, stats qui passent à la ligne. */
@Component({
  selector: 'zn-bandeau',
  template: `
    <svg class="sceau-z" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor">
        <circle cx="60" cy="60" r="56" stroke-width="2" />
        <circle cx="60" cy="60" r="46" stroke-width="1" />
        <text x="60" y="74" text-anchor="middle" fill="currentColor" stroke="none" font-size="40">
          Z
        </text>
      </g>
    </svg>
    <p class="surtitre">Carnet d'explorateur</p>
    @if (soustitre()) {
      <h2><span class="zn-sr">Carnet de </span>{{ pseudo() }}</h2>
    } @else {
      <h1><span class="zn-sr">Carnet de </span>{{ pseudo() }}</h1>
    }
    <ul class="stats">
      <li>
        <b>{{ tampons() }}</b>
        {{ tampons() === 0 ? 'tampon · ton carnet commence ici' : libelleTampons() }}
      </li>
      @if (legendaires() >= 1) {
        <li class="or">
          <b>{{ legendaires() }}</b> {{ legendaires() > 1 ? 'légendaires' : 'légendaire' }}
        </li>
      }
      @if (villes() >= 2) {
        <li>
          <b>{{ villes() }}</b>
          <span aria-hidden="true">/{{ totalVilles() }} villes</span>
          <span class="zn-sr"> sur {{ totalVilles() }} villes</span>
        </li>
      }
    </ul>
  `,
  styleUrl: './bandeau.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZnBandeau {
  readonly pseudo = input.required<string>();
  /** Titre de niveau 2 quand la page a déjà son h1 (page de démonstration). */
  readonly soustitre = input(false);
  readonly tampons = input(0);
  readonly legendaires = input(0);
  /** Villes avec au moins un tampon. */
  readonly villes = input(0);
  readonly totalVilles = input(0);
  protected readonly libelleTampons = computed(() => (this.tampons() > 1 ? 'tampons' : 'tampon'));
}
