import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Carnet } from './carnet';

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

async function rendre(liste: object[] | { status: number }) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(Carnet);
  f.detectChanges();
  const req = http.expectOne('/api/catalogue/monuments');
  if (Array.isArray(liste)) req.flush(liste);
  else req.flush(null, { status: liste.status, statusText: 'x' });
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
    expect(a.getAttribute('aria-label')).toBe('N° 001, Chambord, château, rare, capturé');
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
});
