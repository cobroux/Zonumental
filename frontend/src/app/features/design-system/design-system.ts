import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZnChamp, ZnSaisie } from '../../shared/ui/champ';
import { ZnMessage } from '../../shared/ui/message';

/** Page de démonstration du design system : chaque composant dans tous ses états. */
@Component({
  selector: 'app-design-system',
  imports: [RouterLink, ZnChamp, ZnSaisie, ZnMessage],
  templateUrl: './design-system.html',
  styleUrl: './design-system.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystem {
  protected readonly sections = [
    { id: 'couleurs', numero: '01', titre: 'Couleurs' },
    { id: 'typographie', numero: '02', titre: 'Typographie' },
    { id: 'boutons', numero: '03', titre: 'Boutons' },
    { id: 'champs', numero: '04', titre: 'Champs' },
    { id: 'cases', numero: '05', titre: 'Cases et interrupteurs' },
    { id: 'messages', numero: '06', titre: 'Messages' },
    { id: 'liens', numero: '07', titre: 'Liens et navigation' },
  ];

  protected readonly couleurs = [
    { nom: 'Papier', token: '--zn-papier' },
    { nom: 'Encre', token: '--zn-encre' },
    { nom: 'Marine', token: '--zn-marine' },
    { nom: 'Bordeaux', token: '--zn-bordeaux' },
    { nom: 'Sapin', token: '--zn-sapin' },
    { nom: 'Ocre', token: '--zn-ocre' },
  ];
}
