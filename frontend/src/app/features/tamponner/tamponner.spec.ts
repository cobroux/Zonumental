import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
  it('liste les monuments proches avec leur distance, le plus proche non capturé présélectionné', () => {
    const { el } = rendre(ok(), [proche(1, 30, true), proche(2, 420), proche(3, 1234)]);
    expect(el.querySelector('h1')?.textContent).toBe('Tamponner');
    const radios = [...el.querySelectorAll<HTMLInputElement>('input[type=radio]')];
    expect(radios.map((r) => r.checked)).toEqual([false, true, false]);
    expect(radios[0].disabled).toBe(true); // déjà tamponné
    const texte = el.querySelector('fieldset')?.textContent;
    expect(texte).toContain('Monument 2');
    expect(texte).toContain('420 m');
    expect(texte).toContain('1,2 km');
    expect(texte).toContain('Déjà tamponné');
  });

  it('choisir un autre monument change la sélection', () => {
    const { el, fixture } = rendre(ok(), [proche(2, 420), proche(3, 900)]);
    const radios = [...el.querySelectorAll<HTMLInputElement>('input[type=radio]')];
    radios[1].click();
    fixture.detectChanges();
    expect(radios.map((r) => r.checked)).toEqual([false, true]);
  });

  it('liste vide : « Rien à tamponner près de toi »', () => {
    const { el } = rendre(ok());
    expect(el.textContent).toContain('Rien à tamponner près de toi');
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

  it('signal faible (> 100 m) : message, la liste reste affichée', () => {
    const { el } = rendre(ok(101), [proche(2, 420)]);
    expect(el.textContent).toContain('Signal trop faible, réessaie à découvert');
    expect(el.textContent).toContain('420 m');
  });

  it('bonne précision : pas de message de signal', () => {
    expect(rendre(ok(100), [proche(2, 420)]).el.textContent).not.toContain('Signal trop faible');
  });
});
