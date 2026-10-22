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
import { Api } from '../../../core/api/api';
import { demanderReinitialisation } from '../../../core/api/fn/compte/demander-reinitialisation';
import { ZnChamp, ZnSaisie } from '../../../shared/ui/champ';
import { ZnIcone } from '../../../shared/ui/icone';
import { ZnMessage } from '../../../shared/ui/message';
import { lireProbleme } from '../probleme';

@Component({
  selector: 'app-mot-de-passe-oublie',
  imports: [ZnChamp, ZnSaisie, ZnIcone, ZnMessage, RouterLink],
  templateUrl: './mot-de-passe-oublie.html',
  styleUrl: '../connexion/connexion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotDePasseOublie {
  private readonly api = inject(Api);
  private readonly historique = inject(Location);
  private readonly injector = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly email = signal('');
  protected readonly erreurEmail = signal<string | null>(null);
  protected readonly global = signal<string | null>(null);
  protected readonly occupe = signal(false);
  protected readonly envoye = signal(false);

  protected retour() {
    this.historique.back();
  }

  protected async valider(e: Event) {
    e.preventDefault();
    if (this.occupe()) return;
    this.global.set(null);
    const adresse = this.email().trim();
    this.erreurEmail.set(adresse ? null : 'Saisis ton adresse e-mail.');
    if (!adresse) return this.focaliser('[aria-invalid="true"]');
    this.occupe.set(true);
    try {
      await this.api.invoke(demanderReinitialisation, { body: { email: adresse } });
      this.envoye.set(true);
      this.focaliser('zn-message');
    } catch (err) {
      if (lireProbleme(err)?.code === 'validation') {
        this.erreurEmail.set('Saisis une adresse e-mail valide.');
        this.focaliser('[aria-invalid="true"]');
      } else {
        this.global.set('Une erreur est survenue. Réessaie dans un instant.');
        this.focaliser('zn-message');
      }
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
