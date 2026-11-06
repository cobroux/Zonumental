import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, Signal, effect, input, signal } from '@angular/core';
import { Monument } from '../../core/api/models/monument';
import { formaterSiecle } from './siecle';

/** Blob authentifié (intercepteur Bearer) -> URL objet, révoquée au changement et à la destruction (ADR 0021). */
function urlBlob(url: () => string | undefined): Signal<string | null> {
  const blob = httpResource.blob(url);
  const objet = signal<string | null>(null);
  effect((onCleanup) => {
    const b = blob.hasValue() ? blob.value() : undefined;
    if (!b) return objet.set(null);
    const u = URL.createObjectURL(b);
    objet.set(u);
    onCleanup(() => URL.revokeObjectURL(u));
  });
  return objet;
}

/** Fiche monument : verrouillée (indices, N&B) tant que non capturé (RG-042, RG-054). */
@Component({
  selector: 'app-fiche',
  template: `
    @if (monument.hasValue(); as _) {
      @let m = monument.value();
      <h1>{{ m.nom }}</h1>
      <p>{{ m.ville.nom }} · {{ siecle(m.siecle) }}</p>
      @if (m.image; as i) {
        <figure>
          <img [src]="couleur() ?? i.url" [alt]="m.nom" />
          <figcaption>
            Source : <a [href]="i.sourceUrl">{{ i.auteur ?? 'Wikimedia Commons' }}</a
            >,
            {{ i.licence }}
            @if (!couleur()) {
              <span>(image modifiée : noir et blanc)</span>
            }
          </figcaption>
        </figure>
      }
      @if (m.captureeLe) {
        @if (photo(); as p) {
          <img data-photo [src]="p" alt="Ta photo" />
        }
        @if (m.stats; as s) {
          <dl>
            <dt>Année</dt>
            <dd>{{ s.annee ?? '—' }}</dd>
            <dt>Style</dt>
            <dd>{{ s.style ?? '—' }}</dd>
            <dt>Hauteur</dt>
            <dd>{{ s.hauteurMetres === null ? '—' : s.hauteurMetres + ' m' }}</dd>
          </dl>
        }
        <h2>Histoire</h2>
        @if (m.histoire; as h) {
          <p>{{ h.texte }}</p>
          <p><a [href]="h.sourceUrl">Source</a>, {{ h.licence }}</p>
        } @else {
          <p>Histoire à venir</p>
        }
      }
    } @else if (monument.error()) {
      <p role="alert">Monument introuvable.</p>
    }
  `,
  styleUrl: '../coquille.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Fiche {
  readonly numero = input.required<string>();
  protected readonly monument = httpResource<Monument>(
    () => `/api/catalogue/monuments/${this.numero()}`,
  );
  protected readonly siecle = formaterSiecle;
  protected readonly couleur = urlBlob(() => {
    const m = this.monument.hasValue() ? this.monument.value() : undefined;
    return m?.captureeLe ? (m.image?.urlCouleur ?? undefined) : undefined;
  });
  protected readonly photo = urlBlob(() => {
    const m = this.monument.hasValue() ? this.monument.value() : undefined;
    return m?.captureeLe ? (m.photoUrl ?? undefined) : undefined;
  });
}
