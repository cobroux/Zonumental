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
import { ActivatedRoute } from '@angular/router';
import { Api } from '../../../core/api/api';
import { renvoyerVerification } from '../../../core/api/fn/compte/renvoyer-verification';
import { verifierEmail } from '../../../core/api/fn/compte/verifier-email';
import { ZnChamp, ZnSaisie } from '../../../shared/ui/champ';
import { ZnMessage } from '../../../shared/ui/message';
import { lireProbleme } from '../probleme';

type Etat = 'chargement' | 'confirme' | 'deja' | 'expire' | 'invalide' | 'erreur';

/** Le lien de l'e-mail ne consomme rien : c'est cette page qui poste le jeton (ADR 0004, scanners anti-spam). */
@Component({
  selector: 'app-verification-email',
  imports: [ZnChamp, ZnSaisie, ZnMessage],
  templateUrl: './verification-email.html',
  styleUrl: './verification-email.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationEmail {
  private readonly api = inject(Api);
  private readonly injector = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly etat = signal<Etat>('chargement');
  protected readonly renvoi = signal(false);
  protected readonly renvoye = signal(false);
  protected readonly echecRenvoi = signal(false);
  protected readonly erreurEmail = signal<string | null>(null);
  protected readonly occupe = signal(false);
  protected readonly email = signal('');

  constructor() {
    const jeton = inject(ActivatedRoute).snapshot.queryParamMap.get('jeton');
    if (jeton) {
      // Le jeton ne reste pas dans l'URL (historique, partage d'écran).
      inject(Location).replaceState('/verifier-email');
      void this.verifier(jeton);
    } else this.terminer('invalide');
  }

  private async verifier(jeton: string) {
    try {
      await this.api.invoke(verifierEmail, { body: { jeton } });
      this.terminer('confirme');
    } catch (e) {
      const code = lireProbleme(e)?.code;
      this.terminer(
        code === 'jeton-deja-utilise'
          ? 'deja'
          : code === 'jeton-expire'
            ? 'expire'
            : code === 'jeton-invalide'
              ? 'invalide'
              : 'erreur',
      );
    }
  }

  private terminer(etat: Etat) {
    this.etat.set(etat);
    this.renvoi.set(etat === 'expire' || etat === 'invalide');
    this.focaliser('zn-message');
  }

  protected async renvoyer(e: Event) {
    e.preventDefault();
    if (this.occupe()) return;
    const adresse = this.email().trim();
    this.echecRenvoi.set(false);
    this.erreurEmail.set(adresse ? null : 'Saisis ton adresse e-mail.');
    if (!adresse) return this.focaliser('[aria-invalid="true"]');
    this.occupe.set(true);
    try {
      await this.api.invoke(renvoyerVerification, { body: { email: adresse } });
      this.renvoye.set(true);
      this.focaliser('zn-message[tabindex]:last-of-type');
    } catch (err) {
      if (lireProbleme(err)?.code === 'validation') {
        this.erreurEmail.set('Saisis une adresse e-mail valide.');
        this.focaliser('[aria-invalid="true"]');
      } else this.echecRenvoi.set(true);
    } finally {
      this.occupe.set(false);
    }
  }

  private focaliser(selecteur: string) {
    afterNextRender(() => this.hote.querySelector<HTMLElement>(selecteur)?.focus(), {
      injector: this.injector,
    });
  }
}
