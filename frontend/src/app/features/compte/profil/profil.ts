import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../../core/api/api';
import { mesConsentements } from '../../../core/api/fn/compte/mes-consentements';
import { exporterMesDonnees } from '../../../core/api/fn/compte/exporter-mes-donnees';
import { modifierConsentements } from '../../../core/api/fn/compte/modifier-consentements';
import { listerMonuments } from '../../../core/api/fn/catalogue/lister-monuments';
import { mesSucces } from '../../../core/api/fn/progression/mes-succes';
import { monCompte } from '../../../core/api/fn/compte/mon-compte';
import { ConsentementsFacultatifs } from '../../../core/api/models/consentements-facultatifs';
import { MesSucces } from '../../../core/api/models/mes-succes';
import { Session } from '../../../core/session/session';
import { ZnIcone } from '../../../shared/ui/icone';
import { ZnMedaille } from '../../../shared/ui/medaille';
import { ZnMessage } from '../../../shared/ui/message';
import { medailles, niveau, TOTAL_SUCCES } from './medailles';

@Component({
  selector: 'app-profil',
  imports: [RouterLink, ZnIcone, ZnMedaille, ZnMessage],
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
  protected readonly succes = signal<MesSucces | null>(null);
  protected readonly succesHorsLigne = signal(false);
  /** Tampons et villes viennent du catalogue (captureeLe) ; absent = ligne de stats omise. */
  protected readonly stats = signal<{ tampons: number; villes: number } | null>(null);
  protected readonly niveau = computed(() => niveau(this.stats()?.tampons ?? 0));
  protected readonly encore = computed(() => 3 - ((this.stats()?.tampons ?? 0) % 3));
  /** Part du niveau en cours (0, 1/3, 2/3), tracé sur 220 (pathLength). */
  protected readonly anneau = computed(() => (((this.stats()?.tampons ?? 0) % 3) / 3) * 220);
  protected readonly initiale = computed(() => this.pseudo().charAt(0).toLocaleUpperCase('fr-FR'));
  protected readonly medailles = computed(() => {
    const s = this.succes();
    return s ? medailles(s) : [];
  });
  protected readonly obtenus = computed(() => this.succes()?.obtenus.length ?? 0);
  protected readonly total = computed(() =>
    Math.max(TOTAL_SUCCES, this.obtenus() + (this.succes()?.enCours.length ?? 0)),
  );
  protected readonly erreur = signal<string | null>(null);
  protected readonly occupe = signal(false);
  protected readonly export = signal(false);

  constructor() {
    void this.charger();
    void this.chargerSucces();
    void this.chargerStats();
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
    this.recharger('/bienvenue');
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

  /** Isolé du reste du profil : rien n'est stocké, « Réessayer » relance l'appel (RG-057). */
  protected async chargerSucces() {
    this.succesHorsLigne.set(false);
    try {
      this.succes.set(await this.api.invoke(mesSucces));
    } catch {
      this.succesHorsLigne.set(true);
    }
  }

  private async chargerStats() {
    try {
      const pris = (await this.api.invoke(listerMonuments)).filter((m) => m.captureeLe);
      this.stats.set({ tampons: pris.length, villes: new Set(pris.map((m) => m.ville.nom)).size });
    } catch {
      // Hors ligne : on n'invente aucun chiffre, la ligne de stats reste absente.
    }
  }

  private focaliser(selecteur: string) {
    afterNextRender(() => this.hote.querySelector<HTMLElement>(selecteur)?.focus(), {
      injector: this.injector,
    });
  }
}
