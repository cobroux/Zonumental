/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Barre du bas (maquette NavBar). R1 : 3 entrées ; Carte (R3) et Défis (R6) s'ajouteront. */
@Component({
  selector: 'zn-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav aria-label="Navigation principale">
      <a routerLink="/explorer" routerLinkActive="actif" ariaCurrentWhenActive="page">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path class="aplat" d="M15.3 8.7l-1.9 4.7-4.7 1.9 1.9-4.7z" />
          <path
            d="M12 3.25a8.75 8.75 0 1 1 0 17.5a8.75 8.75 0 1 1 0-17.5zM15.3 8.7l-1.9 4.7-4.7 1.9 1.9-4.7z"
          />
        </svg>
        <span>Explorer</span>
        <i aria-hidden="true"></i>
      </a>
      <a routerLink="/carnet" routerLinkActive="actif" ariaCurrentWhenActive="page">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            class="aplat"
            d="M7 3.25h10a1.75 1.75 0 0 1 1.75 1.75v14a1.75 1.75 0 0 1-1.75 1.75H7A1.75 1.75 0 0 1 5.25 19V5A1.75 1.75 0 0 1 7 3.25z"
          />
          <path
            d="M7 3.25h10a1.75 1.75 0 0 1 1.75 1.75v14a1.75 1.75 0 0 1-1.75 1.75H7A1.75 1.75 0 0 1 5.25 19V5A1.75 1.75 0 0 1 7 3.25zM8.75 3.25v17.5M13.5 9.25a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z"
          />
        </svg>
        <span>Carnet</span>
        <i aria-hidden="true"></i>
      </a>
      <!-- État « loin » tant que la position n'est pas connue (r1-capturer-9 le branche). -->
      <a class="tamponner" routerLink="/tamponner" data-etat="loin">
        <span class="rond">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12 2.6a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5zM10.5 7.6h3v3.6h-3zM5.5 11.2h13a1 1 0 0 1 1 1v3.3a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-3.3a1 1 0 0 1 1-1z"
            />
          </svg>
        </span>
        <span>Tamponner</span>
      </a>
    </nav>
  `,
  styleUrl: './navigation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZnNavigation {}
