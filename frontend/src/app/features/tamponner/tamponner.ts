import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZnMessage } from '../../shared/ui/message';
import { PRECISION_MAX_METRES, Proximite, formaterDistance } from '../../core/position/proximite';

/** États de position, « rien à tamponner » (RG-024) ; le bouton central mène directement à la fiche ou à la caméra. */
@Component({
  selector: 'app-tamponner',
  imports: [RouterLink, ZnMessage],
  template: `
    <h1>Tamponner</h1>
    <div class="papier">
      @if (erreur()) {
        <zn-message type="erreur">Pas de connexion.</zn-message>
        <button znBouton type="button" (click)="recharger()">Réessayer</button>
      } @else {
        @switch (etat().statut) {
          @case ('attente') {
            <p class="invite">
              Pour trouver les monuments près de toi, Zonumental a besoin de ta position. Elle reste
              sur ton appareil.
            </p>
            <button znBouton type="button" (click)="activer()">Activer la position</button>
          }
          @case ('refus') {
            <zn-message type="erreur">
              Position refusée. Autorise-la dans les réglages de ton navigateur, puis réessaie.
            </zn-message>
            <button znBouton type="button" (click)="activer()">Réessayer</button>
          }
          @case ('indisponible') {
            <zn-message type="erreur">Position indisponible pour le moment.</zn-message>
            <button znBouton type="button" (click)="activer()">Réessayer</button>
          }
          @default {
            @if (imprecis()) {
              <zn-message type="info">Signal trop faible, réessaie à découvert</zn-message>
            }
            @if (!monuments().length) {
              <p role="status" class="invite">Recherche des monuments près de toi…</p>
            } @else if (!proches().length) {
              <p class="invite">Rien à tamponner près de toi</p>
              @if (plusProche(); as m) {
                <p class="loin">
                  Le plus proche : {{ numero(m.numero) }}, à
                  <strong>{{ distance(m.distance) }}</strong>
                </p>
              }
              <a znBouton="secondaire" routerLink="/carnet">Voir mon carnet</a>
            } @else {
              <ul class="proches">
                @for (m of proches(); track m.numero) {
                  <li>
                    @if (m.capture) {
                      <span class="ligne fait">
                        <span class="num">{{ numero(m.numero) }}</span>
                        <span class="nom">{{ m.nom }}</span>
                        <span class="etat">Déjà tamponné · {{ distance(m.distance) }}</span>
                      </span>
                    } @else {
                      <a class="ligne" [routerLink]="['/monument', m.numero]">
                        <span class="num">{{ numero(m.numero) }}</span>
                        <span class="nom">{{ m.nom }}, {{ m.ville.nom }}</span>
                        <span class="etat">À tamponner · {{ distance(m.distance) }}</span>
                      </a>
                    }
                  </li>
                }
              </ul>
              @if (!libre()) {
                <p class="invite">Déjà tamponné ici</p>
                <a znBouton="secondaire" routerLink="/carnet">Voir mon carnet</a>
              }
            }
          }
        }
      }
    </div>
  `,
  styleUrl: './tamponner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tamponner {
  private readonly proximite = inject(Proximite);
  protected readonly etat = this.proximite.position.etat;
  protected readonly proches = this.proximite.proches;
  protected readonly monuments = this.proximite.monuments;
  protected readonly plusProche = this.proximite.plusProche;
  protected readonly erreur = this.proximite.erreur;
  protected readonly distance = formaterDistance;
  protected readonly libre = computed(() => this.proches().find((m) => !m.capture));
  protected readonly imprecis = computed(() => {
    const p = this.etat().coords?.precision;
    return p === undefined || p > PRECISION_MAX_METRES;
  });

  protected numero(n: number): string {
    return `N°${String(n).padStart(3, '0')}`;
  }
  protected activer(): void {
    this.proximite.position.activer();
  }
  protected recharger(): void {
    this.proximite.recharger();
  }
}
