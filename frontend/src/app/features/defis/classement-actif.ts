import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Classement } from '../../core/api/models/classement';
import { LigneClassement } from '../../core/api/models/ligne-classement';
import { ZnBientotEtat } from '../../shared/ui/bientot-etat';
import { ZnMessage } from '../../shared/ui/message';

// Q-36 : le classement est celui de Paris tant que la ville de l'appelant n'est pas exposée.
const CODE_INSEE_PARIS = '75056';

type Portee = 'VILLE' | 'FRANCE';
type Rangee = { ligne: LigneClassement } | { ecart: true };

/** « = », « +n », « −n » ; null (non classé la semaine précédente) : rien. */
export function tendance(t: number | null): string {
  if (t === null) return '';
  return t === 0 ? '=' : t > 0 ? `+${t}` : `−${-t}`;
}

/** Classement actif (defis-2) : onglets, podium, « ··· », lignes autour de moi. France : « Bientôt » (D6). */
@Component({
  selector: 'app-classement-actif',
  imports: [RouterLink, ZnBientotEtat, ZnMessage],
  template: `
    <div class="onglets" role="tablist" aria-label="Portée du classement">
      <button type="button" role="tab" aria-selected="false" disabled>Amis</button>
      @for (o of onglets; track o.portee) {
        <button
          type="button"
          role="tab"
          [id]="'onglet-' + o.portee"
          [attr.aria-selected]="portee() === o.portee"
          [attr.aria-controls]="'panneau'"
          [tabindex]="portee() === o.portee ? 0 : -1"
          (click)="portee.set(o.portee)"
          (keydown)="clavier($event)"
        >
          {{ o.libelle }}
        </button>
      }
    </div>
    <div id="panneau" role="tabpanel" [attr.aria-labelledby]="'onglet-' + portee()">
      @if (portee() === 'FRANCE') {
        <zn-bientot-etat sujet="France" />
      } @else if (api.error()) {
        <zn-message type="erreur">
          Classement indisponible.
          <button type="button" (click)="api.reload()">Réessayer</button>
        </zn-message>
      } @else if (!api.hasValue()) {
        <p class="zn-sr" role="status">Chargement du classement</p>
        <div class="fantome" aria-hidden="true"></div>
      } @else {
        <ol class="lignes">
          @for (r of rangees(); track $index) {
            @if ('ecart' in r) {
              <li class="ecart" aria-hidden="true">···</li>
            } @else {
              <li [class.toi]="r.ligne.moi" [class]="medaille(r.ligne.rang)">
                <span class="rang">
                  @if (r.ligne.rang !== null) {
                    <span class="zn-sr">Rang </span>{{ r.ligne.rang }}
                  } @else {
                    <span aria-hidden="true">–</span>
                  }
                </span>
                <span class="avatar" aria-hidden="true">{{
                  r.ligne.moi ? 'T' : r.ligne.pseudo.charAt(0).toUpperCase()
                }}</span>
                <span class="nom">
                  <strong>{{ r.ligne.moi ? 'Toi' : '@' + r.ligne.pseudo }}</strong>
                  @if (r.ligne.rang === null) {
                    <span class="meta">Non classé</span>
                  }
                </span>
                <span class="score">
                  <strong
                    >{{ r.ligne.score }} {{ r.ligne.score > 1 ? 'tampons' : 'tampon' }}</strong
                  >
                  @if (tendance(r.ligne.tendance); as t) {
                    <span
                      class="tendance"
                      [class.hausse]="r.ligne.tendance! > 0"
                      [class.baisse]="r.ligne.tendance! < 0"
                      ><span class="zn-sr">Tendance : </span>{{ t }}</span
                    >
                  }
                </span>
              </li>
            }
          }
        </ol>
        <p class="aide">
          @if (sansConsentement()) {
            Ton pseudo n’apparaît dans un classement que si tu l’acceptes.
            <a routerLink="/confidentialite">Confidentialité</a>
          } @else {
            Tu apparais sous ton pseudo, jamais sous ton nom.
          }
        </p>
      }
    </div>
  `,
  styleUrl: './classement-actif.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassementActif {
  protected readonly onglets: { portee: Portee; libelle: string }[] = [
    { portee: 'VILLE', libelle: 'Paris' },
    { portee: 'FRANCE', libelle: 'France' },
  ];
  protected readonly portee = signal<Portee>('VILLE');
  protected readonly api = httpResource<Classement>(
    () => `/api/classement?portee=VILLE&ville=${CODE_INSEE_PARIS}`,
  );
  protected readonly tendance = tendance;
  private readonly donnees = computed(() => (this.api.hasValue() ? this.api.value() : null));
  protected readonly rangees = computed<Rangee[]>(() => {
    const d = this.donnees();
    if (!d) return [];
    const autour = d.autourDeMoi;
    const ecart = autour.length > 0 && (autour[0].rang ?? 0) > 4;
    return [
      ...d.podium.map((ligne) => ({ ligne })),
      ...(ecart ? [{ ecart: true as const }] : []),
      ...autour.map((ligne) => ({ ligne })),
    ];
  });
  protected readonly sansConsentement = computed(
    () => this.donnees()?.autourDeMoi.some((l) => l.moi && l.rang === null) ?? false,
  );

  protected medaille(rang: number | null): string {
    return rang !== null && rang <= 3 ? `medaille m${rang}` : '';
  }

  protected clavier(e: KeyboardEvent): void {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const suivant = this.portee() === 'VILLE' ? 'FRANCE' : 'VILLE';
    this.portee.set(suivant);
    queueMicrotask(() =>
      (e.target as HTMLElement).parentElement
        ?.querySelector<HTMLElement>(`#onglet-${suivant}`)
        ?.focus(),
    );
  }
}
