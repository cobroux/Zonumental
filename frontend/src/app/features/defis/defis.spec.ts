import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Session } from '../../core/session/session';
import { dureeRestante } from './defis';
import { DEFIS_ROUTES } from './defis.routes';

const MAINTENANT = Date.parse('2026-11-19T19:00:00Z');
const defi = (over: object = {}) => ({
  code: 'TROIS_DOMES',
  nom: 'Les trois dômes',
  description: 'Panthéon, Sacré-Cœur et Invalides.',
  saison: "Saison d'automne",
  semaine: 7,
  debutLe: '2026-11-15T23:00:00Z',
  finLe: '2026-11-22T23:00:00Z',
  seuil: 3,
  valeur: 2,
  reussi: false,
  recompense: { code: 'DEFI_TROIS_DOMES', libelle: 'Tampon doré' },
  pastilles: [
    { libelle: 'Panthéon', faite: true },
    { libelle: 'Sacré-Cœur', faite: true },
    { libelle: 'Invalides', faite: false },
  ],
  ...over,
});

async function rendre(corps: object | { status: number }) {
  vi.useFakeTimers({ now: MAINTENANT, toFake: ['Date', 'setInterval', 'clearInterval'] });
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: 'defis', children: DEFIS_ROUTES }]),
      { provide: Session, useValue: { connecte: () => true } },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/defis');
  const req = http.expectOne('/api/defis/courant');
  if ('status' in corps) req.flush(null, { status: corps.status, statusText: 'x' });
  else req.flush(corps);
  await vi.advanceTimersByTimeAsync(0);
  TestBed.tick();
  harness.detectChanges();
  return { http, harness, el: harness.routeNativeElement as HTMLElement };
}

describe('écran Défis', () => {
  afterEach(() => vi.useRealTimers());

  it('titre, retour, barre, classement « Bientôt » conservé (D6)', async () => {
    const { el } = await rendre({ defi: defi() });
    expect(el.querySelector('h1')?.textContent).toBe('Défis');
    expect(el.querySelector('a[aria-label="Retour"]')?.getAttribute('href')).toBe('/explorer');
    expect(el.querySelector('zn-bientot-etat')?.textContent).toContain('Classement : bientôt');
    expect(DEFIS_ROUTES[0].data?.['navigation']).toBe(true);
  });

  it('carte : saison, minuteur, nom, description, compteur, pastilles, récompense', async () => {
    const { el } = await rendre({ defi: defi() });
    const carte = el.querySelector('section.defi') as HTMLElement;
    expect(el.querySelector('.saison')?.textContent).toBe("Saison d'automne · semaine 7");
    expect(carte.querySelector('.minuteur')?.textContent).toBe('FIN DANS 3 J 04 H');
    expect(carte.querySelector('h2')?.textContent).toBe('Les trois dômes');
    expect(carte.textContent).toContain('Panthéon, Sacré-Cœur et Invalides.');
    expect(carte.querySelector('.compteur')?.textContent).toContain('2/3');
    const pastilles = [...carte.querySelectorAll('li')].map((l) => l.textContent?.trim());
    expect(pastilles).toEqual(['Panthéon : fait', 'Sacré-Cœur : fait', 'Invalides : à faire']);
    expect(carte.querySelector('.recompense')?.textContent).toContain('Tampon doré');
  });

  it('pastille non faite sans libellé : « ? » à l’écran, « à faire » pour le lecteur d’écran', async () => {
    const { el } = await rendre({
      defi: defi({
        pastilles: [
          { libelle: 'Tour A', faite: true },
          { libelle: null, faite: false },
          { libelle: null, faite: false },
        ],
      }),
    });
    const li = el.querySelectorAll('section.defi li')[1];
    expect(li.querySelector('[aria-hidden="true"]')?.textContent).toBe('?');
    expect(li.querySelector('.zn-sr')?.textContent).toBe('à faire');
  });

  it('défi réussi : récompense marquée obtenue', async () => {
    const { el } = await rendre({ defi: defi({ reussi: true, valeur: 3 }) });
    expect(el.querySelector('.recompense')?.textContent).toContain('Obtenue');
  });

  it('defi null : état vide, pas de carte', async () => {
    const { el } = await rendre({ defi: null });
    expect(el.querySelector('section.defi')).toBeNull();
    expect(el.textContent).toContain('Pas de défi cette semaine');
  });

  it('erreur : message et Réessayer relit l’endpoint', async () => {
    const { el, http, harness } = await rendre({ status: 500 });
    expect(el.querySelector('zn-message')?.textContent).toContain('Défis indisponibles');
    el.querySelector<HTMLButtonElement>('zn-message button')!.click();
    TestBed.tick();
    http.expectOne('/api/defis/courant').flush({ defi: defi() });
    await vi.advanceTimersByTimeAsync(0);
    TestBed.tick();
    harness.detectChanges();
    expect(el.querySelector('h2')?.textContent).toBe('Les trois dômes');
  });

  it('minuteur à 0 : relit l’endpoint une seule fois', async () => {
    const fin = '2026-11-19T19:01:00Z';
    const { el, http } = await rendre({ defi: defi({ finLe: fin }) });
    expect(el.querySelector('.minuteur')?.textContent).toBe('FIN DANS 1 MIN');
    await vi.advanceTimersByTimeAsync(60_000);
    TestBed.tick();
    http.expectOne('/api/defis/courant').flush({ defi: defi({ finLe: fin }) });
    await vi.advanceTimersByTimeAsync(60_000);
    TestBed.tick();
    http.expectNone('/api/defis/courant');
    expect(el.querySelector('.minuteur')?.textContent).toBe('DÉFI TERMINÉ');
  });

  it('minuteur sans annonce vocale', async () => {
    const { el } = await rendre({ defi: defi() });
    expect(el.querySelector('.minuteur')?.closest('[aria-live]')).toBeNull();
    expect(el.querySelector('.minuteur')?.getAttribute('role')).toBeNull();
  });
});

describe('dureeRestante', () => {
  it.each([
    [3 * 86400_000 + 4 * 3600_000 + 59_000, 'FIN DANS 3 J 04 H'],
    [5 * 3600_000 + 7 * 60_000, 'FIN DANS 5 H 07 MIN'],
    [12 * 60_000, 'FIN DANS 12 MIN'],
    [30_000, 'FIN DANS 1 MIN'],
    [0, 'DÉFI TERMINÉ'],
    [-5, 'DÉFI TERMINÉ'],
  ])('%i ms -> %s', (ms, attendu) => expect(dureeRestante(ms)).toBe(attendu));
});
