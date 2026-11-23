import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../core/api/api-configuration';
import { Itineraire } from '../../core/api/models/itineraire';
import { MonumentResume } from '../../core/api/models/monument-resume';
import { EtatPosition } from '../../core/position/position';
import { Proche, Proximite } from '../../core/position/proximite';
import { Carte } from './carte';
import { CalculItineraire } from './itineraire';
import { FOND_CARTE, FondCarte, OptionsFond } from './fond-carte';

const NOM_NON_CAPTURE = 'Louvre secret';
const monument = (
  numero: number,
  captureeLe: string | null,
  nom = `Monument ${numero}`,
  ville = 'Paris',
) =>
  ({
    numero,
    nom,
    captureeLe,
    ville: { nom: ville, codeInsee: '75056' },
    type: 'TOUR',
    rarete: 'COMMUN',
    position: { latitude: 48.8 + numero / 100, longitude: 2.3 },
    rayonCaptureMetres: 50,
    image: null,
  }) as MonumentResume;

const CATALOGUE = [
  monument(1, '2026-01-01T10:00:00Z'),
  monument(2, '2026-01-02T10:00:00Z'),
  monument(3, null, NOM_NON_CAPTURE),
  monument(4, null),
  monument(5, null, 'Hors Paris', 'Lyon'),
];

function fauxFond() {
  let rappel = () => undefined as void;
  let zoom = 12;
  const fond: FondCarte & { deplacer(z: number): void } = {
    project: ([lng, lat]) => ({ x: lng * 10, y: lat * 10 }),
    getZoom: () => zoom,
    on: (_evenement, cb) => (rappel = cb),
    centrer: vi.fn(),
    tracer: vi.fn(),
    effacer: vi.fn(),
    remove: vi.fn(),
    deplacer: (z) => {
      zoom = z;
      rappel();
    },
  };
  return fond;
}

async function rendre(
  options: {
    catalogue?: MonumentResume[];
    creer?: () => Promise<FondCarte>;
    position?: EtatPosition;
    plusProche?: Proche;
  } = {},
) {
  const fond = fauxFond();
  const creer = vi.fn<(o: OptionsFond) => Promise<FondCarte>>(() =>
    options.creer ? options.creer() : Promise.resolve(fond),
  );
  const etatPosition = signal<EtatPosition>(options.position ?? { statut: 'attente' });
  const activer = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideApiConfiguration(''),
      { provide: FOND_CARTE, useValue: creer },
      {
        provide: Proximite,
        useValue: {
          monuments: signal(options.catalogue ?? CATALOGUE),
          position: { etat: etatPosition, activer },
          plusProche: signal(options.plusProche),
        },
      },
    ],
  });
  const fixture: ComponentFixture<Carte> = TestBed.createComponent(Carte);
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r)); // laisse la promesse de création se résoudre
  fixture.detectChanges();
  return {
    fixture,
    fond,
    creer,
    etatPosition,
    activer,
    http: TestBed.inject(HttpTestingController),
    el: fixture.nativeElement as HTMLElement,
  };
}

