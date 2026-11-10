import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Position } from '../../core/position/position';
import { Carnet, SEUIL_FILTRES } from './carnet';

const m = (
  numero: number,
  nom: string,
  captureeLe: string | null,
  ville = 'Paris',
  rarete = 'RARE',
) => ({
  numero,
  nom,
  captureeLe,
  type: 'CHATEAU',
  rarete,
  ville: { codeInsee: ville, nom: ville },
});

const collection = (code: string, nom: string, mons: [number, string, boolean][]) => ({
  code,
  nom,
  total: mons.length,
  captures: mons.filter((x) => x[2]).length,
  complete: mons.every((x) => x[2]),
  monuments: mons.map(([numero, n, capture]) => ({ numero, nom: n, capture })),
});

async function rendre(
  liste: object[] | { status: number },
  coords?: object,
  collections: object[] | { status: number } = [],
) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: Position,
        useValue: { etat: signal(coords ? { statut: 'ok', coords } : { statut: 'attente' }) },
      },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(Carnet);
  document.body.append(f.nativeElement);
  f.detectChanges();
  const req = http.expectOne('/api/catalogue/monuments');
  if (Array.isArray(liste)) req.flush(liste);
  else req.flush(null, { status: liste.status, statusText: 'x' });
  const rc = http.expectOne('/api/progression/collections');
  if (Array.isArray(collections)) rc.flush(collections);
  else rc.flush(null, { status: collections.status, statusText: 'x' });
  await new Promise((r) => setTimeout(r));
  TestBed.tick();
  f.detectChanges();
  return { f, el: f.nativeElement as HTMLElement };
}
const cases = (el: HTMLElement) => [...el.querySelectorAll('ul a')];

