import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Api } from '../../../core/api/api';
import { inscrire } from '../../../core/api/fn/compte/inscrire';
import { VERSIONS_LEGALES } from '../../../core/legal/versions-legales';
import { ZnChamp, ZnSaisie } from '../../../shared/ui/champ';
import { ZnIcone } from '../../../shared/ui/icone';
import { ZnMessage } from '../../../shared/ui/message';
import { lireProbleme } from '../probleme';
import { Champ, Erreurs, dateIso, erreurs, messageDe } from './validation';

const CHAMPS: Champ[] = ['pseudo', 'email', 'motDePasse', 'dateNaissance', 'cgu'];

interface Modele {
  pseudo: string;
  email: string;
  motDePasse: string;
  dateNaissance: string;
  cgu: boolean;
  classement: boolean;
  emails: boolean;
}

@Component({
  selector: 'app-inscription',
  imports: [ZnChamp, ZnSaisie, ZnIcone, ZnMessage],
  templateUrl: './inscription.html',
  styleUrl: './inscription.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inscription {
  private readonly api = inject(Api);
  private readonly injector = inject(Injector);
  private readonly historique = inject(Location);
  private readonly routeur = inject(Router);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly m = signal<Modele>({
    pseudo: '',
    email: '',
    motDePasse: '',
    dateNaissance: '',
    cgu: false,
    classement: false,
    emails: false,
  });
  protected readonly erreurs = signal<Erreurs>({});
  protected readonly global = signal<string | null>(null);
  protected readonly obsolete = signal(false);
  protected readonly occupe = signal(false);

  protected maj(champ: keyof Modele, e: Event) {
    const cible = e.target as HTMLInputElement;
    const valeur = cible.type === 'checkbox' ? cible.checked : cible.value;
    this.m.update((v) => ({ ...v, [champ]: valeur }));
  }

  protected retour() {
    this.historique.back();
  }

  protected async valider(e: Event) {
    e.preventDefault();
    if (this.occupe()) return;
    this.global.set(null);
    const err = erreurs(this.m());
    this.erreurs.set(err);
    if (Object.keys(err).length) return this.focaliser('[aria-invalid="true"]');
    await this.envoyer();
  }

  private async envoyer() {
    const v = this.m();
    this.occupe.set(true);
    try {
      await this.api.invoke(inscrire, {
        body: {
          pseudo: v.pseudo,
          email: v.email.trim(),
          motDePasse: v.motDePasse,
          dateNaissance: dateIso(v.dateNaissance) ?? '',
          consentements: {
            cgu: true,
            confidentialite: true,
            versionCgu: VERSIONS_LEGALES.cgu.version,
            versionConfidentialite: VERSIONS_LEGALES.confidentialite.version,
            classement: v.classement,
            emails: v.emails,
          },
        },
      });
      // Le mot de passe ne reste pas en mémoire une fois envoyé.
      this.m.update((x) => ({ ...x, motDePasse: '' }));
      await this.routeur.navigate(['/inscription/verifie-ton-email'], {
        state: { email: v.email.trim() },
      });
    } catch (e) {
      this.surErreur(e);
    } finally {
      this.occupe.set(false);
    }
  }

  private surErreur(e: unknown) {
    const p = lireProbleme(e);
    const err: Erreurs = {};
    switch (p?.code) {
      case 'pseudo-deja-pris':
        err.pseudo = messageDe('pseudo', 'pseudo-deja-pris');
        break;
      case 'age-minimum':
        err.dateNaissance = messageDe('dateNaissance', 'age-minimum');
        break;
      case 'consentement-obligatoire':
        err.cgu = messageDe('cgu', 'consentement-obligatoire');
        break;
      case 'version-texte-obsolete':
        this.obsolete.set(true);
        this.global.set(
          'Les conditions ont changé. Recharge la page pour lire la nouvelle version.',
        );
        break;
      case 'validation':
        for (const { champ, code } of p.erreurs ?? []) {
          const nom = champ.startsWith('consentements.') ? 'cgu' : champ;
          if (CHAMPS.includes(nom as Champ)) err[nom as Champ] ??= messageDe(nom as Champ, code);
        }
        if (!Object.keys(err).length) this.global.set('Vérifie les informations saisies.');
        break;
      default:
        this.global.set(
          e instanceof HttpErrorResponse && e.status === 0
            ? 'Pas de connexion. Réessaie dans un instant.'
            : 'Une erreur est survenue. Réessaie dans un instant.',
        );
    }
    this.erreurs.set(err);
    if (Object.keys(err).length) this.focaliser('[aria-invalid="true"]');
  }

  protected recharger() {
    location.reload();
  }

  /** Focus sur le premier élément du sélecteur, une fois les erreurs rendues. */
  private focaliser(selecteur: string) {
    afterNextRender(() => this.hote.querySelector<HTMLElement>(selecteur)?.focus(), {
      injector: this.injector,
    });
  }
}
