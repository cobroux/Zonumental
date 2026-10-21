import { Injectable, inject, signal } from '@angular/core';
import { Api } from '../api/api';
import { connexion } from '../api/fn/auth/connexion';
import { deconnexion } from '../api/fn/auth/deconnexion';
import { annulerSuppression } from '../api/fn/compte/annuler-suppression';
import { demanderSuppression } from '../api/fn/compte/demander-suppression';
import { renouvellement } from '../api/fn/auth/renouvellement';

/** Session : le jeton d'accès reste en mémoire, jamais dans un stockage du navigateur (ADR 0015). */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly api = inject(Api);
  private acces: string | null = null;
  private enCours: Promise<boolean> | null = null;
  private readonly _connecte = signal(false);
  readonly connecte = this._connecte.asReadonly();

  jeton(): string | null {
    return this.acces;
  }

  async connecter(email: string, motDePasse: string): Promise<void> {
    this.poser((await this.api.invoke(connexion, { body: { email, motDePasse } })).jetonAcces);
  }

  /** Même effet qu'une connexion pour un compte en suppression (RG-014). */
  async annulerSuppression(email: string, motDePasse: string): Promise<void> {
    this.poser(
      (await this.api.invoke(annulerSuppression, { body: { email, motDePasse } })).jetonAcces,
    );
  }

  /** Le serveur efface le cookie : on vide le jeton sans renouvellement. Renvoie la date ISO d'effacement. */
  async supprimerCompte(): Promise<string> {
    const r = await this.api.invoke(demanderSuppression);
    this.poser(null);
    return r.suppressionDefinitiveLe;
  }

  /** Un seul renouvellement en vol : les appels concurrents partagent la même promesse. */
  renouveler(): Promise<boolean> {
    return (this.enCours ??= this.api
      .invoke(renouvellement)
      .then((r) => {
        this.poser(r.jetonAcces);
        return true;
      })
      .catch(() => {
        this.poser(null);
        return false;
      })
      .finally(() => (this.enCours = null)));
  }

  async deconnecter(): Promise<void> {
    try {
      await this.api.invoke(deconnexion);
    } finally {
      this.poser(null);
    }
  }

  private poser(jeton: string | null) {
    this.acces = jeton;
    this._connecte.set(jeton !== null);
  }
}
