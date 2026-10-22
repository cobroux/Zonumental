import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Coquille : l'écran arrive avec r1-capturer-36.
@Component({
  selector: 'app-explorer',
  imports: [RouterLink],
  template: `
    <a class="profil" routerLink="/profil" aria-label="Mon profil">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 4a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7zM5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" />
      </svg>
    </a>
    <h1>Explorer</h1>
  `,
  styleUrl: '../coquille.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Explorer {}
