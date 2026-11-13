import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Collections } from './collections';

const collection = (code: string, nom: string, mons: [number, boolean][]) => ({
  code,
  nom,
  total: mons.length,
  captures: mons.filter((x) => x[1]).length,
  complete: mons.every((x) => x[1]),
  monuments: mons.map(([numero, capture]) => ({ numero, nom: `M${numero}`, capture })),
});

async function rendre(reponse: object[] | { status: number }) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(Collections);
  document.body.append(f.nativeElement);
  f.detectChanges();
  const req = http.expectOne('/api/progression/collections');
  if (Array.isArray(reponse)) req.flush(reponse);
  else req.flush(null, { status: reponse.status, statusText: 'x' });
  await new Promise((r) => setTimeout(r));
  TestBed.tick();
  f.detectChanges();
  return { f, el: f.nativeElement as HTMLElement };
}
const cartes = (el: HTMLElement) => [...el.querySelectorAll<HTMLAnchorElement>('a.carte')];

describe('Collections', () => {
  const trois = (a: boolean, b: boolean, c: boolean): [number, boolean][] => [
    [1, a],
    [2, b],
    [3, c],
  ];

  it('h1, bilan, ordre en cours (décroissant) puis terminées, 0 capture masquée', async () => {
    const { el } = await rendre([
      collection('FINIE', 'Finie', trois(true, true, true)),
      collection('TIERS', 'Tiers', trois(true, false, false)),
      collection('DEUX', 'Deux tiers', trois(true, true, false)),
      collection('ZERO', 'Zéro', trois(false, false, false)),
    ]);
    expect(el.querySelector('h1')?.textContent).toBe('Collections');
    expect(el.querySelector('.bilan')?.textContent).toBe('1 terminée · 2 en cours');
    expect(cartes(el).map((a) => a.querySelector('.nom')?.textContent)).toEqual([
      'Deux tiers',
      'Tiers',
      'Finie',
    ]);
  });

  it('carte : lien vers le détail, n / total, mot « Terminée » écrit, nom accessible contenant le visible', async () => {
    const { el } = await rendre([collection('FINIE', 'Finie', trois(true, true, true))]);
    const [a] = cartes(el);
    expect(a.getAttribute('href')).toBe('/carnet/collections/FINIE');
    expect(a.textContent).toContain('3 / 3');
    expect(a.textContent).toContain('Terminée');
    expect(a.querySelector('progress')?.getAttribute('value')).toBe('3');
    expect(a.querySelector('.zn-sr')?.textContent).toContain('monuments');
    expect(a.hasAttribute('aria-label')).toBe(false);
  });

  it('retour vers le carnet, étiqueté « Retour »', async () => {
    const { el } = await rendre([collection('A', 'A', trois(true, false, false))]);
    const retour = el.querySelector('header a')!;
    expect(retour.getAttribute('href')).toBe('/carnet');
    expect(retour.getAttribute('aria-label')).toBe('Retour');
  });

  it('aucune collection ouverte : message et « Voir la carte »', async () => {
    const { el } = await rendre([collection('A', 'A', trois(false, false, false))]);
    expect(el.querySelector('.vide')?.textContent).toContain('Aucune collection pour l’instant');
    expect(el.querySelector('.vide a')?.getAttribute('href')).toBe('/explorer');
  });

  it('erreur : alerte et « Réessayer » relance la requête', async () => {
    const { f, el } = await rendre({ status: 500 });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Collections indisponibles');
    (el.querySelector('zn-message button') as HTMLButtonElement).click();
    f.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/progression/collections');
  });
});
