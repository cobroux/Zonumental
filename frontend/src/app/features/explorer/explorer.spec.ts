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
      'Rapproche-toi d’un monument',
      'Prends-le en photo',
      'Reçois ton tampon',
    ]);
    expect(el.querySelector('[data-dernier]')).toBeNull();
  });

  it('avec tampon : guide masqué, une ligne vers le plus récent', async () => {
    const el = await rendre([
      m(1, 'A', '2026-11-01T10:00:00Z'),
      m(7, 'Tour Eiffel', '2026-11-05T10:00:00Z'),
      m(9, 'C', null),
    ]);
    expect(el.querySelector('ol')).toBeNull();
    const a = el.querySelector('a[data-dernier]') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('/monument/7');
    expect(a.textContent).toContain('N° 7');
    expect(a.textContent).toContain('Tour Eiffel');
    expect(a.textContent).toContain('05/11/2026');
  });

  it('hors ligne : Pas de connexion. Réessayer', async () => {
    const el = await rendre({ status: 0 });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Pas de connexion.');
    expect(el.querySelector('button')?.textContent).toContain('Réessayer');
  });
});
