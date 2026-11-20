import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DefiCourant } from '../../core/api/models/defi-courant';
import { ZnBientotEtat } from '../../shared/ui/bientot-etat';
import { ZnIcone } from '../../shared/ui/icone';
import { ZnMessage } from '../../shared/ui/message';

const MIN = 60_000;
const deux = (n: number) => String(n).padStart(2, '0');

/** « FIN DANS 3 J 04 H » ; précision à la minute (le minuteur ne se met à jour qu'une fois par minute). */
export function dureeRestante(ms: number): string {
  if (ms <= 0) return 'DÉFI TERMINÉ';
  const min = Math.max(1, Math.floor(ms / MIN));
  const j = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  if (j) return `FIN DANS ${j} J ${deux(h)} H`;
  if (h) return `FIN DANS ${h} H ${deux(min % 60)} MIN`;
  return `FIN DANS ${min} MIN`;
}

/** Écran Défis : défi de la semaine (#133). Le classement actif reste « Bientôt » (D6). */
@Component({
  selector: 'app-defis',
  imports: [RouterLink, ZnBientotEtat, ZnIcone, ZnMessage],
  template: `
    <header>
      <a class="retour" routerLink="/explorer" aria-label="Retour"><zn-icone nom="retour" /></a>
      @if (defi(); as d) {
        <span class="saison">{{ d.saison }} · semaine {{ d.semaine }}</span>
      }
    </header>
    <h1 tabindex="-1">{{ titre }}</h1>
    @if (api.error()) {
      <zn-message type="erreur">
        Défis indisponibles.
        <button type="button" (click)="api.reload()">Réessayer</button>
      </zn-message>
    } @else if (!api.hasValue()) {
      <p class="zn-sr" role="status">Chargement du défi</p>
      <div class="defi fantome" aria-hidden="true"></div>
    } @else if (defi(); as d) {
      <section class="defi" aria-labelledby="defi-nom">
        <div class="entete">
          <span>DÉFI DE LA SEMAINE</span>
          <span class="minuteur">{{ minuteur() }}</span>
        </div>
        <div class="corps">
          <div class="texte">
            <h2 id="defi-nom">{{ d.nom }}</h2>
            <p>{{ d.description }}</p>
          </div>
          <strong class="compteur"
            >{{ d.valeur }}/{{ d.seuil }}<span class="zn-sr"> tampons</span></strong
          >
        </div>
        <div class="pied">
          <ul class="pastilles">
            @for (p of d.pastilles; track $index) {
              <li [class.faite]="p.faite">
                @if (p.libelle) {
                  {{ p.libelle }}<span class="zn-sr"> : {{ p.faite ? 'fait' : 'à faire' }}</span>
                } @else {
                  <span aria-hidden="true">?</span><span class="zn-sr">à faire</span>
                }
              </li>
            }
          </ul>
          <span class="recompense"
            ><span class="zn-sr">Récompense : </span>{{ d.recompense.libelle }}
            @if (d.reussi) {
              <span class="obtenue">· Obtenue</span>
            }
          </span>
        </div>
      </section>
    } @else {
      <p class="vide">Pas de défi cette semaine. Reviens bientôt.</p>
    }
    <section class="classement">
      <h2>Classement</h2>
      <zn-bientot-etat sujet="Classement" />
    </section>
  `,
  styleUrl: './defis.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Defis {
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly titre: string = inject(ActivatedRoute).snapshot.data['titre'];
  // Relu à chaque entrée sur l'écran, donc après une capture réussie (le défi est dérivé des captures).
  protected readonly api = httpResource<DefiCourant>(() => '/api/defis/courant');
  protected readonly defi = computed(() => (this.api.hasValue() ? this.api.value().defi : null));
  private readonly maintenant = signal(Date.now());
  protected readonly minuteur = computed(() => {
    const d = this.defi();
    return d ? dureeRestante(Date.parse(d.finLe) - this.maintenant()) : '';
  });
  private reluPour: string | null = null;

  constructor() {
    afterNextRender(() => this.hote.querySelector<HTMLElement>('h1')?.focus());
    const tic = setInterval(() => {
      this.maintenant.set(Date.now());
      const d = this.defi();
      // Une relecture par échéance : si le serveur renvoie encore le même défi, on n'insiste pas.
      if (d && Date.parse(d.finLe) <= this.maintenant() && this.reluPour !== d.finLe) {
        this.reluPour = d.finLe;
        this.api.reload();
      }
    }, MIN);
    inject(DestroyRef).onDestroy(() => clearInterval(tic));
  }
}
