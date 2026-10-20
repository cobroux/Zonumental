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
import { Api } from '../../../core/api/api';
import { inscrire } from '../../../core/api/fn/compte/inscrire';
import { Probleme } from '../../../core/api/models/probleme';
import { VERSIONS_LEGALES } from '../../../core/legal/versions-legales';
import { ZnChamp, ZnSaisie } from '../../../shared/ui/champ';
import { ZnIcone } from '../../../shared/ui/icone';
import { ZnMessage } from '../../../shared/ui/message';
import { Champ, Erreurs, dateIso, erreursEtape1, erreursEtape2, messageDe } from './validation';

const CHAMPS: Champ[] = ['pseudo', 'email', 'motDePasse', 'dateNaissance', 'cgu'];
const ETAPE_1: Champ[] = ['pseudo', 'email', 'motDePasse'];

interface Modele {
  pseudo: string;
  email: string;
  motDePasse: string;
  jour: string;
  mois: string;
  annee: string;
  cgu: boolean;
  classement: boolean;
  emails: boolean;
}

/** Lit le problem+json ; le client généré demande `text`, le corps d'erreur arrive donc en chaîne. */
function lireProbleme(e: unknown): Probleme | null {
  if (!(e instanceof HttpErrorResponse)) return null;
  try {
    return (typeof e.error === 'string' ? JSON.parse(e.error) : e.error) as Probleme;
  } catch {
    return null;
  }
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
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly etape = signal<1 | 2>(1);
  protected readonly m = signal<Modele>({
    pseudo: '',
    email: '',
    motDePasse: '',
    jour: '',
    mois: '',
    annee: '',
    cgu: false,
    classement: false,
    emails: false,
  });
  protected readonly erreurs = signal<Erreurs>({});
  protected readonly global = signal<string | null>(null);
  protected readonly obsolete = signal(false);
  protected readonly occupe = signal(false);
  protected readonly envoyeA = signal<string | null>(null);

  protected maj(champ: keyof Modele, e: Event) {
    const cible = e.target as HTMLInputElement;
    const valeur = cible.type === 'checkbox' ? cible.checked : cible.value;
    this.m.update((v) => ({ ...v, [champ]: valeur }));
  }

  protected precedent() {
    this.erreurs.set({});
    this.global.set(null);
    this.etape.set(1);
    this.focaliser('h2');
  }

  protected async valider(e: Event) {
    e.preventDefault();
    if (this.occupe()) return;
    const v = this.m();
    this.global.set(null);
    if (this.etape() === 1) {
      const err = erreursEtape1(v);
      this.erreurs.set(err);
      if (Object.keys(err).length) return this.focaliser('[aria-invalid="true"]');
      this.etape.set(2);
      return this.focaliser('h2');
    }
    const err = erreursEtape2({
      naissance: { jour: v.jour, mois: v.mois, annee: v.annee },
      cgu: v.cgu,
    });
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
          dateNaissance: dateIso({ jour: v.jour, mois: v.mois, annee: v.annee }) ?? '',
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
      this.envoyeA.set(v.email.trim());
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
    if (Object.keys(err).length) {
      this.etape.set(ETAPE_1.some((c) => err[c]) ? 1 : 2);
      this.focaliser('[aria-invalid="true"]');
    }
  }

  protected recharger() {
    location.reload();
  }

  /** Focus sur le premier élément du sélecteur, une fois l'étape ou les erreurs rendues. */
  private focaliser(selecteur: string) {
    afterNextRender(() => this.hote.querySelector<HTMLElement>(selecteur)?.focus(), {
      injector: this.injector,
    });
  }
}
