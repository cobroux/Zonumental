import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MonumentResume } from '../../core/api/models/monument-resume';
import { ZnMessage } from '../../shared/ui/message';

/** Écran d'arrivée : guide tant qu'aucun tampon, sinon le dernier tampon (RG-045). */
@Component({
  selector: 'app-explorer',
  imports: [RouterLink, ZnMessage],
  template: `
    <a class="profil" routerLink="/profil" aria-label="Mon profil">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 4a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7zM5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" />
      </svg>
    </a>
    <h1>Explorer</h1>
    @if (monuments.error()) {
      <zn-message type="erreur">
        Pas de connexion.
        <button type="button" (click)="monuments.reload()">Réessayer</button>
      </zn-message>
    } @else if (monuments.hasValue()) {
      @if (dernier(); as d) {
        <a data-dernier [routerLink]="['/monument', d.numero]">
          Dernier tampon : N° {{ d.numero }} · {{ d.nom }} ·
          {{ date(d.captureeLe!) }}
        </a>
      } @else {
        <ol>
          <li>Rapproche-toi d’un monument</li>
          <li>Prends-le en photo</li>
          <li>Reçois ton tampon</li>
        </ol>
      }
    }
  `,
  styleUrl: '../coquille.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Explorer {
  protected readonly monuments = httpResource<MonumentResume[]>(() => '/api/catalogue/monuments');
  protected readonly dernier = computed(() =>
    (this.monuments.hasValue() ? this.monuments.value() : [])
      .filter((x) => x.captureeLe)
      .reduce<MonumentResume | null>((a, x) => (!a || x.captureeLe! > a.captureeLe! ? x : a), null),
  );
  /** ISO -> jj/mm/aaaa, heure de Paris (RG-043). */
  protected readonly date = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}
