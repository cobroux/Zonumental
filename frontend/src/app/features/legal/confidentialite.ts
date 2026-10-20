/* eslint-disable @angular-eslint/component-selector -- préfixe `zn` du design system (ADR 0016) */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageLegale } from './page-legale';
import { VERSIONS_LEGALES } from './versions-legales';

@Component({
  selector: 'zn-confidentialite',
  imports: [PageLegale],
  template: `
    <zn-page-legale [version]="version">
      <h1>Politique de confidentialité</h1>
      <h2>Responsable du traitement</h2>
      <p>[identité de l'éditeur du projet], joignable à [adresse de contact du projet].</p>
      <h2>Données collectées et finalités</h2>
      <h3>Compte</h3>
      <p>
        Adresse e-mail, mot de passe (conservé chiffré, jamais en clair), pseudo et date de
        naissance déclarée, pour créer et gérer ton compte. Base légale : le contrat (les CGU).
      </p>
      <h3>Captures</h3>
      <p>
        Monument, date, distance mesurée et photo, pour faire fonctionner le jeu. Base légale : le
        contrat. Tes photos sont privées par défaut.
      </p>
      <h3>Position GPS</h3>
      <p>
        Ta position sert uniquement à vérifier que tu es près du monument. Elle n'est jamais
        enregistrée : seule la distance calculée est conservée.
      </p>
      <h3>Classement et e-mails (facultatif)</h3>
      <p>
        Apparaître au classement (à venir) et recevoir des e-mails sont soumis à ton consentement,
        décoché par défaut et révocable à tout moment.
      </p>
      <h2>Cookies et statistiques</h2>
      <p>
        Aucun cookie de suivi. Les statistiques de fréquentation se font sans cookie. Un cookie
        technique sécurisé sert uniquement à maintenir ta session.
      </p>
      <h2>Durées de conservation</h2>
      <p>
        Les données sont conservées tant que ton compte existe. Un compte inactif depuis 3 ans
        reçoit un e-mail d'avertissement, puis est supprimé. À ta demande de suppression, les
        données, photos comprises, sont effacées sous 30 jours.
      </p>
      <h2>Hébergement et destinataires</h2>
      <p>Hébergeurs et sous-traitants situés dans l'Union européenne : [liste à compléter].</p>
      <h2>Tes droits</h2>
      <p>
        Accès, rectification, effacement, portabilité (export de tes données depuis l'application),
        limitation, opposition et retrait du consentement. Pour les exercer : [adresse de contact du
        projet]. Tu peux aussi saisir la CNIL.
      </p>
    </zn-page-legale>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Confidentialite {
  protected readonly version = VERSIONS_LEGALES.confidentialite;
}
