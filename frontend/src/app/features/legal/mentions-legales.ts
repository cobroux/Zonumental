/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageLegale } from './page-legale';
import { VERSIONS_LEGALES } from './versions-legales';

@Component({
  selector: 'zn-mentions-legales',
  imports: [PageLegale],
  template: `
    <zn-page-legale [version]="version">
      <h1>Mentions légales</h1>
      <h2>Éditeur</h2>
      <p>
        [nom ou raison sociale de l'éditeur], [adresse], [numéro d'immatriculation le cas échéant].
        Directeur de la publication : [nom].
      </p>
      <h2>Contact</h2>
      <p>[adresse de contact du projet]</p>
      <h2>Hébergement</h2>
      <p>[nom, adresse et contact de l'hébergeur], dans l'Union européenne.</p>
      <h2>Sources des contenus</h2>
      <p>
        Textes issus de Wikipédia (licence CC BY-SA) et images de Wikimedia Commons (licence propre
        à chaque image), indiquées sur la fiche de chaque monument. Données du catalogue : Wikidata
        et base Mérimée.
      </p>
    </zn-page-legale>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentionsLegales {
  protected readonly version = VERSIONS_LEGALES.mentions;
}
