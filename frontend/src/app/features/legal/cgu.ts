/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageLegale } from './page-legale';
import { VERSIONS_LEGALES } from './versions-legales';

@Component({
  selector: 'zn-cgu',
  imports: [PageLegale],
  template: `
    <zn-page-legale [version]="version">
      <h1>Conditions générales d'utilisation</h1>
      <h2>Objet</h2>
      <p>
        Zonumental est une application de collection de monuments de France : on capture un monument
        en le photographiant sur place, puis on le retrouve dans son carnet.
      </p>
      <h2>Compte et âge minimum</h2>
      <p>
        Un compte est nécessaire pour utiliser l'application. Il faut avoir au moins 15 ans révolus
        ; l'âge est déclaré à l'inscription. Les informations fournies doivent être exactes et le
        mot de passe reste confidentiel.
      </p>
      <h2>Règles du jeu</h2>
      <p>
        Une capture n'est valable que si la photo est prise à proximité du monument. Toute tentative
        de tricher (fausse position, photo qui n'est pas un monument) peut entraîner le refus de la
        capture, voire la suspension du compte.
      </p>
      <h2>Contenus</h2>
      <p>
        Les photos que tu prends restent privées par défaut ; tu décides toi-même de les partager.
        Les textes et images des fiches de monuments viennent de sources ouvertes (Wikipédia,
        Wikimedia Commons) et gardent leurs licences, indiquées sur chaque fiche.
      </p>
      <h2>Fin du compte</h2>
      <p>
        Tu peux supprimer ton compte à tout moment depuis l'application (voir la politique de
        confidentialité). Un compte inactif depuis 3 ans peut être supprimé après avertissement par
        e-mail.
      </p>
      <h2>Contact</h2>
      <p>[adresse de contact du projet]</p>
    </zn-page-legale>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cgu {
  protected readonly version = VERSIONS_LEGALES.cgu;
}
