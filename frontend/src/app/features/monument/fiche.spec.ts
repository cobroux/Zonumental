import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Fiche } from './fiche';

const image = (couleur: string | null) => ({
  url: '/api/catalogue/images/7-nb.jpg',
  urlCouleur: couleur,
  auteur: 'Jean',
  licence: 'CC BY-SA 4.0',
  sourceUrl: 'https://commons.example/7',
});
const base = {
  numero: 7,
  nom: 'Tour Eiffel',
  ville: { nom: 'Paris' },
  siecle: 19,
  stats: null,
  histoire: null,
  photoUrl: null,
};
const verrouille = { ...base, captureeLe: null, image: image(null) };
const capture = {
  ...base,
  captureeLe: '2026-11-01T10:00:00Z',
  image: image('/api/catalogue/monuments/7/image'),
  stats: { annee: 1889, style: 'Métallique', hauteurMetres: 330 },
  histoire: { texte: 'Construite pour 1889.', sourceUrl: 'https://h.example', licence: 'CC BY-SA' },
};

const attendre = async (f: { detectChanges(): void }) => {
  await new Promise((r) => setTimeout(r));
  TestBed.tick();
  f.detectChanges();
};

async function rendre(monument: object) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(Fiche);
  fixture.componentRef.setInput('numero', '7');
  fixture.detectChanges();
  http.expectOne('/api/catalogue/monuments/7').flush(monument);
  await attendre(fixture);
  return { fixture, http, el: fixture.nativeElement as HTMLElement };
}

describe('Fiche', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });

  it('verrouillée : indices et N&B, ni histoire, ni stats, ni photo', async () => {
    const { el, http } = await rendre(verrouille);
    http.expectNone('/api/catalogue/monuments/7/image');
    expect(el.textContent).toContain('Tour Eiffel');
    expect(el.textContent).toContain('XIXe siècle');
    expect(el.textContent).toContain('image modifiée : noir et blanc');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('/api/catalogue/images/7-nb.jpg');
    expect(el.textContent).not.toContain('Histoire');
    expect(el.textContent).not.toContain('1889');
    expect(el.querySelector('[data-photo]')).toBeNull();
  });

  it('capturée : histoire, stats, image couleur remplaçant le N&B sans mention', async () => {
    const { fixture, http, el } = await rendre(capture);
    http.expectOne('/api/catalogue/monuments/7/image').flush(new Blob(['x']));
    await attendre(fixture);
    expect(el.textContent).toContain('Construite pour 1889.');
    expect(el.textContent).toContain('1889');
    expect(el.textContent).toContain('330');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('blob:x');
    expect(el.textContent).not.toContain('image modifiée');
  });

  it('couleur en 404 : le N&B reste affiché', async () => {
    const { fixture, http, el } = await rendre(capture);
    http
      .expectOne('/api/catalogue/monuments/7/image')
      .flush(null, { status: 404, statusText: 'Not Found' });
    await attendre(fixture);
    expect(el.querySelector('img')?.getAttribute('src')).toBe('/api/catalogue/images/7-nb.jpg');
    expect(el.textContent).toContain('image modifiée : noir et blanc');
  });

  it('capturée sans histoire : « Histoire à venir »', async () => {
    const { el } = await rendre({ ...capture, histoire: null });
    expect(el.textContent).toContain('Histoire à venir');
  });

  it('révoque l’URL blob à la destruction', async () => {
    const { fixture, http } = await rendre(capture);
    http.expectOne('/api/catalogue/monuments/7/image').flush(new Blob(['x']));
    await attendre(fixture);
    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });
});
