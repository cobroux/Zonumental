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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Session } from '../../../core/session/session';
import { retourSur } from '../../../core/session/retour';
import { ZnChamp, ZnSaisie } from '../../../shared/ui/champ';
import { ZnIcone } from '../../../shared/ui/icone';
import { ZnMessage } from '../../../shared/ui/message';
import { lireProbleme } from '../probleme';

const date = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeZone: 'Europe/Paris',
});

@Component({
  selector: 'app-connexion',
  imports: [ZnChamp, ZnSaisie, ZnIcone, ZnMessage, RouterLink],
  templateUrl: './connexion.html',
  styleUrl: './connexion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Connexion {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly historique = inject(Location);
  private readonly injector = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly email = signal('');
  protected readonly motDePasse = signal('');
  protected readonly erreurEmail = signal<string | null>(null);
  protected readonly erreurMotDePasse = signal<string | null>(null);
  protected readonly global = signal<string | null>(null);
  protected readonly occupe = signal(false);

  protected retour() {
    this.historique.back();
  }

  protected async valider(e: Event) {
    e.preventDefault();
    if (this.occupe()) return;
    this.global.set(null);
    const adresse = this.email().trim();
    this.erreurEmail.set(adresse ? null : 'Saisis ton adresse e-mail.');
    this.erreurMotDePasse.set(this.motDePasse() ? null : 'Saisis ton mot de passe.');
    if (!adresse || !this.motDePasse()) return this.focaliser('[aria-invalid="true"]');
    this.occupe.set(true);
    try {
      await this.session.connecter(adresse, this.motDePasse());
      // Le mot de passe ne reste pas en mémoire une fois la session ouverte.
      this.motDePasse.set('');
      await this.router.navigateByUrl(retourSur(this.route.snapshot.queryParamMap.get('retour')));
    } catch (err) {
      this.global.set(this.message(err));
      this.focaliser('zn-message');
    } finally {
      this.occupe.set(false);
    }
  }

  private message(e: unknown): string {
    const p = lireProbleme(e);
    switch (p?.code) {
      case 'identifiants-invalides':
        return 'E-mail ou mot de passe incorrect.';
      case 'validation':
        return 'Vérifie ton e-mail et ton mot de passe.';
      case 'suppression-en-cours': {
        const le = (p as { suppressionDefinitiveLe?: string }).suppressionDefinitiveLe;
        return le
          ? `Ton carnet doit être supprimé le ${date.format(new Date(le))}.`
          : 'La suppression de ton carnet est en cours.';
      }
      case 'connexion-bloquee': {
        const s = Number((e as HttpErrorResponse).headers.get('Retry-After'));
        return `Trop d'essais. Réessaie dans ${Math.max(1, Math.ceil(s / 60))} min.`;
      }
    }
    return e instanceof HttpErrorResponse && e.status === 0
      ? 'Pas de connexion. Réessaie dans un instant.'
      : 'Une erreur est survenue. Réessaie dans un instant.';
  }

  private focaliser(selecteur: string) {
    afterNextRender(() => this.hote.querySelector<HTMLElement>(selecteur)?.focus(), {
      injector: this.injector,
    });
  }
}
