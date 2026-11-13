/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type Forme = 'cercle' | 'rectangle' | 'octogone' | 'ovale';
export type Encre = 'commun' | 'rare' | 'legendaire';
export interface ContenuTampon {
  haut: string;
  centre: string;
  bas: string;
}

// (corps max, longueur disponible) du texte central, en unités du viewBox
const CENTRE: Record<Forme, [number, number]> = {
  cercle: [15, 62],
  rectangle: [27, 124],
  octogone: [15, 70],
  ovale: [17, 112],
};

const VUES: Record<Forme, string> = {
  cercle: '0 0 120 120',
  rectangle: '0 0 150 96',
  octogone: '0 0 120 120',
  ovale: '0 0 140 100',
};

/** Corps du texte central : tient dans la forme, jamais sous 9 (calcul, pas de mesure DOM). */
export function tailleCentre(forme: Forme, texte: string): number {
  const [max, longueur] = CENTRE[forme];
  const fs = longueur / (Math.max(texte.length, 1) * 0.54);
  return Math.round(Math.max(9, Math.min(max, fs)) * 10) / 10;
}

let compteur = 0;

/**
 * Tampon d'encre : 4 formes, 3 encres, tout en `currentColor`. Le texte est une illustration :
 * son contenu est repris dans `etiquette` (nom accessible), sauf si `decoratif`.
 */
@Component({
  selector: 'zn-tampon',
  template: `
    <svg
      class="zn-encre"
      [attr.viewBox]="vue()"
      [attr.role]="decoratif() ? null : 'img'"
      [attr.aria-label]="decoratif() ? null : etiquette()"
      [attr.aria-hidden]="decoratif() ? 'true' : null"
      focusable="false"
    >
      <g fill="none" stroke="currentColor">
        @switch (forme()) {
          @case ('cercle') {
            <circle cx="60" cy="60" r="56" stroke-width="3" />
            <circle cx="60" cy="60" r="50" stroke-width="1" />
            <circle cx="60" cy="60" r="32" stroke-width="1.2" />
            <path
              [attr.id]="idArc"
              d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0"
              stroke="none"
            />
            <text class="mono arc" font-size="9.2" letter-spacing="2">
              <textPath [attr.href]="'#' + idArc">{{ contenu().haut }}</textPath>
            </text>
            <text class="titre" x="60" y="60" [attr.font-size]="corps()">
              {{ contenu().centre }}
            </text>
            <text class="mono" x="60" y="75" font-size="7.6">{{ contenu().bas }}</text>
          }
          @case ('rectangle') {
            <rect x="3" y="3" width="144" height="90" rx="6" stroke-width="3" />
            <rect x="9" y="9" width="132" height="78" rx="3" stroke-width="1" />
            <text class="mono" x="75" y="27" font-size="8.5" letter-spacing="2.2">
              {{ contenu().haut }}
            </text>
            <text class="titre" x="75" y="56" [attr.font-size]="corps()">
              {{ contenu().centre }}
            </text>
            <line x1="20" y1="65" x2="130" y2="65" stroke-width="1" />
            <text class="mono" x="75" y="79" font-size="8.2">{{ contenu().bas }}</text>
          }
          @case ('octogone') {
            <polygon points="36,3 84,3 117,36 117,84 84,117 36,117 3,84 3,36" stroke-width="3" />
            <polygon
              points="39,10 81,10 110,39 110,81 81,110 39,110 10,81 10,39"
              stroke-width="1"
            />
            <text class="mono" x="60" y="38" font-size="8.5" letter-spacing="1.8">
              {{ contenu().haut }}
            </text>
            <text class="titre" x="60" y="66" [attr.font-size]="corps()">
              {{ contenu().centre }}
            </text>
            <text class="mono" x="60" y="88" font-size="7.6">{{ contenu().bas }}</text>
          }
          @case ('ovale') {
            <ellipse cx="70" cy="50" rx="66" ry="46" stroke-width="3" />
            <ellipse cx="70" cy="50" rx="59" ry="39" stroke-width="1" />
            <text class="mono" x="70" y="34" font-size="8" letter-spacing="2">
              {{ contenu().haut }}
            </text>
            <text class="titre" x="70" y="58" [attr.font-size]="corps()">
              {{ contenu().centre }}
            </text>
            <text class="mono" x="70" y="74" font-size="7.5">{{ contenu().bas }}</text>
          }
        }
      </g>
    </svg>
  `,
  styleUrl: './tampon.css',
  host: { '[attr.data-encre]': 'encre()', '[attr.data-forme]': 'forme()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZnTampon {
  readonly forme = input.required<Forme>();
  readonly encre = input<Encre>('commun');
  readonly contenu = input.required<ContenuTampon>();
  /** Nom accessible : doit contenir le texte visible (WCAG 2.5.3). */
  readonly etiquette = input('');
  readonly decoratif = input(false);

  // id unique par instance : un même monument peut apparaître deux fois sur la page
  protected readonly idArc = `zn-arc-${compteur++}`;
  protected readonly vue = computed(() => VUES[this.forme()]);
  protected readonly corps = computed(() => tailleCentre(this.forme(), this.contenu().centre));
}
