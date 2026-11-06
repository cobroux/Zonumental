import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PRECISION_MAX_METRES, Proximite, formaterDistance } from '../../core/position/proximite';

/** Monuments à moins de 2 km (RG-024). La capture elle-même vient avec r1-capturer-2. */
@Component({
  selector: 'app-tamponner',
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
          } @else {
            <fieldset>
              <legend>Monuments à moins de 2 km</legend>
              @for (m of proches(); track m.numero) {
                <label>
                  <input
                    type="radio"
                    name="monument"
                    [value]="m.numero"
                    [checked]="m.numero === choix()"
                    [disabled]="m.capture"
                    (change)="choisi.set(m.numero)"
                  />
                  <span>{{ m.nom }}, {{ m.ville.nom }}</span>
                  <span>{{ m.capture ? 'Déjà tamponné' : distance(m.distance) }}</span>
                </label>
              }
            </fieldset>
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
  protected readonly choisi = signal<number | null>(null);
  /** Choix de l'explorateur, sinon le plus proche non capturé. */
  protected readonly choix = computed(
    () => this.choisi() ?? this.proches().find((m) => !m.capture)?.numero ?? null,
  );
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