describe('Carnet', () => {
  it('sans tampon : silhouettes sans nom, compteur 0 sur N, guide 3 étapes', async () => {
    const { el } = await rendre([
      m(1, 'Tour A', null),
      m(4, 'Tour D', null),
      m(5, 'Lyon X', null, 'Lyon'),
    ]);
    expect(el.textContent).toContain('0 sur 3');
    expect(el.querySelectorAll('ol li').length).toBe(3);
    expect(cases(el).length).toBe(2);
    expect(el.textContent).not.toContain('Tour D');
    expect(cases(el)[1].getAttribute('aria-label')).toBe('N° 004, à découvrir');
    expect(cases(el)[1].textContent).toContain('4');
    expect(cases(el)[1].querySelector('svg')).not.toBeNull();
  });

  it('capturé : tampon avec numéro, nom, type, rareté ; compteur 1 sur N ; guide disparu', async () => {
    const { el } = await rendre([m(1, 'Chambord', '2026-01-01T00:00:00Z'), m(4, 'D', null)]);
    expect(el.textContent).toContain('1 sur 2');
    expect(el.querySelector('ol')).toBeNull();
    const a = cases(el)[0];
    expect(a.textContent).toContain('Chambord');
    expect(a.textContent).toContain('Rare');
    expect(a.hasAttribute('aria-label')).toBe(false);
    expect(a.textContent).toContain('N° 001');
    expect(a.textContent).toContain('Chambord');
    expect(a.getAttribute('href')).toBe('/monument/1');
    expect(cases(el)[1].textContent).not.toContain('D ');
  });

  it('une page par ville, navigation entre villes', async () => {
    const { f, el } = await rendre([
      m(2, 'B', null, 'Paris'),
      m(1, 'A', null, 'Lyon'),
      m(3, 'C', null, 'Paris'),
    ]);
    expect(el.querySelector('h2')?.textContent).toContain('Paris');
    expect(cases(el).map((a) => a.getAttribute('href'))).toEqual(['/monument/2', '/monument/3']);
    (el.querySelector('button[aria-label="Ville précédente"]') as HTMLButtonElement).click();
    f.detectChanges();
    expect(el.querySelector('h2')?.textContent).toContain('Lyon');
    expect(cases(el).length).toBe(1);
  });

  it('hors ligne : message et réessayer', async () => {
    const { el } = await rendre({ status: 0 });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Pas de connexion.');
    expect(el.querySelector('[role="alert"] button')?.textContent).toContain('Réessayer');
  });

  it('ville courante : la plus proche si position connue, sinon Paris', async () => {
    const liste = [
      { ...m(1, 'A', null, 'Lyon'), position: { latitude: 45.76, longitude: 4.83 } },
      { ...m(2, 'B', null, 'Paris'), position: { latitude: 48.85, longitude: 2.35 } },
    ];
    const a = await rendre(liste, { latitude: 45.7, longitude: 4.8 });
    expect(a.el.querySelector('h2')?.textContent).toContain('Lyon');
  });

  it('légendaire : étoile et double filet ; rare : pas d’étoile ; texte en toutes lettres', async () => {
    const { el } = await rendre([
      m(1, 'A', '2026-01-01T00:00:00Z', 'Paris', 'LEGENDAIRE'),
      m(2, 'B', '2026-01-01T00:00:00Z', 'Paris', 'RARE'),
    ]);
    expect(cases(el)[0].querySelector('.etoile')).not.toBeNull();
    expect(cases(el)[0].textContent).toContain('Légendaire');
    expect(cases(el)[1].querySelector('.etoile')).toBeNull();
  });

  it('chargement : cases squelette', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const f = TestBed.createComponent(Carnet);
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.squelette li').length).toBeGreaterThan(0);
  });

  it('a11y : progressbar et focus h1 puis h2', async () => {
    const { f, el } = await rendre([m(1, 'A', null, 'Lyon'), m(2, 'B', null, 'Paris')]);
    const p = el.querySelector('[role="progressbar"]')!;
    expect(p.getAttribute('aria-valuenow')).toBe('0');
    expect(p.getAttribute('aria-valuemin')).toBe('0');
    expect(p.getAttribute('aria-valuemax')).toBe('2');
    expect(document.activeElement).toBe(el.querySelector('h1'));
    (el.querySelector('button[aria-label="Ville précédente"]') as HTMLButtonElement).click();
    f.detectChanges();
    TestBed.tick();
    await f.whenStable();
    expect(document.activeElement).toBe(el.querySelector('h2'));
  });

  describe('filtres', () => {
    const TYPES_8 = ['CHATEAU', 'RELIGIEUX', 'PONT', 'PHARE', 'PALAIS', 'TOUR', 'MUSEE', 'AUTRE'];
    const liste = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        ...m(i + 1, `M${i + 1}`, '2026-01-01T00:00:00Z'),
        type: i === 0 ? 'PONT' : 'CHATEAU',
      }));
    const chips = (el: HTMLElement) => [
      ...el.querySelectorAll<HTMLButtonElement>('[aria-label="Filtres"] button[aria-pressed]'),
    ];
    const chip = (el: HTMLElement, t: string) => chips(el).find((b) => b.textContent!.includes(t))!;

    it('moins de 20 tampons : aucun filtre', async () => {
      const { el } = await rendre(liste(SEUIL_FILTRES - 1));
      expect(el.querySelector('[aria-label="Filtres"]')).toBeNull();
    });

    it('20 tampons : état (3) et types (8) en boutons aria-pressed avec icône, une seule rangée', async () => {
      const { el } = await rendre(liste(SEUIL_FILTRES));
      expect(chips(el).length).toBe(3 + TYPES_8.length);
      expect(chip(el, 'Tous').getAttribute('aria-pressed')).toBe('true');
      expect(chips(el).every((b) => b.querySelector('svg') !== null)).toBe(true);
      expect(el.querySelectorAll('[aria-label="Filtres"]').length).toBe(1);
    });

    it('filtre type : cases filtrées, compteur du catalogue inchangé, résultats annoncés', async () => {
      const { f, el } = await rendre(liste(SEUIL_FILTRES));
      chip(el, 'Pont').click();
      f.detectChanges();
      expect(cases(el).length).toBe(1);
      expect(chip(el, 'Pont').getAttribute('aria-pressed')).toBe('true');
      expect(chip(el, 'Pont').querySelector('.coche')).not.toBeNull();
      expect(el.querySelector('.compteur')?.textContent).toContain('20 sur 20');
      expect(el.querySelector('.resultats[role="status"]')?.textContent).toContain('1 résultat');
      chip(el, 'Pont').click();
      f.detectChanges();
      expect(cases(el).length).toBe(20);
    });

    it('filtre état : à découvrir, puis aucun résultat avec Effacer les filtres', async () => {
      const { f, el } = await rendre([...liste(SEUIL_FILTRES), m(99, 'Z', null)]);
      chip(el, 'À découvrir').click();
      f.detectChanges();
      expect(cases(el).length).toBe(1);
      chip(el, 'Pont').click();
      f.detectChanges();
      expect(cases(el).length).toBe(0);
      expect(el.textContent).toContain('Aucun monument ne correspond');
      (
        [...el.querySelectorAll('button')].find((b) =>
          b.textContent!.includes('Effacer les filtres'),
        ) as HTMLButtonElement
      ).click();
      f.detectChanges();
      expect(cases(el).length).toBe(21);
      expect(chip(el, 'Tous').getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('collections', () => {
    const paris = collection('PARIS', 'Tout Paris', [
      [1, 'A', true],
      [2, 'B', false],
      [3, 'C', false],
    ]);

    it('aucune capture dans la collection : section absente', async () => {
      const { el } = await rendre([m(1, 'A', null)], undefined, [
        collection('PARIS', 'Tout Paris', [[1, 'A', false]]),
      ]);
      expect(el.querySelector('.collections')).toBeNull();
    });

    it('au moins 1 capture : nom et progression n / total, monuments à l’ouverture', async () => {
      const { f, el } = await rendre(
        [m(1, 'A', '2026-01-01T00:00:00Z'), m(2, 'B', null), m(3, 'C', null)],
        undefined,
        [paris],
      );
      const bouton = el.querySelector('.collections button') as HTMLButtonElement;
      expect(bouton.textContent).toContain('Tout Paris');
      expect(bouton.textContent).toContain('1 / 3');
      expect(bouton.getAttribute('aria-expanded')).toBe('false');
      expect(el.querySelectorAll('.collections a').length).toBe(0);

      bouton.click();
      f.detectChanges();
      const liens = [...el.querySelectorAll<HTMLAnchorElement>('.collections a')];
      expect(bouton.getAttribute('aria-expanded')).toBe('true');
      expect(liens.map((a) => a.getAttribute('href'))).toEqual([
        '/monument/1',
        '/monument/2',
        '/monument/3',
      ]);
      expect(liens[0].hasAttribute('aria-label')).toBe(false);
      expect(liens[0].textContent).toContain('N° 001');
      expect(liens[0].textContent).toContain('A');
      expect(liens[1].getAttribute('aria-label')).toBe('N° 002, à découvrir');
      expect(liens[1].textContent).not.toContain('B');
    });

    it('collection à 0 capture masquée, l’autre affichée', async () => {
      const autre = collection('LYON', 'Lyon', [[2, 'B', false]]);
      const { el } = await rendre([m(1, 'A', '2026-01-01T00:00:00Z'), m(2, 'B', null)], undefined, [
        collection('PARIS', 'Tout Paris', [[1, 'A', true]]),
        autre,
      ]);
      const boutons = el.querySelectorAll('.collections button');
      expect(boutons.length).toBe(1);
      expect(boutons[0].textContent).toContain('Tout Paris');
    });

    it('erreur collections : section absente, grille ville intacte', async () => {
      const { el } = await rendre([m(1, 'A', '2026-01-01T00:00:00Z')], undefined, { status: 500 });
      expect(el.querySelector('.collections')).toBeNull();
      expect(el.querySelectorAll('ul.grille a').length).toBe(1);
    });

    it('second appui referme', async () => {
      const { f, el } = await rendre([m(1, 'A', '2026-01-01T00:00:00Z')], undefined, [
        collection('PARIS', 'Tout Paris', [[1, 'A', true]]),
      ]);
      const bouton = el.querySelector('.collections button') as HTMLButtonElement;
      bouton.click();
      f.detectChanges();
      bouton.click();
      f.detectChanges();
      expect(bouton.getAttribute('aria-expanded')).toBe('false');
      expect(el.querySelectorAll('.collections a').length).toBe(0);
    });
  });
});
