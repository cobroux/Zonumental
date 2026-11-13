/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Icônes de la maquette NavBar (grille 24) : `d` = tracé, `aplat` = remplissage de l'entrée active. */
const ENTREES = [
  {
    href: '/explorer',
    libelle: 'Explorer',
    d: 'M12 3.25a8.75 8.75 0 1 1 0 17.5a8.75 8.75 0 1 1 0-17.5zM15.3 8.7l-1.9 4.7-4.7 1.9 1.9-4.7z',
    aplat: 'M15.3 8.7l-1.9 4.7-4.7 1.9 1.9-4.7z',
  },
  {
    href: '/carnet',
    libelle: 'Carnet',
    d: 'M7 3.25h10a1.75 1.75 0 0 1 1.75 1.75v14a1.75 1.75 0 0 1-1.75 1.75H7A1.75 1.75 0 0 1 5.25 19V5A1.75 1.75 0 0 1 7 3.25zM8.75 3.25v17.5M13.5 9.25a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
    aplat:
      'M7 3.25h10a1.75 1.75 0 0 1 1.75 1.75v14a1.75 1.75 0 0 1-1.75 1.75H7A1.75 1.75 0 0 1 5.25 19V5A1.75 1.75 0 0 1 7 3.25z',
  },
  { href: '/tamponner', libelle: 'Tamponner', d: '', aplat: '' }, // bouton central
  {
    href: '/carte',
    libelle: 'Carte',
    d: 'M3.75 6.5 9 4.5l6 2 5.25-2v13l-5.25 2-6-2-5.25 2zM9 4.5v13M15 6.5v13M12 7.6c-1.45 0-2.55 1.05-2.55 2.45 0 1.75 2.55 3.95 2.55 3.95s2.55-2.2 2.55-3.95c0-1.4-1.1-2.45-2.55-2.45z',
    aplat:
      'M12 7.6c-1.45 0-2.55 1.05-2.55 2.45 0 1.75 2.55 3.95 2.55 3.95s2.55-2.2 2.55-3.95c0-1.4-1.1-2.45-2.55-2.45z',
  },
  {
    href: '/defis',
    libelle: 'Défis',
    d: 'M8.25 3.25l3 6.5M15.75 3.25l-3 6.5M12 9.75a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11z',
    aplat: 'M12 9.75a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11z',
  },
];

/** Barre du bas à 5 entrées (maquette NavBar, spec fidélité §6). */
@Component({
  selector: 'zn-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav aria-label="Navigation principale">
      <ul>
        @for (e of entrees; track e.href) {
          <li>
            @if (e.d) {
              <a [routerLink]="e.href" routerLinkActive="actif" ariaCurrentWhenActive="page">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path class="aplat" [attr.d]="e.aplat" />
                  <path [attr.d]="e.d" />
                </svg>
                <span>{{ e.libelle }}</span>
                <i aria-hidden="true"></i>
              </a>
            } @else {
              <a
                class="tamponner"
                [routerLink]="e.href"
                routerLinkActive="actif"
                ariaCurrentWhenActive="page"
                [attr.data-etat]="bouton().etat"
                [attr.aria-label]="nom()"
              >
                <span class="rond">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M12 2.6a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5zM10.5 7.6h3v3.6h-3zM5.5 11.2h13a1 1 0 0 1 1 1v3.3a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-3.3a1 1 0 0 1 1-1z"
                    />
                  </svg>
                </span>
                <span class="libelle">{{ bouton().texte }}</span>
              </a>
            }
          </li>
        }
      </ul>
    </nav>
  `,
  styleUrl: './navigation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZnNavigation {
  protected readonly entrees = ENTREES;
  /** État et texte du bouton central, calculés par l'appelant (la barre ne connaît pas la position). */
  readonly bouton = input.required<{ etat: string; texte: string }>();
  /** Nom accessible : contient toujours le texte visible (WCAG 2.5.3), spec §6.3. */
  protected readonly nom = computed(() => {
    const { etat, texte } = this.bouton();
    if (etat === 'loin') return `Tamponner, ${texte} : aucun monument à proximité`;
    if (etat === 'proche') return `Tamponner, monument le plus proche à ${texte}`;
    if (etat === 'zone') return 'Tamponner : tu es dans la zone';
    if (etat === 'deja') return 'Tamponner : déjà tamponné ici';
    return `Tamponner : ${texte.toLowerCase()}`;
  });
}
