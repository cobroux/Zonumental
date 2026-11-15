import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Explorer } from './explorer';

const m = (numero: number, nom: string, captureeLe: string | null) => ({
  numero,
  nom,
  captureeLe,
});

async function rendre(liste: object[] | { status: number }) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
    expect(a.textContent).toContain('N° 7');
    expect(a.textContent).toContain('Tour Eiffel');
    expect(a.textContent).toContain('05/11/2026');
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
});
