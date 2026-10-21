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
import { RouterLink } from '@angular/router';
import { Session } from '../../../core/session/session';
import { ZnIcone } from '../../../shared/ui/icone';
import { ZnMessage } from '../../../shared/ui/message';

const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' });

@Component({
  selector: 'app-suppression',
  imports: [RouterLink, ZnIcone, ZnMessage],
  templateUrl: './suppression.html',
  styleUrl: './suppression.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Suppression {
  private readonly session = inject(Session);
  private readonly historique = inject(Location);
  private readonly injector = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly occupe = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly dateFinale = signal<string | null>(null);

  protected retour() {
    this.historique.back();
  }

  protected async supprimer() {
    if (this.occupe()) return;
    this.erreur.set(null);
    this.occupe.set(true);
    try {
      // Parsé en Date : le décalage horaire ne se compare jamais en texte.
      this.dateFinale.set(date.format(new Date(await this.session.supprimerCompte())));
    } catch {
      this.erreur.set("Ton compte n'a pas pu être supprimé. Réessaie dans un instant.");
      afterNextRender(() => this.hote.querySelector<HTMLElement>('zn-message')?.focus(), {
        injector: this.injector,
      });
    } finally {
      this.occupe.set(false);
    }
  }
}
