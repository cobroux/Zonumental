import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sante } from '../../core/sante';
import { ZnChamp, ZnSaisie } from '../../shared/ui/champ';
import { ZnBandeau } from '../../shared/ui/bandeau';
import { ZnMedaille } from '../../shared/ui/medaille';
import { ZnMessage } from '../../shared/ui/message';
import { placement } from '../../shared/ui/placement';
import { ZnPlanche } from '../../shared/ui/planche';
import { ContenuTampon, Encre, Forme, ZnTampon } from '../../shared/ui/tampon';

/** Page de démonstration du design system : chaque composant dans tous ses états. */
@Component({
  selector: 'app-design-system',
  imports: [RouterLink, ZnBandeau, ZnChamp, ZnMedaille, ZnMessage, ZnPlanche, ZnSaisie, ZnTampon],
  templateUrl: './design-system.html',
  styleUrl: './design-system.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystem {
  protected readonly sante = signal<'attente' | 'ok' | 'ko'>('attente');
  protected readonly statutSante = signal('');

  constructor() {
    inject(Sante)
      .verifier()
      .then((r) => {
        this.statutSante.set(r.status);
        this.sante.set('ok');
      })
      .catch(() => this.sante.set('ko'));
  }

  protected readonly sections = [
    { id: 'couleurs', numero: '01', titre: 'Couleurs' },
    { id: 'typographie', numero: '02', titre: 'Typographie' },
    { id: 'boutons', numero: '03', titre: 'Boutons' },
    { id: 'champs', numero: '04', titre: 'Champs' },
    { id: 'cases', numero: '05', titre: 'Cases et interrupteurs' },
    { id: 'raretes', numero: '06', titre: 'Raretés' },
    { id: 'messages', numero: '07', titre: 'Messages' },
    { id: 'liens', numero: '08', titre: 'Liens et navigation' },
    { id: 'tampons', numero: '09', titre: 'Tampons, planche et bandeau' },
  ];

  protected readonly couleurs = [
    { nom: 'Papier', token: '--zn-papier' },
    { nom: 'Encre', token: '--zn-encre' },
    { nom: 'Marine', token: '--zn-marine' },
    { nom: 'Bordeaux', token: '--zn-bordeaux' },
    { nom: 'Sapin', token: '--zn-sapin' },
    { nom: 'Ocre', token: '--zn-ocre' },
  ];

  protected readonly gris = [
    { nom: 'Gris libellé', token: '--zn-gris-libelle' },
    { nom: 'Gris texte', token: '--zn-gris-texte' },
    { nom: 'Gris 45', token: '--zn-gris-45' },
    { nom: 'Gris 6B', token: '--zn-gris-6b' },
    { nom: 'Nuit', token: '--zn-nuit' },
  ];

  protected readonly tampons = (
    [
      [1, 'cercle', 'legendaire', 'PARIS · TOUR A. · N°001 ·', 'LÉGENDAIRE', '12·10·26'],
      [2, 'rectangle', 'commun', 'PONT B.', 'PARIS', 'N°002 · COMMUN'],
      [3, 'octogone', 'rare', 'ÉGLISE C.', 'N°003', 'RARE'],
      [4, 'ovale', 'commun', 'LYON', 'MUSÉE D.', 'N°004 · COMMUN'],
    ] as [number, Forme, Encre, string, string, string][]
  ).map(([numero, forme, encre, haut, centre, bas]) => {
    const { rotation, dx, dy } = placement(numero);
    return {
      numero,
      forme,
      encre,
      contenu: { haut, centre, bas } satisfies ContenuTampon,
      etiquette: `${haut} ${centre} ${bas}`,
      pose: `--rot: ${rotation}deg; --dx: ${dx}%; --dy: ${dy}%`,
    };
  });
}
