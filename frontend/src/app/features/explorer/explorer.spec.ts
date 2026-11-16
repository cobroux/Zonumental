import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Position, EtatPosition } from '../../core/position/position';
import { Explorer } from './explorer';

const m = (numero: number, nom: string, captureeLe: string | null, latitude = 48.86) => ({
  numero,
  nom,
  captureeLe,
  type: 'MUSEE',
  rarete: 'RARE',
  image: null,
  ville: { nom: 'Paris' },
  position: { latitude, longitude: 2.34 },
  rayonCaptureMetres: 50,
});
const ici = {
  statut: 'ok',
  coords: { latitude: 48.85, longitude: 2.34, precision: 10 },
} as EtatPosition;

async function rendre(
  liste: object[] | { status: number },
  position: EtatPosition = { statut: 'refus' },
) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: Position, useValue: { etat: signal(position) } },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(Explorer);
  f.detectChanges();
  const req = http.expectOne('/api/catalogue/monuments');
  if (Array.isArray(liste)) req.flush(liste);
  else req.flush(null, { status: liste.status, statusText: 'x' });
  await new Promise((r) => setTimeout(r));
  TestBed.tick();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

describe('Explorer', () => {
  it('sans tampon : guide en 3 étapes', async () => {
    const el = await rendre([m(1, 'A', null)]);
    const etapes = [...el.querySelectorAll('ol li')].map((l) => l.textContent?.trim());
    expect(etapes).toEqual([
      'Va jusqu’au monument',
      'Photographie-le à moins de 150 m',
      'Reçois ton tampon',
    ]);
    expect(el.querySelector('h1')?.textContent).toBe('Bienvenue');
    expect(el.querySelector('.date')?.textContent).toMatch(/ · PARIS$/);
    expect(el.querySelector('[data-dernier]')).toBeNull();
  });

  it('avec tampon : guide masqué, une ligne vers le plus récent', async () => {
    const el = await rendre([
      m(1, 'A', '2026-11-01T10:00:00Z'),
      m(7, 'Tour Eiffel', '2026-11-05T10:00:00Z'),
      m(9, 'C', null),
    ]);
    expect(el.querySelector('ol')).toBeNull();
    expect(el.querySelector('h1')?.textContent).toBe('Bonjour, explorateur');
    const a = el.querySelector('a[data-dernier]') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('/monument/7');
    expect(a.textContent).toContain('Dernier tampon');
    expect(a.textContent).toContain('Tour Eiffel, 05/11/2026');
    expect(a.querySelector('zn-tampon')).not.toBeNull(); // tampon à encre, décoratif
    expect(a.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('« hier » et « aujourd’hui » pour les tampons récents', async () => {
    const hier = new Date(Date.now() - 86_400_000).toISOString();
    const el = await rendre([m(7, 'Tour Eiffel', hier)]);
    expect(el.querySelector('a[data-dernier]')?.textContent).toMatch(/Tour Eiffel, hier/);
    TestBed.resetTestingModule();
    const el2 = await rendre([m(7, 'Tour Eiffel', new Date().toISOString())]);
    expect(el2.querySelector('a[data-dernier]')?.textContent).toMatch(/Tour Eiffel, aujourd’hui/);
  });

  it('niveau 1 + ⌊tampons ÷ 3⌋ : anneau, libellé et lien vers le profil', async () => {
    const t = '2026-11-01T10:00:00Z';
    const el = await rendre([
      m(1, 'A', t),
      m(2, 'B', t),
      m(3, 'C', t),
      m(4, 'D', t),
      m(5, 'E', null),
    ]);
    const a = el.querySelector('a.niveau') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('/profil');
    expect(a.getAttribute('aria-label')).toBe('Niveau 2, ouvrir le profil');
    expect(a.textContent?.trim()).toBe('2');
    expect(a.querySelector('.progres')?.getAttribute('stroke-dasharray')).toMatch(/^33\.3+ 100$/);
  });

  it('jour 0 : niveau 1, piste seule sans arc', async () => {
    const el = await rendre([m(1, 'A', null)]);
    expect(el.querySelector('a.niveau')?.getAttribute('aria-label')).toBe(
      'Niveau 1, ouvrir le profil',
    );
    expect(el.querySelector('.progres')).toBeNull();
  });

  it('hors ligne : Pas de connexion. Réessayer', async () => {
    const el = await rendre({ status: 0 });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Pas de connexion.');
    expect(el.querySelector('button')?.textContent).toContain('Réessayer');
  });

  describe('carte héros (fidelite-11)', () => {
    const t = '2026-11-01T10:00:00Z';
    // 0,01° de latitude = 1,1 km
    const liste = [m(1, 'Loin', null, 48.88), m(2, 'Proche', null, 48.86), m(3, 'Vu', t, 48.851)];

    it('jour 0 : le plus proche, kicker premier tampon, chip sans « à découvrir », distance et marche', async () => {
      const el = await rendre([m(1, 'Loin', null, 48.88), m(2, 'Proche', null, 48.86)], ici);
      const c = el.querySelector('article') as HTMLElement;
      expect(c.querySelector('h2')?.textContent).toBe('Proche');
      expect(c.textContent).toContain('TON PREMIER TAMPON T’ATTEND');
      expect(c.textContent).toContain('N°002');
      expect(c.textContent).not.toContain('À DÉCOUVRIR');
      expect(c.textContent).toContain('Rare');
      expect(c.textContent).toMatch(/1,1 km · 13 min à pied/);
    });

    it('au-delà de 2 h de marche : distance seule', async () => {
      const el = await rendre([m(1, 'Loin', null, 52.4)], ici);
      expect(el.querySelector('article')?.textContent).toMatch(/\d+,\d km/);
      expect(el.querySelector('article')?.textContent).not.toContain('à pied');
    });

    it('avec tampon et position : LE PLUS PROCHE non capturé, chip À DÉCOUVRIR', async () => {
      const el = await rendre(liste, ici);
      const c = el.querySelector('article') as HTMLElement;
      expect(c.querySelector('h2')?.textContent).toBe('Proche');
      expect(c.textContent).toContain('LE PLUS PROCHE');
      expect(c.textContent).toContain('N°002 · À DÉCOUVRIR');
    });

    it('« Y aller » : lien vers la fiche, nom accessible contenant le texte visible', async () => {
      const el = await rendre(liste, ici);
      const a = el.querySelector('article a.aller') as HTMLAnchorElement;
      expect(a.getAttribute('href')).toBe('/monument/2');
      expect(a.textContent).toContain('Y aller');
      expect(a.getAttribute('aria-label')).toBe('Y aller : Proche');
    });

    it('sans position : premier non capturé, sans distance, IL TE MANQUE ENCORE', async () => {
      const el = await rendre(liste);
      const c = el.querySelector('article') as HTMLElement;
      expect(c.querySelector('h2')?.textContent).toBe('Loin');
      expect(c.textContent).toContain('IL TE MANQUE ENCORE');
      expect(c.textContent).not.toMatch(/\d min à pied|km/);
    });

    it('aperçu du suivant : inerte, un bouton fait défiler', async () => {
      const el = await rendre(liste, ici);
      const cartes = el.querySelectorAll('li.carte');
      expect(cartes).toHaveLength(2);
      expect(cartes[0].querySelector('article')?.hasAttribute('inert')).toBe(false);
      expect(cartes[1].querySelector('article')?.hasAttribute('inert')).toBe(true);
      const piste = el.querySelector('ul.heros') as HTMLElement;
      piste.scrollTo = vi.fn() as never;
      (cartes[1].querySelector('button.apercu') as HTMLButtonElement).click();
      expect(piste.scrollTo).toHaveBeenCalled();
    });

    it('tout capturé : pas de carte', async () => {
      const el = await rendre([m(3, 'Vu', t)], ici);
      expect(el.querySelector('article')).toBeNull();
    });
  });
});
