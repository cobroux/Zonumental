import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../../core/api/api';
import { reinitialiserMotDePasse } from '../../../core/api/fn/compte/reinitialiser-mot-de-passe';
import { ZnChamp, ZnSaisie } from '../../../shared/ui/champ';
import { ZnIcone } from '../../../shared/ui/icone';
import { ZnMessage } from '../../../shared/ui/message';
import { messageDe } from '../inscription/validation';
import { lireProbleme } from '../probleme';

const LIEN = 'Demande un nouveau lien depuis « Mot de passe oublié ».';
const ERREURS_JETON: Record<string, string> = {
  'jeton-invalide': `Ce lien n'est plus valide. ${LIEN}`,
  'jeton-deja-utilise': `Ce lien a déjà servi. ${LIEN}`,
  'jeton-expire': `Ce lien a expiré. ${LIEN}`,
};

@Component({
  selector: 'app-reinitialisation',
  imports: [ZnChamp, ZnSaisie, ZnIcone, ZnMessage, RouterLink],
  templateUrl: './reinitialisation.html',
  styleUrl: '../connexion/connexion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reinitialisation {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly historique = inject(Location);
  private readonly injector = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly jeton: string;

  protected readonly motDePasse = signal('');
  protected readonly erreurMotDePasse = signal<string | null>(null);
  protected readonly global = signal<string | null>(null);
  /** Le lien est inutilisable : plus de formulaire, seulement le moyen d'en redemander un. */
  protected readonly bloque = signal(false);
  protected readonly occupe = signal(false);

  constructor() {
    this.jeton = inject(ActivatedRoute).snapshot.queryParamMap.get('jeton') ?? '';
    // Le jeton ne reste pas dans l'URL (historique, partage d'écran).
    if (this.jeton) this.historique.replaceState('/reinitialiser-mot-de-passe');
    else this.refuser(ERREURS_JETON['jeton-invalide']);
  }

  protected retour() {
    this.historique.back();
  }

  protected async valider(e: Event) {
    e.preventDefault();
    if (this.occupe()) return;
    this.global.set(null);
    const mdp = this.motDePasse();
    const code = mdp.length < 12 ? 'trop-court' : mdp.length > 128 ? 'trop-long' : null;
    this.erreurMotDePasse.set(code && messageDe('motDePasse', code));
    if (code) return this.focaliser('[aria-invalid="true"]');
    this.occupe.set(true);
    try {
      await this.api.invoke(reinitialiserMotDePasse, {
        body: { jeton: this.jeton, nouveauMotDePasse: mdp },
      });
      this.motDePasse.set('');
      await this.router.navigate(['/connexion'], { queryParams: { reinitialise: 1 } });
    } catch (err) {
      const c = lireProbleme(err)?.code ?? '';
      if (c === 'validation') {
        this.erreurMotDePasse.set(messageDe('motDePasse', 'trop-court'));
        this.focaliser('[aria-invalid="true"]');
      } else if (ERREURS_JETON[c]) this.refuser(ERREURS_JETON[c]);
      else {
        this.global.set('Une erreur est survenue. Réessaie dans un instant.');
        this.focaliser('zn-message');
      }
    } finally {
      this.occupe.set(false);
    }
  }

  private refuser(texte: string) {
    this.bloque.set(true);
    this.global.set(texte);
    this.focaliser('zn-message');
  }

  private focaliser(selecteur: string) {
    afterNextRender(() => this.hote.querySelector<HTMLElement>(selecteur)?.focus(), {
      injector: this.injector,
    });
  }
}
