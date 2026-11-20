import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ZnBientotEtat } from '../../shared/ui/bientot-etat';
import { ZnIcone } from '../../shared/ui/icone';

/** Écran Défis : le classement actif est hors v1 (D6), état « Bientôt » à la place. */
@Component({
  selector: 'app-bientot',
  imports: [RouterLink, ZnBientotEtat, ZnIcone],
  template: `
    <header>
      <a class="retour" routerLink="/explorer" aria-label="Retour"><zn-icone nom="retour" /></a>
    </header>
    <h1 tabindex="-1">{{ titre }}</h1>
    <zn-bientot-etat sujet="Classement" />
  `,
  styleUrl: './bientot.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bientot {
  protected readonly titre: string = inject(ActivatedRoute).snapshot.data['titre'];
}
