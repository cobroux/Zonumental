import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Profil } from '../../core/api/models/profil';
import { MonumentResume } from '../../core/api/models/monument-resume';
import { ZnMessage } from '../../shared/ui/message';
import { niveau } from '../../shared/ui/niveau';

/** Écran d'arrivée : guide tant qu'aucun tampon, sinon le dernier tampon (RG-045). */
@Component({
  selector: 'app-explorer',
  imports: [RouterLink, ZnMessage],
  template: `
    <header>
      <div class="titre">
        <span class="date">{{ aujourdhui }}</span>
        <h1>{{ salut() }}</h1>
      </div>
      <a
        class="niveau"
        routerLink="/profil"
        [attr.aria-label]="'Niveau ' + niveau() + ', ouvrir le profil'"
      >
        <svg viewBox="0 0 52 52" aria-hidden="true" focusable="false">
          <circle class="piste" cx="26" cy="26" r="23" />
          @if (anneau()) {
            <circle
              class="progres"
              cx="26"
              cy="26"
              r="23"
              pathLength="100"
              [attr.stroke-dasharray]="anneau() + ' 100'"
              transform="rotate(-90 26 26)"
            />
          }
        </svg>
        <span class="chiffre" aria-hidden="true">{{ niveau() }}</span>
      </a>
    </header>
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
        <section class="mode-emploi" aria-labelledby="mode-emploi">
          <h2 id="mode-emploi">Comment ça marche</h2>
          <ol>
            @for (e of etapes; track e) {
              <li>{{ e }}</li>
            }
          </ol>
        </section>
      }
    }
  `,
  styleUrl: './explorer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Explorer {
  protected readonly monuments = httpResource<MonumentResume[]>(() => '/api/catalogue/monuments');
  private readonly compte = httpResource<Profil>(() => '/api/compte/moi');
  private readonly tampons = computed(
    () =>
      (this.monuments.hasValue() ? this.monuments.value() : []).filter((x) => x.captureeLe).length,
  );
  protected readonly jour0 = computed(() => this.monuments.hasValue() && this.tampons() === 0);
  protected readonly niveau = computed(() => niveau(this.tampons()));
  /** Part du niveau en cours (0, 1/3, 2/3) sur 100 ; 0 = piste seule (pas de point en Safari). */
  protected readonly anneau = computed(() => ((this.tampons() % 3) / 3) * 100);
  protected readonly salut = computed(() =>
    this.jour0()
      ? 'Bienvenue'
      : `Bonjour, ${this.compte.hasValue() ? this.compte.value().pseudo : 'explorateur'}`,
  );
  protected readonly aujourdhui =
    new Date()
      .toLocaleDateString('fr-FR', {
        timeZone: 'Europe/Paris',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      .toLocaleUpperCase('fr-FR') + ' · PARIS';
  protected readonly etapes = [
    'Va jusqu’au monument',
    'Photographie-le à moins de 150 m',
    'Reçois ton tampon',
  ];
  protected readonly dernier = computed(() =>
    (this.monuments.hasValue() ? this.monuments.value() : [])
      .filter((x) => x.captureeLe)
      .reduce<MonumentResume | null>((a, x) => (!a || x.captureeLe! > a.captureeLe! ? x : a), null),
  );
  /** ISO -> jj/mm/aaaa, heure de Paris (RG-043). */
  protected readonly date = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}
