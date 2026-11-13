import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ZnIcone } from '../../shared/ui/icone';

/** Écran générique des onglets Carte et Défis, pas encore construits (fidélité §6.2, décision n° 9). */
@Component({
  selector: 'app-bientot',
  imports: [RouterLink, ZnIcone],
  template: `
    <header>
      <a class="retour" routerLink="/explorer" aria-label="Retour"><zn-icone nom="retour" /></a>
    </header>
    <h1 tabindex="-1">{{ titre }}</h1>
    <p>Bientôt disponible. On y travaille.</p>
  `,
  styleUrl: './bientot.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bientot {
  protected readonly titre: string = inject(ActivatedRoute).snapshot.data['titre'];
}
