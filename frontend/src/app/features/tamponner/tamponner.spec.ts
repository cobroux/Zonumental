import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EtatPosition } from '../../core/position/position';
import { Proche, Proximite } from '../../core/position/proximite';
import { Tamponner } from './tamponner';

const proche = (numero: number, distance: number, capture = false) =>
  ({ numero, nom: `Monument ${numero}`, ville: { nom: 'Paris' }, distance, capture }) as Proche;

function rendre(
  etat: EtatPosition,
  liste: Proche[] = [],
  erreur = false,
  chargement = false,
  plusProche?: Proche,
) {
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
          monuments: signal(chargement ? [] : [{}]),
          plusProche: signal(plusProche),
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

  it('attente : invitation avec bouton Activer du design system, déclenché par un geste', () => {
    const { el, activer } = rendre({ statut: 'attente' });
    expect(activer).not.toHaveBeenCalled();
    const b = bouton(el, 'Activer la position') as HTMLButtonElement;
    expect(b.hasAttribute('znBouton')).toBe(true);
    b.click();
    expect(activer).toHaveBeenCalledOnce();
    expect(el.querySelector('.papier')).not.toBeNull();
  });

  it('refus : message d’erreur zn-message, réglages, Réessayer relance la demande (RG-057)', () => {
    const { el, activer } = rendre({ statut: 'refus' });
    expect(el.querySelector('zn-message[data-type="erreur"]')?.textContent).toContain('réglages');
    bouton(el, 'Réessayer')?.click();
    expect(activer).toHaveBeenCalledOnce();
  });

  it('position indisponible : message et Réessayer', () => {
    const { el, activer } = rendre({ statut: 'indisponible' });
    expect(el.querySelector('zn-message')?.textContent).toContain('Position indisponible');
    bouton(el, 'Réessayer')?.click();
    expect(activer).toHaveBeenCalledOnce();
  });

  it('catalogue en chargement : message de recherche annoncé, pas de « rien à tamponner »', () => {
    const { el } = rendre(ok(), [], false, true);
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Recherche');
    expect(el.textContent).not.toContain('Rien à tamponner');
  });

  it('liste mise en forme : numéro, nom, distance, état ; capturé marqué', () => {
    const { el } = rendre(ok(), [proche(1, 30, true), proche(2, 420)]);
    const lignes = el.querySelectorAll('ul.proches li');
    expect(lignes.length).toBe(2);
    expect(lignes[0].textContent).toContain('N°001');
    expect(lignes[0].textContent).toContain('Déjà tamponné');
    expect(lignes[1].textContent).toContain('N°002');
    expect(lignes[1].textContent).toContain('Monument 2');
    expect(lignes[1].textContent).toContain('420 m');
    expect(lignes[1].textContent).toContain('À tamponner');
  });

  it('rien à proximité : distance du plus proche, sans son nom (RG-054)', () => {
    const { el } = rendre(ok(), [], false, false, proche(7, 3400));
    expect(el.textContent).toContain('3,4 km');
    expect(el.textContent).toContain('N°007');
    expect(el.textContent).not.toContain('Monument 7');
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
