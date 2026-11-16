import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MonumentResume } from '../../core/api/models/monument-resume';
import { Proximite } from '../../core/position/proximite';
import { Carte } from './carte';
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
    remove: vi.fn(),
    deplacer: (z) => {
      zoom = z;
      rappel();
    },
  };
  return fond;
}

async function rendre(
  options: { catalogue?: MonumentResume[]; creer?: () => Promise<FondCarte> } = {},
) {
  const fond = fauxFond();
  const creer = vi.fn<(o: OptionsFond) => Promise<FondCarte>>(() =>
    options.creer ? options.creer() : Promise.resolve(fond),
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: FOND_CARTE, useValue: creer },
      { provide: Proximite, useValue: { monuments: signal(options.catalogue ?? CATALOGUE) } },
    ],
  });
  const fixture: ComponentFixture<Carte> = TestBed.createComponent(Carte);
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r)); // laisse la promesse de création se résoudre
  fixture.detectChanges();
  return { fixture, fond, creer, el: fixture.nativeElement as HTMLElement };
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
    expect(el.textContent).toContain('Bientôt disponible');
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
});
