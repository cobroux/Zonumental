import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { styleMedaille } from '../../shared/ui/medaille-catalogue';
import { ZnMedaille } from '../../shared/ui/medaille';
import { placement } from '../../shared/ui/placement';
import { ZnTampon } from '../../shared/ui/tampon';
import {
  ENCRE_PAR_RARETE,
  FORME_PAR_TYPE,
  MonumentResume,
  contenuTampon,
} from '../../shared/ui/tampon-monument';

/** Critères de RG-R2-01 connus (spec fidélité §8.2) ; les autres succès n'ont que leur nom. */
const CRITERE: Record<string, string> = {
  PREMIER_TAMPON: 'Premier monument tamponné',
  EXPLORATEUR_10: '10 monuments tamponnés',
  EXPLORATEUR_25: '25 monuments tamponnés',
  EXPLORATEUR_50: '50 monuments tamponnés',
  ENCYCLOPEDISTE: '5 types de monuments différents',
  COLLECTIONNEUR: 'Collection complétée',
};
const MAX_LIGNES = 3;
const RARETES = { COMMUN: 'Commun', RARE: 'Rare', LEGENDAIRE: 'Légendaire' };

/** Feuille de célébration d'un tampon posé (modèle O5), avec les succès gagnés par la même capture (spec fidélité §8.2 A). */
@Component({
  selector: 'app-celebration',
  imports: [RouterLink, ZnMedaille, ZnTampon],
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <dialog
      #dialogue
      aria-labelledby="titre-celebration"
      (close)="fermer.emit()"
      (click)="voile($event)"
    >
      <div class="scene">
        <div class="affiche" aria-hidden="true">
          <zn-tampon
            [style]="pose()"
            [forme]="forme()"
            [encre]="encre()"
            [contenu]="contenu()"
            [decoratif]="true"
          />
        </div>
        <section class="feuille">
          <span class="poignee" aria-hidden="true"></span>
          <p class="surtitre">N°{{ numero() }} · {{ rarete() }}</p>
          <h1 id="titre-celebration" tabindex="-1">
            {{ premier() ? 'Ton premier tampon\\u00a0!' : 'Tampon posé' }}
          </h1>
          <p class="texte">{{ monument().nom }} rejoint ton carnet, avec ta photo.</p>
          @if (succes().length) {
            <section class="succes" aria-labelledby="titre-succes-gagnes">
              <h2 id="titre-succes-gagnes">Succès débloqués</h2>
              <ul>
                @for (s of lignes(); track s.code) {
                  <li>
                    <span class="medaille" aria-hidden="true">
                      <zn-medaille
                        [nom]="s.libelle"
                        [encre]="s.style.encre"
                        [glyphe]="s.style.glyphe"
                        [texte]="s.style.texte"
                        [rotation]="s.style.rotation"
                      />
                    </span>
                    <span class="nom">{{ s.libelle }}</span>
                    @if (s.critere) {
                      <span class="critere">{{ s.critere }}</span>
                    }
                  </li>
                }
              </ul>
              @if (autres() > 0) {
                <a class="autres" routerLink="/profil"
                  >+ {{ autres() }} autre{{ autres() > 1 ? 's' : '' }} succès</a
                >
              }
            </section>
          }
          <div class="actions">
            <button type="button" class="principal" (click)="fin()">Continuer</button>
            <a class="secondaire" routerLink="/carnet">Voir mon carnet</a>
          </div>
        </section>
      </div>
    </dialog>
  `,
  styleUrl: './celebration.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Celebration {
  readonly monument = input.required<MonumentResume>();
  readonly succes = input<{ code: string; libelle: string }[]>([]);
  readonly fermer = output();
  private readonly dialogue = viewChild.required<ElementRef<HTMLDialogElement>>('dialogue');

  protected readonly forme = computed(() => FORME_PAR_TYPE[this.monument().type]);
  protected readonly encre = computed(() => ENCRE_PAR_RARETE[this.monument().rarete]);
  protected readonly contenu = computed(() => contenuTampon(this.monument()));
  protected readonly numero = computed(() => String(this.monument().numero).padStart(3, '0'));
  protected readonly rarete = computed(() =>
    RARETES[this.monument().rarete].toLocaleUpperCase('fr-FR'),
  );
  protected readonly premier = computed(() =>
    this.succes().some((s) => s.code === 'PREMIER_TAMPON'),
  );
  protected readonly lignes = computed(() =>
    this.succes()
      .slice(0, MAX_LIGNES)
      .map((s) => ({ ...s, style: styleMedaille(s.code), critere: CRITERE[s.code] })),
  );
  protected readonly autres = computed(() => Math.max(0, this.succes().length - MAX_LIGNES));
  /** Posé comme sur O5 : le tampon arrive à sa rotation finale (spec §3.5). */
  protected readonly pose = computed(() => {
    const { rotation, dx, dy } = placement(this.monument().numero);
    return `--rot: ${rotation}deg; --dx: ${dx}%; --dy: ${dy}%`;
  });

  constructor() {
    afterNextRender(() => {
      const d = this.dialogue().nativeElement;
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      d.querySelector<HTMLElement>('h1')?.focus();
    });
  }

  protected fin() {
    const d = this.dialogue().nativeElement;
    if (typeof d.close === 'function') d.close();
    else this.fermer.emit();
  }
  /** Appui sur le voile (le <dialog> lui-même) = « Continuer ». */
  protected voile(e: Event) {
    if (e.target === this.dialogue().nativeElement) this.fin();
  }
}
