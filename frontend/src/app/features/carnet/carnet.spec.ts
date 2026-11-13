import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Position } from '../../core/position/position';
import { Carnet, SEUIL_FILTRES } from './carnet';

const PARIS = { latitude: 48.85, longitude: 2.35 };
const m = (
  numero: number,
  nom: string,
  captureeLe: string | null,
  ville = 'Paris',
  rarete = 'RARE',
  type = 'CHATEAU',
) => ({
  numero,
  nom,
  captureeLe,
  type,
  rarete,
  ville: { codeInsee: ville, nom: ville },
});
const pris = '2026-01-01T00:00:00Z';

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
  http.expectOne('/api/compte/moi').flush({ pseudo: 'lea' });
  await new Promise((r) => setTimeout(r));
  TestBed.tick();
  f.detectChanges();
  return { f, el: f.nativeElement as HTMLElement };
}
const cases = (el: HTMLElement) => [...el.querySelectorAll('ul.grille a')] as HTMLAnchorElement[];
const onglets = (el: HTMLElement) => [
  ...el.querySelectorAll<HTMLButtonElement>('nav[aria-label="Villes"] button'),
];
const tampons = (n: number, depart = 1, type = 'CHATEAU') =>
  Array.from({ length: n }, (_, i) => m(depart + i, `M${depart + i}`, pris, 'Paris', 'RARE', type));

