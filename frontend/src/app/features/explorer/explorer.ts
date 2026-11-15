import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Profil } from '../../core/api/models/profil';
import { MonumentResume } from '../../core/api/models/monument-resume';
import { Position } from '../../core/position/position';
import { distanceMetres, formaterDistance } from '../../core/position/proximite';
import { ZnMessage } from '../../shared/ui/message';
import { ZnTampon } from '../../shared/ui/tampon';
import { ENCRE_PAR_RARETE } from '../../shared/ui/tampon-monument';
import { niveau } from '../../shared/ui/niveau';
import { SILHOUETTE } from '../../shared/ui/silhouettes';

const RARETES = { COMMUN: 'Commun', RARE: 'Rare', LEGENDAIRE: 'Légendaire' };
const MAX_HEROS = 5;
const PAS = 350; // carte 340 px + écart 10 px (maquette)
const MARCHE_M_PAR_MIN = 5000 / 60; // 5 km/h

/** Écran d'arrivée : guide tant qu'aucun tampon, sinon le dernier tampon (RG-045). */
@Component({
  selector: 'app-explorer',
  imports: [RouterLink, ZnMessage, ZnTampon],
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
    @if (heros().length) {
      <ul
        class="heros"
        #piste
        (scroll)="courant.set(index(piste))"
        aria-label="Monuments à découvrir"
      >
        @for (h of heros(); track h.m.numero; let i = $index) {
          <li class="carte" [class.j0]="jour0()">
            <article [attr.inert]="i === courant() ? null : ''" [attr.data-rarete]="h.m.rarete">
              @if (h.m.image; as img) {
                <img [src]="img.url" alt="" />
              } @else {
                <svg class="silhouette" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                  <path [attr.d]="silhouette[h.m.type]" />
                </svg>
              }
              <svg class="voile" aria-hidden="true" focusable="false" preserveAspectRatio="none">
                <defs>
                  <linearGradient [attr.id]="'v' + h.m.numero" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-opacity="0.4" />
                    <stop offset="0.28" stop-opacity="0" />
                    <stop offset="0.48" stop-opacity="0" />
                    <stop offset="1" stop-opacity="0.9" />
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" [attr.fill]="'url(#v' + h.m.numero + ')'" />
              </svg>
              <div class="haut">
                <span class="chip">N°{{ h.numero }}{{ jour0() ? '' : ' · À DÉCOUVRIR' }}</span>
                <span class="rarete">{{ raretes[h.m.rarete] }}</span>
              </div>
              <div class="bas">
                <span class="kicker">{{ kicker(h.distance) }}</span>
                <h2>{{ h.m.nom }}</h2>
                @if (h.meta) {
                  <span class="meta">{{ h.meta }}</span>
                }
                <a
                  class="aller"
                  [routerLink]="['/monument', h.m.numero]"
                  [attr.aria-label]="'Y aller : ' + h.m.nom"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                  Y aller
                </a>
              </div>
            </article>
            @if (i === courant() + 1) {
              <button
                type="button"
                class="apercu"
                (click)="piste.scrollTo({ left: i * pas })"
                aria-label="Monument suivant"
              ></button>
            }
          </li>
        }
      </ul>
    }
    @if (monuments.error()) {
      <zn-message type="erreur">
        Pas de connexion.
        <button type="button" (click)="monuments.reload()">Réessayer</button>
      </zn-message>
    } @else if (monuments.hasValue()) {
      @if (dernier(); as d) {
        <a data-dernier class="dernier" [routerLink]="['/monument', d.numero]">
          <zn-tampon
            forme="cercle"
            [encre]="encres[d.rarete]"
            [contenu]="vide"
            [decoratif]="true"
          />
          <span class="texte">
            <span class="label">Dernier tampon · </span>
            <strong>{{ d.nom }}, {{ quand(d.captureeLe!) }}</strong>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 5l7 7-7 7" />
          </svg>
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
  private readonly position = inject(Position).etat;
  protected readonly raretes = RARETES;
  protected readonly silhouette = SILHOUETTE;
  protected readonly pas = PAS;
  protected readonly courant = signal(0);
  protected readonly index = (piste: HTMLElement) => Math.round(piste.scrollLeft / PAS);
  /** Non capturés : du plus proche (position connue) ou dans l'ordre du catalogue ; calcul sur l'appareil (RG-036). */
  protected readonly heros = computed(() => {
    const coords = this.position().coords;
    return (this.monuments.hasValue() ? this.monuments.value() : [])
      .filter((x) => !x.captureeLe)
      .map((m) => {
        const distance = coords ? distanceMetres(coords, m.position) : undefined;
        const numero = String(m.numero).padStart(3, '0');
        const meta =
          distance === undefined
            ? ''
            : `${formaterDistance(distance)} · ${Math.round(distance / MARCHE_M_PAR_MIN)} min à pied`;
        return { m, distance, numero, meta };
      })
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, MAX_HEROS);
  });
  protected readonly kicker = (distance?: number) =>
    this.jour0()
      ? 'TON PREMIER TAMPON T’ATTEND'
      : distance === undefined
        ? 'IL TE MANQUE ENCORE'
        : 'LE PLUS PROCHE';
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
  protected readonly encres = ENCRE_PAR_RARETE;
  protected readonly vide = { haut: '', centre: '', bas: '' };
  /** « aujourd'hui », « hier », sinon jj/mm/aaaa ; jours civils à l'heure de Paris (RG-043). */
  protected readonly quand = (iso: string) => {
    const jour = (d: Date) =>
      d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }).split('/').reverse().join('');
    const t = new Date(iso);
    if (jour(t) === jour(new Date())) return 'aujourd’hui';
    if (jour(t) === jour(new Date(Date.now() - 86_400_000))) return 'hier';
    return t.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
  };
}