describe('Carte', () => {
  it('une zone dévoilée par capture, aucune pour les autres', async () => {
    const { el } = await rendre();
    expect(el.querySelectorAll('mask circle').length).toBe(2);
  });

  it('épingle : tampon si obtenu, numéro seul sinon', async () => {
    const { el } = await rendre();
    const epingles = el.querySelectorAll('.epingles button');
    expect(epingles.length).toBe(4); // le monument de Lyon n'est pas sur la carte de Paris
    expect(epingles[0].querySelector('zn-tampon')).not.toBeNull();
    expect(epingles[2].querySelector('zn-tampon')).toBeNull();
    expect(epingles[2].textContent?.trim()).toBe('003');
    expect(epingles[2].getAttribute('aria-label')).toBe('N° 003');
  });

  it('RG-054 : le nom d’un monument non capturé n’est nulle part avant sa sélection', async () => {
    const { el, fixture } = await rendre();
    expect(el.innerHTML).not.toContain(NOM_NON_CAPTURE);
    (el.querySelectorAll('.epingles button')[2] as HTMLElement).click();
    fixture.detectChanges();
    const fiche = el.querySelector('.selection a') as HTMLAnchorElement;
    expect(fiche.textContent).toContain(NOM_NON_CAPTURE);
    expect(fiche.getAttribute('href')).toBe('/monument/3');
    (el.querySelectorAll('.epingles button')[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(el.innerHTML).not.toContain(NOM_NON_CAPTURE);
  });

  it('recalcule positions et rayon quand la carte bouge', async () => {
    const { el, fixture, fond } = await rendre();
    const cercle = () => el.querySelector('mask circle') as SVGCircleElement;
    expect(cercle().getAttribute('r')).toBe('62');
    fond.deplacer(13);
    fixture.detectChanges();
    expect(cercle().getAttribute('r')).toBe('124');
  });

  it('pastille : capturés de Paris sur catalogue de Paris, arrondi inférieur', async () => {
    const { el } = await rendre();
    expect(el.querySelector('.pastille')?.textContent).toContain('Paris dévoilé à 50 %');
  });

  it('bascule France : « Bientôt », sans carte ni pastille ; retour à Paris', async () => {
    const { el, fixture } = await rendre();
    const onglets = el.querySelectorAll<HTMLElement>('[role="tab"]');
    expect(onglets[0].getAttribute('aria-selected')).toBe('true');
    onglets[1].click();
    fixture.detectChanges();
    expect(onglets[1].getAttribute('aria-selected')).toBe('true');
    expect(el.querySelector('zn-bientot-etat')?.textContent).toContain(
      'Carte de France : bientôt disponible',
    );
    expect(el.querySelector('.pastille')).toBeNull();
    onglets[0].click();
    fixture.detectChanges();
    expect(el.querySelector('.pastille')).not.toBeNull();
  });

  it('mention d’attribution toujours visible', async () => {
    const { el } = await rendre();
    const texte = el.querySelector('.attribution')?.textContent ?? '';
    expect(texte).toContain('OpenStreetMap contributors');
    expect(texte).toContain('OpenFreeMap');
    expect(texte).toContain('OpenMapTiles');
  });

  it('sans WebGL : message de repli, pas d’erreur', async () => {
    const { el } = await rendre({ creer: () => Promise.reject(new Error('WebGL')) });
    expect(el.querySelector('[role="status"]')?.textContent).toContain('WebGL');
    expect(el.querySelectorAll('.epingles button').length).toBe(0);
  });

  it('retire la carte à la destruction', async () => {
    const { fixture, fond } = await rendre();
    fixture.destroy();
    expect(fond.remove).toHaveBeenCalled();
  });

  it('ni centre ni zoom persistés (RG-036)', async () => {
    const { fond } = await rendre();
    fond.deplacer(15);
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  describe('position et monument le plus proche (#132)', () => {
    const OK: EtatPosition = { statut: 'ok', coords: { latitude: 48.86, longitude: 2.3 } };
    const LOUVRE = {
      ...monument(4, null, 'Musée du Louvre'),
      rarete: 'RARE',
      image: { url: '/louvre.jpg' },
      distance: 1234,
      capture: false,
    } as unknown as Proche;

    it('point de position et halo, projetés comme les épingles', async () => {
      const { el } = await rendre({ position: OK });
      const point = el.querySelector('.position .repere') as SVGElement;
      expect(point.getAttribute('transform')).toBe('translate(23 488.6)');
      expect(point.querySelector('.halo')).not.toBeNull();
    });

    it.each(['attente', 'refus', 'indisponible'] as const)(
      'statut %s : ni point ni Recentrer, carte utilisable',
      async (statut) => {
        const { el } = await rendre({ position: { statut } });
        expect(el.querySelector('.position')).toBeNull();
        expect(el.querySelector('.recentrer')).toBeNull();
        expect(el.querySelectorAll('.epingles button').length).toBe(4);
      },
    );

    it('Recentrer : centre la carte sur la position', async () => {
      const { el, fond } = await rendre({ position: OK });
      const bouton = el.querySelector('.recentrer') as HTMLButtonElement;
      expect(bouton.getAttribute('aria-label')).toBe('Recentrer sur ma position');
      bouton.click();
      expect(fond.centrer).toHaveBeenCalledWith([2.3, 48.86]);
    });

    it('carte du plus proche : numéro, rareté, nom, distance, temps à pied, lien', async () => {
      const { el } = await rendre({ position: OK, plusProche: LOUVRE });
      const lien = el.querySelector('.proche') as HTMLAnchorElement;
      expect(lien.getAttribute('href')).toBe('/monument/4');
      const texte = lien.textContent ?? '';
      expect(texte).toContain('N° 004 · Rare · À découvrir');
      expect(texte).toContain('Musée du Louvre');
      expect(texte).toContain('1,2 km · 15 min à pied');
      expect(texte).toContain('Y aller');
      expect(lien.querySelector('img')?.getAttribute('src')).toBe('/louvre.jpg');
    });

    it('rien à faire : pas de carte du plus proche', async () => {
      const { el } = await rendre({ position: OK });
      expect(el.querySelector('.proche')).toBeNull();
    });

    it('la sélection d’une épingle remplace la carte du plus proche', async () => {
      const { el, fixture } = await rendre({ position: OK, plusProche: LOUVRE });
      (el.querySelectorAll('.epingles button')[2] as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('.proche')).toBeNull();
      expect(el.querySelector('.selection')).not.toBeNull();
    });
  });
  describe('itinéraire à pied (itineraire-3)', () => {
    const OK: EtatPosition = { statut: 'ok', coords: { latitude: 48.86, longitude: 2.3 } };
    const ITI: Itineraire = {
      distanceMetres: 1840,
      dureeSecondes: 1380,
      trace: {
        type: 'LineString',
        coordinates: [
          [2.3, 48.86],
          [2.29, 48.85],
        ],
      },
      etapes: [
        { instruction: 'Marchez vers le nord.', distanceMetres: 220 },
        { instruction: '<b>Vous êtes arrivé.</b>', distanceMetres: 0 },
      ],
    };
    const bouton = (el: HTMLElement, texte: string) =>
      [...el.querySelectorAll<HTMLButtonElement>('.selection button')].find((b) =>
        b.textContent?.includes(texte),
      );
    async function choisir(options: Parameters<typeof rendre>[0] = { position: OK }) {
      const r = await rendre(options);
      (r.el.querySelectorAll('.epingles button')[2] as HTMLElement).click();
      r.fixture.detectChanges();
      return r;
    }
    const attendre = async (r: Awaited<ReturnType<typeof rendre>>) => {
      await new Promise((f) => setTimeout(f)); // laisse la réponse HTTP se résoudre
      r.fixture.detectChanges();
    };
    const clic = (r: Awaited<ReturnType<typeof rendre>>, texte: string) => {
      bouton(r.el, texte)!.click();
      r.fixture.detectChanges();
    };
    async function calculer(r: Awaited<ReturnType<typeof rendre>>, corps: Itineraire = ITI) {
      clic(r, 'Itinéraire');
      if (bouton(r.el, 'Calculer')) clic(r, 'Calculer'); // la mention ne s'affiche qu'une fois
      r.http.expectOne('/api/itineraire').flush(corps);
      await attendre(r);
    }

    it('le bouton « Itinéraire » n’existe que dans la sélection', async () => {
      const { el, fixture } = await rendre({ position: OK });
      expect(bouton(el, 'Itinéraire')).toBeUndefined();
      (el.querySelectorAll('.epingles button')[2] as HTMLElement).click();
      fixture.detectChanges();
      expect(bouton(el, 'Itinéraire')).toBeDefined();
    });

    it('premier clic : mention RGPD sans appel ; « Calculer » lance l’appel ; ensuite plus de mention', async () => {
      const r = await choisir();
      clic(r, 'Itinéraire');
      expect(r.el.querySelector('.mention')?.textContent).toContain('arrondie');
      expect(r.el.querySelector('.mention a')?.getAttribute('href')).toBe('/confidentialite');
      r.http.expectNone('/api/itineraire');
      clic(r, 'Calculer');
      const req = r.http.expectOne('/api/itineraire');
      expect(req.request.body).toEqual({ depart: { latitude: 48.86, longitude: 2.3 }, numero: 3 });
      req.flush(ITI);
      await attendre(r);
      expect(r.el.querySelector('.mention')).toBeNull();
      clic(r, 'Itinéraire');
      r.http.expectOne('/api/itineraire').flush(ITI);
    });

    it('sans position : active la position puis calcule dès qu’elle arrive', async () => {
      const r = await choisir({ position: { statut: 'attente' } });
      clic(r, 'Itinéraire');
      clic(r, 'Calculer');
      expect(r.activer).toHaveBeenCalled();
      r.http.expectNone('/api/itineraire');
      r.etatPosition.set(OK);
      r.fixture.detectChanges();
      await r.fixture.whenStable();
      r.http.expectOne('/api/itineraire').flush(ITI);
    });

    it('position refusée : message et lien de repli, aucun appel', async () => {
      const r = await choisir({ position: { statut: 'attente' } });
      clic(r, 'Itinéraire');
      clic(r, 'Calculer');
      r.etatPosition.set({ statut: 'refus' });
      r.fixture.detectChanges();
      const alerte = r.el.querySelector('.selection [role="alert"]')!;
      expect(alerte.textContent).toContain('Active ta position');
      const lien = alerte.querySelector('a')!;
      expect(lien.getAttribute('href')).toContain('openstreetmap.org/directions');
      expect(lien.getAttribute('href')).not.toContain('48.86%2C2.3');
      r.http.expectNone('/api/itineraire');
    });

    it('succès : tracé, résumé en role=status, étapes en liste ordonnée sans HTML', async () => {
      const r = await choisir();
      await calculer(r);
      expect(r.fond.tracer).toHaveBeenCalledWith(ITI.trace);
      expect(r.el.querySelector('.selection p[role="status"]')?.textContent).toContain(
        '23 min · 1,8 km',
      );
      const etapes = r.el.querySelectorAll('.selection ol li');
      expect(etapes.length).toBe(2);
      expect(etapes[0].textContent).toContain('Marchez vers le nord. · 220 m');
      expect(etapes[1].querySelector('b')).toBeNull();
      expect(etapes[1].textContent).toContain('<b>Vous êtes arrivé.</b>');
    });

    it('« Effacer » et changement de sélection effacent le tracé ; focus rendu à « Itinéraire »', async () => {
      const r = await choisir();
      await calculer(r);
      clic(r, 'Effacer');
      expect(r.fond.effacer).toHaveBeenCalled();
      expect(r.el.querySelector('.selection ol')).toBeNull();
      expect(document.activeElement).toBe(bouton(r.el, 'Itinéraire'));
      await calculer(r);
      vi.mocked(r.fond.effacer).mockClear();
      (r.el.querySelectorAll('.epingles button')[3] as HTMLElement).click();
      r.fixture.detectChanges();
      expect(r.fond.effacer).toHaveBeenCalled();
      expect(r.el.querySelector('.selection ol')).toBeNull();
    });

    it('erreur 503 : role=alert et lien de repli sur le monument seul, pas de tracé', async () => {
      const r = await choisir();
      clic(r, 'Itinéraire');
      clic(r, 'Calculer');
      r.http
        .expectOne('/api/itineraire')
        .flush(JSON.stringify({ code: 'indisponible' }), { status: 503, statusText: 'x' });
      await attendre(r);
      const alerte = r.el.querySelector('.selection [role="alert"]')!;
      expect(alerte.textContent).toContain('Itinéraire indisponible pour le moment.');
      const lien = alerte.querySelector('a')!;
      expect(lien.getAttribute('href')).toContain('%3B48.83%2C2.3');
      expect(lien.getAttribute('rel')).toBe('noopener noreferrer');
      expect(lien.getAttribute('target')).toBe('_blank');
      expect(r.fond.tracer).not.toHaveBeenCalled();
    });

    it('destruction de l’écran : itinéraire effacé', async () => {
      const r = await choisir();
      await calculer(r);
      r.fixture.destroy();
      expect(TestBed.inject(CalculItineraire).etat().statut).toBe('inactif');
    });

    it('rien dans le stockage ni dans la console après un calcul (RG-036)', async () => {
      const journal = [
        vi.spyOn(console, 'log'),
        vi.spyOn(console, 'warn'),
        vi.spyOn(console, 'error'),
        vi.spyOn(console, 'debug'),
        vi.spyOn(console, 'info'),
      ];
      const r = await choisir();
      await calculer(r);
      expect(localStorage.length + sessionStorage.length).toBe(0);
      for (const j of journal) expect(j).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });
});
