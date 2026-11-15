import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRECISION_MAX_METRES, Proximite, formaterDistance } from '../../core/position/proximite';

/** États de position, « rien à tamponner » (RG-024) ; le bouton central mène directement à la fiche ou à la caméra. */
@Component({
  selector: 'app-tamponner',
  imports: [RouterLink],
  template: `
    <h1>Tamponner</h1>
    @if (erreur()) {
      <p role="alert">
        Pas de connexion.
        <button type="button" (click)="recharger()">Réessayer</button>
      </p>
    } @else {
      @switch (etat().statut) {
        @case ('attente') {
          <p>Pour trouver les monuments près de toi, Zonumental a besoin de ta position.</p>
          <button type="button" (click)="activer()">Activer la position</button>
        }
        @case ('refus') {
          <p role="alert">
            Position refusée. Autorise-la dans les réglages de ton navigateur, puis réessaie.
          </p>
          <button type="button" (click)="activer()">Activer la position</button>
        }
        @case ('indisponible') {
          <p role="alert">Position indisponible pour le moment.</p>
        }
        @default {
          @if (imprecis()) {
            <p role="status">Signal trop faible, réessaie à découvert</p>
          }
          @if (!proches().length) {
            <p>Rien à tamponner près de toi</p>
            <a routerLink="/carnet">Voir mon carnet</a>
          } @else if (libre(); as m) {
            <a [routerLink]="['/monument', m.numero]">
              {{ m.nom }}, {{ m.ville.nom }} · {{ distance(m.distance) }}
            </a>
          } @else {
            <p>Déjà tamponné ici</p>
            <a routerLink="/carnet">Voir mon carnet</a>
          }
        }
      }
    }
  `,
  styleUrl: '../coquille.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tamponner {
  private readonly proximite = inject(Proximite);
  protected readonly etat = this.proximite.position.etat;
  protected readonly proches = this.proximite.proches;
  protected readonly erreur = this.proximite.erreur;
  protected readonly distance = formaterDistance;
  protected readonly libre = computed(() => this.proches().find((m) => !m.capture));
  protected readonly imprecis = computed(() => {
    const p = this.etat().coords?.precision;
    return p === undefined || p > PRECISION_MAX_METRES;
  });

  protected activer(): void {
    this.proximite.position.activer();
  }
  protected recharger(): void {
    this.proximite.recharger();
  }
}
