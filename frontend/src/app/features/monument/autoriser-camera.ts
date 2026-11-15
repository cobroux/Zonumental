import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  output,
  viewChild,
} from '@angular/core';

/** Feuille « Dernière étape : la caméra » (modèle O3) : explique avant la demande système (RG-026). */
@Component({
  selector: 'app-autoriser-camera',
  template: `
    <dialog #dialogue aria-labelledby="titre-camera" (close)="sortir()">
      <section class="feuille">
        <span class="poignee" aria-hidden="true"></span>
        <p class="surtitre">TON PREMIER TAMPON</p>
        <h1 id="titre-camera" tabindex="-1">Dernière étape&nbsp;: la caméra</h1>
        <p class="texte">
          Ta photo devient ton souvenir sur la page du carnet. Elle reste privée, sauf si tu choisis
          de la partager.
        </p>
        <p class="note">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.5" />
          </svg>
          <span
            >Photo prise en direct uniquement : pas d'import depuis la galerie, pour que chaque
            tampon soit mérité.</span
          >
        </p>
        <div class="actions">
          <button type="button" class="principal" (click)="autoriser()">Autoriser la caméra</button>
          <button type="button" class="secondaire" (click)="fermer()">Pas maintenant</button>
        </div>
      </section>
    </dialog>
  `,
  styleUrl: './autoriser-camera.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoriserCamera {
  readonly accepter = output();
  readonly plusTard = output();
  private readonly dialogue = viewChild.required<ElementRef<HTMLDialogElement>>('dialogue');
  private accepte = false;

  constructor() {
    afterNextRender(() => {
      const d = this.dialogue().nativeElement;
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      d.querySelector<HTMLElement>('h1')?.focus();
    });
  }

  protected autoriser() {
    this.accepte = true;
    this.fermer();
  }

  protected fermer() {
    const d = this.dialogue().nativeElement;
    if (typeof d.close === 'function') d.close();
    else this.sortir();
  }

  /** Appelé à la fermeture, aussi par Échap : une seule issue émise. */
  protected sortir() {
    (this.accepte ? this.accepter : this.plusTard).emit();
  }
}