describe('Carnet', () => {
  describe('jour 0', () => {
    const liste = () =>
      Array.from({ length: 28 }, (_, i) =>
        i === 0
          ? { ...m(1, 'Tour A', null), position: { latitude: 48.86, longitude: 2.35 } }
          : { ...m(i + 1, `Nom ${i + 1}`, null), position: { latitude: 48.9, longitude: 2.4 } },
      );

    it('bandeau, 6 cases vides sans nom, phrase d’accroche, ni filtres ni pagination ni collections', async () => {
      const { el } = await rendre(liste(), PARIS);
      expect(el.querySelector('h1')?.textContent).toContain('@lea');
      expect(el.querySelector('zn-bandeau')?.textContent).toContain(
        'tampon · ton carnet commence ici',
      );
      expect(cases(el).length).toBe(6);
      expect(cases(el).every((a) => a.classList.contains('vide'))).toBe(true);
      expect(el.textContent).not.toContain('Nom 2');
      expect(el.textContent).toContain('Chaque monument visité remplit une case.');
      expect(el.textContent).toContain('28 cases t’attendent à Paris.');
      expect(el.querySelector('[aria-label="Filtrer par type"]')).toBeNull();
      expect(el.querySelector('nav.pages')).toBeNull();
      expect(el.querySelector('a[href="/carnet#collections"]')).toBeNull();
      expect(el.querySelector('zn-tampon')).toBeNull();
    });

    it('case non capturée : « N°004, à découvrir », jamais le nom ; distance si la position est connue', async () => {
      const { el } = await rendre(liste(), PARIS);
      const case4 = cases(el)[3];
      expect(case4.getAttribute('href')).toBe('/monument/4');
      expect(case4.textContent).toContain('N°004');
      expect(case4.getAttribute('aria-label')).toMatch(/^N°004 \d.*, à découvrir$/);
      expect(case4.getAttribute('aria-label')).toContain(
        case4.querySelector('.indice')!.textContent,
      );
    });

    it('prochain monument : pointillé bordeaux, « Ton premier tampon · distance »', async () => {
      const { el } = await rendre(liste(), PARIS);
      const suivantes = el.querySelectorAll('a.suivante');
      expect(suivantes.length).toBe(1);
      expect(suivantes[0].textContent).toContain('N°001');
      expect(suivantes[0].textContent).toMatch(/Ton premier tampon · 1,1 km/);
      expect(suivantes[0].getAttribute('aria-label')).toContain('Ton premier tampon · 1,1 km');
    });

    it('sans position : pas de distance, pas de case marquée, nom accessible simple', async () => {
      const { el } = await rendre(liste());
      expect(el.querySelector('.indice')).toBeNull();
      expect(el.querySelector('a.suivante')).toBeNull();
      expect(cases(el)[1].getAttribute('aria-label')).toBe('N°002, à découvrir');
    });
  });

  describe('tampons', () => {
    it('capturé : tampon SVG, forme selon le type, encre selon la rareté, nom accessible = contenu', async () => {
      const { el } = await rendre([
        m(1, 'Tour Eiffel', pris, 'Paris', 'LEGENDAIRE', 'TOUR'),
        m(2, 'Arc de Triomphe', pris, 'Paris', 'RARE', 'PONT'),
        m(3, 'Panthéon', pris, 'Paris', 'COMMUN', 'RELIGIEUX'),
        m(4, 'Opéra Garnier', null),
      ]);
      const [tour, arc, pantheon] = [...el.querySelectorAll('zn-tampon')];
      expect([tour.getAttribute('data-forme'), tour.getAttribute('data-encre')]).toEqual([
        'cercle',
        'legendaire',
      ]);
      expect([arc.getAttribute('data-forme'), arc.getAttribute('data-encre')]).toEqual([
        'rectangle',
        'rare',
      ]);
      expect([pantheon.getAttribute('data-forme'), pantheon.getAttribute('data-encre')]).toEqual([
        'octogone',
        'commun',
      ]);
      const a = cases(el)[0];
      expect(a.getAttribute('href')).toBe('/monument/1');
      expect(a.classList.contains('tampon')).toBe(true);
      expect(a.hasAttribute('aria-label')).toBe(false);
      expect(a.querySelector('svg')?.getAttribute('aria-label')).toBe(
        'Tour Eiffel, N°001, Paris, légendaire, tamponné le 1 janvier 2026',
      );
      expect(a.textContent).toContain('PARIS · TOUR EIFFEL · N°001 ·');
      expect(a.textContent).toContain('LÉGENDAIRE');
    });

    it('placement déterministe : rotation et décalage posés par monument, identiques d’un rendu à l’autre', async () => {
      const { el } = await rendre(tampons(3));
      const styles = [...el.querySelectorAll<HTMLElement>('zn-tampon')].map((t) =>
        ['--rot', '--dx', '--dy'].map((p) => t.style.getPropertyValue(p).trim()).join(' '),
      );
      expect(styles.every((x) => /^-?[\d.]+deg -?[\d.]+% -?[\d.]+%$/.test(x))).toBe(true);
      expect(new Set(styles).size).toBe(3);
    });
  });

  describe('bandeau', () => {
    it('stats : tampons, légendaires (si ≥ 1), villes (si ≥ 2), pseudo du profil', async () => {
      const { el } = await rendre([
        m(1, 'A', pris, 'Paris', 'LEGENDAIRE'),
        m(2, 'B', pris, 'Lyon', 'COMMUN'),
        m(3, 'C', null, 'Marseille'),
      ]);
      const b = el.querySelector('zn-bandeau')!;
      expect(b.textContent).toContain('@lea');
      expect(b.querySelector('.stats')?.textContent).toMatch(/2\s+tampons/);
      expect(b.querySelector('.or')?.textContent).toMatch(/1\s+légendaire/);
      expect(b.querySelector('.stats')?.textContent).toContain('/3 villes');
    });

    it('accès au profil conservé', async () => {
      const { el } = await rendre([m(1, 'A', null)]);
      expect(el.querySelector('a[href="/profil"]')?.getAttribute('aria-label')).toBe('Mon profil');
    });

    it('pseudo indisponible : repli générique, le carnet reste utilisable', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: Position, useValue: { etat: signal({ statut: 'attente' }) } },
        ],
      });
      const http = TestBed.inject(HttpTestingController);
      const f = TestBed.createComponent(Carnet);
      f.detectChanges();
      http.expectOne('/api/catalogue/monuments').flush([m(1, 'A', null)]);
      http.expectOne('/api/progression/collections').flush([]);
      http.expectOne('/api/compte/moi').flush(null, { status: 500, statusText: 'x' });
      await new Promise((r) => setTimeout(r));
      TestBed.tick();
      f.detectChanges();
      expect(f.nativeElement.querySelector('h1').textContent).toContain('@explorateur');
      expect(f.nativeElement.querySelectorAll('ul.grille a').length).toBe(1);
    });
  });

  describe('villes', () => {
    const liste = [m(2, 'B', pris, 'Paris'), m(1, 'A', null, 'Lyon'), m(3, 'C', null, 'Paris')];

    it('onglets « Paris 1/2 » (compte, plus de flèches), triés par nombre de monuments puis nom', async () => {
      const { el } = await rendre(liste);
      expect(onglets(el).map((b) => b.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
        'Paris 1/2 tampons',
        'Lyon 0/1 tampons',
      ]);
      expect(onglets(el)[0].getAttribute('aria-current')).toBe('page');
      expect(el.querySelector('button[aria-label="Ville précédente"]')).toBeNull();
    });

    it('toucher un onglet affiche les tampons de cette ville', async () => {
      const { f, el } = await rendre(liste);
      expect(cases(el).map((a) => a.getAttribute('href'))).toEqual(['/monument/2', '/monument/3']);
      onglets(el)[1].click();
      f.detectChanges();
      expect(cases(el).map((a) => a.getAttribute('href'))).toEqual(['/monument/1']);
      expect(onglets(el)[1].getAttribute('aria-current')).toBe('page');
      expect(onglets(el)[0].hasAttribute('aria-current')).toBe(false);
      expect(el.querySelector('.etiquette')?.textContent).toContain('Lyon');
    });

    it('ville courante : la plus proche si position connue, sinon Paris', async () => {
      const proche = [
        { ...m(1, 'A', null, 'Lyon'), position: { latitude: 45.76, longitude: 4.83 } },
        { ...m(2, 'B', null, 'Paris'), position: { latitude: 48.85, longitude: 2.35 } },
        { ...m(3, 'C', null, 'Paris'), position: { latitude: 48.86, longitude: 2.35 } },
      ];
      const a = await rendre(proche, { latitude: 45.7, longitude: 4.8 });
      expect(onglets(a.el)[1].getAttribute('aria-current')).toBe('page');
    });
  });

  it('hors ligne : message et réessayer', async () => {
    const { el } = await rendre({ status: 0 });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Pas de connexion.');
    expect(el.querySelector('[role="alert"] button')?.textContent).toContain('Réessayer');
    expect(el.querySelector('h1')).not.toBeNull();
  });

  it('chargement : cases fantômes statiques', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const f = TestBed.createComponent(Carnet);
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.squelette li').length).toBeGreaterThan(0);
    expect(f.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Chargement du carnet',
    );
  });

  it('a11y : le focus arrive sur le h1 du carnet', async () => {
    const { el } = await rendre([m(1, 'A', null, 'Lyon'), m(2, 'B', null, 'Paris')]);
    expect(document.activeElement).toBe(el.querySelector('h1'));
  });

  describe('pagination', () => {
    it('moins de 6 tampons : pages aérées de 6 cases', async () => {
      const { f, el } = await rendre([
        ...tampons(5),
        ...Array.from({ length: 10 }, (_, i) => m(10 + i, `V${i}`, null)),
      ]);
      expect(cases(el).length).toBe(6);
      expect(el.querySelector('.etiquette')?.textContent).toContain('Page 1 / 3');
      expect(el.querySelector('zn-planche .grille')?.classList.contains('aere')).toBe(true);
      (el.querySelector('button[aria-label="Page suivante"]') as HTMLButtonElement).click();
      f.detectChanges();
      expect(el.querySelector('.etiquette')?.textContent).toContain('Page 2 / 3');
      expect(cases(el)[0].getAttribute('href')).toBe('/monument/11');
    });

    it('6 tampons ou plus : pages denses de 12 cases, flèches désactivées aux bornes', async () => {
      const { f, el } = await rendre(tampons(25));
      expect(cases(el).length).toBe(12);
      expect(el.querySelector('zn-planche .grille')?.classList.contains('aere')).toBe(false);
      const prec = el.querySelector('button[aria-label="Page précédente"]') as HTMLButtonElement;
      const suiv = el.querySelector('button[aria-label="Page suivante"]') as HTMLButtonElement;
      expect(prec.getAttribute('aria-disabled')).toBe('true');
      expect(el.querySelectorAll('.puces span').length).toBe(3);
      suiv.click();
      suiv.click();
      suiv.click();
      f.detectChanges();
      expect(cases(el).length).toBe(1);
      expect(el.querySelector('.etiquette')?.textContent).toContain('Page 3 / 3 — Paris');
      expect(suiv.getAttribute('aria-disabled')).toBe('true');
      prec.click();
      f.detectChanges();
      expect(cases(el).length).toBe(12);
    });

    it('changer de ville revient à la page 1', async () => {
      const { f, el } = await rendre([...tampons(25), m(100, 'L', null, 'Lyon')]);
      (el.querySelector('button[aria-label="Page suivante"]') as HTMLButtonElement).click();
      f.detectChanges();
      onglets(el)[1].click();
      f.detectChanges();
      onglets(el)[0].click();
      f.detectChanges();
      expect(el.querySelector('.etiquette')?.textContent).toContain('Page 1 / 3');
    });
  });

  describe('filtres', () => {
    const liste = (n: number) => tampons(n).map((x, i) => (i === 0 ? { ...x, type: 'PONT' } : x));
    const groupe = (el: HTMLElement) =>
      el.querySelector('[role="group"][aria-label="Filtrer par type"]');
    const chips = (el: HTMLElement) => [
      ...(groupe(el)?.querySelectorAll<HTMLButtonElement>('button[aria-pressed]') ?? []),
    ];
    const chip = (el: HTMLElement, t: string) => chips(el).find((b) => b.textContent!.includes(t))!;

    it('moins de 20 tampons : aucun filtre', async () => {
      const { el } = await rendre(liste(SEUIL_FILTRES - 1));
      expect(groupe(el)).toBeNull();
    });

    it('20 tampons : 3 états puis les groupes de types présents, pilules aria-pressed', async () => {
      const { el } = await rendre(liste(SEUIL_FILTRES));
      expect(chips(el).map((b) => b.textContent!.trim())).toEqual([
        'Tous',
        'Tamponnés',
        'À découvrir',
        'Arcs & ponts',
        'Châteaux & palais',
      ]);
      expect(chip(el, 'Tous').getAttribute('aria-pressed')).toBe('true');
      expect(chip(el, 'Arcs').getAttribute('aria-pressed')).toBe('false');
    });

    it('filtre de type : un seul chip actif, résultats annoncés, rappuyer revient à Tous, page 1', async () => {
      const { f, el } = await rendre(liste(SEUIL_FILTRES));
      chip(el, 'Arcs').click();
      f.detectChanges();
      expect(cases(el).length).toBe(1);
      expect(chip(el, 'Arcs').getAttribute('aria-pressed')).toBe('true');
      expect(chip(el, 'Tous').getAttribute('aria-pressed')).toBe('false');
      expect(el.querySelector('[role="status"].resultats')?.textContent).toContain('1 monument');
      chip(el, 'Arcs').click();
      f.detectChanges();
      expect(cases(el).length).toBe(12);
      expect(chip(el, 'Tous').getAttribute('aria-pressed')).toBe('true');
    });

    it('filtre d’état : à découvrir ; aucun résultat avec Effacer les filtres', async () => {
      const { f, el } = await rendre([...liste(SEUIL_FILTRES), m(99, 'Z', null, 'Lyon')]);
      chip(el, 'Tamponnés').click();
      f.detectChanges();
      expect(cases(el).length).toBe(12);
      onglets(el)[1].click();
      f.detectChanges();
      expect(chip(el, 'Tous').getAttribute('aria-pressed')).toBe('true');
      chip(el, 'Tamponnés').click();
      f.detectChanges();
      expect(cases(el).length).toBe(0);
      expect(el.textContent).toContain('Aucun monument ne correspond');
      (
        [...el.querySelectorAll('button')].find((b) =>
          b.textContent!.includes('Effacer les filtres'),
        ) as HTMLButtonElement
      ).click();
      f.detectChanges();
      expect(cases(el).length).toBe(1);
      chip(el, 'À découvrir').click();
      f.detectChanges();
      expect(cases(el).length).toBe(1);
    });
  });

  describe('collections', () => {
    const paris = collection('PARIS', 'Tout Paris', [
      [1, 'A', true],
      [2, 'B', false],
      [3, 'C', false],
    ]);

    it('aucune capture dans la collection : section et lien absents', async () => {
      const { el } = await rendre([m(1, 'A', null)], undefined, [
        collection('PARIS', 'Tout Paris', [[1, 'A', false]]),
      ]);
      expect(el.querySelector('.collections')).toBeNull();
      expect(el.querySelector('a[href="/carnet#collections"]')).toBeNull();
    });

    it('lien « Collections · N terminées › » vers la section', async () => {
      const faites = collection('LYON', 'Lyon', [[2, 'B', true]]);
      const { el } = await rendre([m(1, 'A', pris), m(2, 'B', pris), m(3, 'C', null)], undefined, [
        paris,
        faites,
      ]);
      const lien = el.querySelector('a[href="/carnet#collections"]')!;
      expect(lien.textContent).toContain('Collections · 1 terminée');
      expect(el.querySelector('#collections.collections')).not.toBeNull();
    });

    it('lien sans « terminées » quand aucune n’est complète', async () => {
      const { el } = await rendre([m(1, 'A', pris), m(2, 'B', null)], undefined, [paris]);
      expect(el.querySelector('a[href="/carnet#collections"]')?.textContent?.trim()).toBe(
        'Collections',
      );
    });

    it('au moins 1 capture : nom et progression n / total, monuments à l’ouverture', async () => {
      const { f, el } = await rendre(
        [m(1, 'A', pris), m(2, 'B', null), m(3, 'C', null)],
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
      expect(el.querySelector('#col-PARIS')).not.toBeNull();
      expect(liens.map((a) => a.getAttribute('href'))).toEqual([
        '/monument/1',
        '/monument/2',
        '/monument/3',
      ]);
      expect(liens[0].hasAttribute('aria-label')).toBe(false);
      expect(liens[0].textContent).toContain('N°001');
      expect(liens[1].getAttribute('aria-label')).toBe('N°002, à découvrir');
      expect(liens[1].textContent).not.toContain('B');
    });

    it('collection à 0 capture masquée, l’autre affichée', async () => {
      const autre = collection('LYON', 'Lyon', [[2, 'B', false]]);
      const { el } = await rendre([m(1, 'A', pris), m(2, 'B', null)], undefined, [
        collection('PARIS', 'Tout Paris', [[1, 'A', true]]),
        autre,
      ]);
      const boutons = el.querySelectorAll('.collections button');
      expect(boutons.length).toBe(1);
      expect(boutons[0].textContent).toContain('Tout Paris');
    });

    it('erreur collections : section absente, grille ville intacte', async () => {
      const { el } = await rendre([m(1, 'A', pris)], undefined, { status: 500 });
      expect(el.querySelector('.collections')).toBeNull();
      expect(el.querySelectorAll('ul.grille a').length).toBe(1);
    });

    it('second appui referme', async () => {
      const { f, el } = await rendre([m(1, 'A', pris)], undefined, [
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
