import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EtatPosition } from '../../core/position/position';
import { Proche, Proximite } from '../../core/position/proximite';
import { Tamponner } from './tamponner';

const proche = (numero: number, distance: number, capture = false) =>
  ({ numero, nom: `Monument ${numero}`, ville: { nom: 'Paris' }, distance, capture }) as Proche;

function rendre(etat: EtatPosition, liste: Proche[] = [], erreur = false) {
  const activer = vi.fn();
  const recharger = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: Proximite,
        useValue: {
          position: { etat: signal(etat), activer },
          proches: signal(liste),
          erreur: signal(erreur),
          recharger,
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(Tamponner);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { el, activer, recharger, fixture };
}
const ok = (precision = 10): EtatPosition => ({
  statut: 'ok',
  coords: { latitude: 48, longitude: 2, precision },
});
const bouton = (el: HTMLElement, texte: string) =>
  [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(texte));

describe('Tamponner', () => {
  it('plus de liste radio : un monument proche non capturé renvoie vers sa fiche', () => {
    const { el } = rendre(ok(), [proche(1, 30, true), proche(2, 420), proche(3, 900)]);
    expect(el.querySelector('h1')?.textContent).toBe('Tamponner');
    expect(el.querySelector('input, fieldset')).toBeNull();
    const a = el.querySelector('a[href^="/monument"]') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('/monument/2');
    expect(a.textContent).toContain('Monument 2');
  });

  it('tout est déjà tamponné : message et lien vers le carnet', () => {
    const { el } = rendre(ok(), [proche(1, 30, true)]);
    expect(el.textContent).toContain('Déjà tamponné ici');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/carnet');
  });

  it('liste vide : « Rien à tamponner près de toi »', () => {
    const { el } = rendre(ok());
    expect(el.textContent).toContain('Rien à tamponner près de toi');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/carnet');
  });

  it.each(['attente', 'refus'] as const)('%s : bouton Activer déclenche la position', (statut) => {
    const { el, activer } = rendre({ statut });
    bouton(el, 'Activer')?.click();
    expect(activer).toHaveBeenCalledOnce();
  });

  it('refus : explique comment réactiver', () => {
    expect(rendre({ statut: 'refus' }).el.textContent).toContain('réglages');
  });

  it('position indisponible : message', () => {
    expect(rendre({ statut: 'indisponible' }).el.textContent).toContain('Position indisponible');
  });

  it('catalogue en erreur : « Pas de connexion. Réessayer » relance le chargement', () => {
    const { el, recharger } = rendre(ok(), [], true);
    expect(el.textContent).toContain('Pas de connexion.');
    bouton(el, 'Réessayer')?.click();
    expect(recharger).toHaveBeenCalledOnce();
  });

  it('signal faible (> 100 m) : message, le lien vers la fiche reste proposé', () => {
    const { el } = rendre(ok(101), [proche(2, 420)]);
    expect(el.textContent).toContain('Signal trop faible, réessaie à découvert');
    expect(el.textContent).toContain('420 m');
  });

  it('bonne précision : pas de message de signal', () => {
    expect(rendre(ok(100), [proche(2, 420)]).el.textContent).not.toContain('Signal trop faible');
  });
});
