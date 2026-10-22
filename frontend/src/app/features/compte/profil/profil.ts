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
import { mesConsentements } from '../../../core/api/fn/compte/mes-consentements';
import { exporterMesDonnees } from '../../../core/api/fn/compte/exporter-mes-donnees';
import { modifierConsentements } from '../../../core/api/fn/compte/modifier-consentements';
import { monCompte } from '../../../core/api/fn/compte/mon-compte';
import { ConsentementsFacultatifs } from '../../../core/api/models/consentements-facultatifs';
import { Session } from '../../../core/session/session';
import { ZnIcone } from '../../../shared/ui/icone';
import { ZnMessage } from '../../../shared/ui/message';

@Component({
  selector: 'app-profil',
  imports: [RouterLink, ZnIcone, ZnMessage],
  templateUrl: './profil.html',
  styleUrl: './profil.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profil {
  private readonly api = inject(Api);
  private readonly session = inject(Session);
  private readonly historique = inject(Location);
  private readonly injector = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly pseudo = signal('');
  protected readonly consentements = signal<ConsentementsFacultatifs | null>(null);
  protected readonly erreur = signal<string | null>(null);
  protected readonly occupe = signal(false);
  protected readonly export = signal(false);

  constructor() {
    void this.charger();
  }

  protected retour() {
    this.historique.back();
  }

  protected async basculer(cle: keyof ConsentementsFacultatifs, e: Event) {
    const case_ = e.target as HTMLInputElement;
    const avant = this.consentements();
    if (!avant) return;
    if (this.occupe()) {
      case_.checked = avant[cle]; // pas de double envoi : on ignore le geste
      return;
    }
    this.erreur.set(null);
    this.occupe.set(true);
    const apres = { ...avant, [cle]: case_.checked };
    this.consentements.set(apres);
    try {
      this.consentements.set(await this.api.invoke(modifierConsentements, { body: apres }));
    } catch {
      this.consentements.set(avant);
      this.erreur.set("Ton choix n'a pas pu être enregistré. Réessaie dans un instant.");
      this.focaliser('zn-message');
    } finally {
      this.occupe.set(false);
    }
  }

  protected async exporter() {
    if (this.export()) return;
    this.erreur.set(null);
    this.export.set(true);
    try {
      const rep = await this.api.invoke$Response(exporterMesDonnees);
      // L'en-tête n'est lisible que si le CORS l'expose : sinon nom par défaut.
      const nom =
        /filename="?([^";]+)"?/.exec(rep.headers.get('Content-Disposition') ?? '')?.[1] ??
        `zonumental-export-${new Date().toISOString().slice(0, 10)}.zip`;
      this.telecharger(rep.body as unknown as Blob, nom);
    } catch {
      this.erreur.set("Ton export n'a pas pu être préparé. Réessaie dans un instant.");
      this.focaliser('zn-message');
    } finally {
      this.export.set(false);
    }
  }

  private telecharger(blob: Blob, nom: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected async deconnecter() {
    try {
      await this.session.deconnecter();
    } catch {
      // Le jeton local est déjà effacé : on quitte quand même.
    }
    this.recharger('/connexion'); // shortcut: /bienvenue n'existe pas encore (ADR 0015), à remplacer par elle
  }

  /** Rechargement complet pour vider toute la mémoire (ADR 0015). */
  protected recharger(url: string) {
    location.assign(url);
  }

  private async charger() {
    try {
      const [moi, consentements] = await Promise.all([
        this.api.invoke(monCompte),
        this.api.invoke(mesConsentements),
      ]);
      this.pseudo.set(moi.pseudo);
      this.consentements.set(consentements);
    } catch {
      this.erreur.set('Ton profil ne se charge pas. Réessaie dans un instant.');
    }
  }

  private focaliser(selecteur: string) {
    afterNextRender(() => this.hote.querySelector<HTMLElement>(selecteur)?.focus(), {
      injector: this.injector,
    });
  }
}
