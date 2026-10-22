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
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../../core/api/api';
import { renvoyerVerification } from '../../../core/api/fn/compte/renvoyer-verification';
import { ZnIcone } from '../../../shared/ui/icone';
import { ZnMessage } from '../../../shared/ui/message';

type Resultat = 'envoye' | 'limite' | 'erreur';

/** Après l'inscription (RG-007). L'adresse voyage dans l'état de navigation, jamais dans l'URL. */
@Component({
  selector: 'app-verifie-ton-email',
  imports: [ZnIcone, ZnMessage, RouterLink],
  templateUrl: './verifie-ton-email.html',
  styleUrl: './verifie-ton-email.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifieTonEmail {
  private readonly api = inject(Api);
  private readonly injector = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly historique = inject(Location);

  // history.state survit au rechargement ; sans adresse, on propose la connexion.
  protected readonly email: string | null =
    (inject(Router).currentNavigation()?.extras.state ?? history.state)?.email ?? null;
  protected readonly occupe = signal(false);
  protected readonly resultat = signal<Resultat | null>(null);

  protected retour() {
    this.historique.back();
  }

  protected async renvoyer() {
    if (this.occupe() || !this.email) return;
    this.occupe.set(true);
    this.resultat.set(null);
    try {
      await this.api.invoke(renvoyerVerification, { body: { email: this.email } });
      this.resultat.set('envoye');
    } catch (e) {
      this.resultat.set(e instanceof HttpErrorResponse && e.status === 429 ? 'limite' : 'erreur');
    } finally {
      this.occupe.set(false);
    }
    afterNextRender(() => this.hote.querySelector<HTMLElement>('zn-message')?.focus(), {
      injector: this.injector,
    });
  }
}
