import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { LancementClassementVille } from '../../core/api/models/lancement-classement-ville';
import { ZnMessage } from '../../shared/ui/message';
import { ClassementActif } from './classement-actif';

// Q-36 : le classement est celui de Paris tant que la ville de l'appelant n'est pas exposée.
const CODE_INSEE_PARIS = '75056';

/** Classement : état de lancement « n / 50 » (#134). Ouvert : classement actif (defis-2). */
@Component({
  selector: 'app-classement-lancement',
  imports: [ClassementActif, ZnMessage],
  template: `
    @if (api.error()) {
      <zn-message type="erreur">
        Classement indisponible.
        <button type="button" (click)="api.reload()">Réessayer</button>
      </zn-message>
    } @else if (!api.hasValue()) {
      <p class="zn-sr" role="status">Chargement du classement</p>
      <div class="carte fantome" aria-hidden="true"></div>
    } @else if (l(); as d) {
      @if (d.ouvert) {
        <app-classement-actif />
      } @else {
        <div class="carte">
          <h3>Le classement de {{ d.ville.nom }} s'ouvre à {{ d.seuil }} explorateurs</h3>
          <p class="aide">En attendant, mesure-toi à tes amis.</p>
          <div class="progression">
            <div
              class="barre"
              role="progressbar"
              [attr.aria-label]="'Explorateurs de ' + d.ville.nom"
              aria-valuemin="0"
              [attr.aria-valuemax]="d.seuil"
              [attr.aria-valuenow]="d.explorateurs"
              [attr.aria-valuetext]="d.explorateurs + ' sur ' + d.seuil"
            >
              <span [style.inline-size.%]="pourcent()"></span>
            </div>
            <span class="compte" aria-hidden="true">{{ d.explorateurs }} / {{ d.seuil }}</span>
          </div>
          <ul class="lignes">
            <li class="toi">
              <span class="avatar" aria-hidden="true">T</span>
              <strong>Toi</strong>
              <span class="score">
                {{ d.moi.tampons }} {{ d.moi.tampons > 1 ? 'tampons' : 'tampon' }}
                @if (!d.consentementClassement) {
                  <span class="non-classe">· Non classé</span>
                }
              </span>
            </li>
            <li class="libre">
              <span class="avatar vide" aria-hidden="true"></span>
              <span>Une place libre pour un ami</span>
            </li>
          </ul>
          <button type="button" znBouton class="inviter" (click)="inviter()">
            Inviter des amis
          </button>
          @if (retour(); as r) {
            <p class="retour-inviter" role="status">{{ r }}</p>
          }
          <p class="aide">
            {{
              d.consentementClassement
                ? 'Tu apparais sous ton pseudo, jamais sous ton nom.'
                : 'Ton pseudo n’apparaît dans un classement que si tu l’acceptes.'
            }}
          </p>
        </div>
      }
    }
  `,
  styleUrl: './classement-lancement.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassementLancement {
  protected readonly api = httpResource<LancementClassementVille>(
    () => `/api/classement/villes/${CODE_INSEE_PARIS}/lancement`,
  );
  protected readonly l = computed(() => (this.api.hasValue() ? this.api.value() : null));
  protected readonly pourcent = computed(() => {
    const d = this.l();
    return d ? Math.min(100, Math.round((d.explorateurs / d.seuil) * 100)) : 0;
  });
  protected readonly retour = signal('');

  /** Partage natif du lien public ; repli copie, puis affichage du lien. Aucun endpoint. */
  protected async inviter(): Promise<void> {
    const url = location.origin;
    this.retour.set('');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Zonumental', text: 'Rejoins-moi sur Zonumental', url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        this.retour.set('Lien copié');
      } else {
        this.retour.set(`Copie ce lien : ${url}`);
      }
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') this.retour.set(`Copie ce lien : ${url}`);
    }
  }
}
