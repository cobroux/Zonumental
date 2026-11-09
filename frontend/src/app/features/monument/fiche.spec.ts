import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { Position } from '../../core/position/position';
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
const verrouille = {
  ...base,
  captureeLe: null,
  image: image(null),
  type: 'TOUR',
  rarete: 'LEGENDAIRE',
  position: { latitude: 48.001, longitude: 2 },
  rayonCaptureMetres: 50,
};
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

const ici = (latitude = 48, precision = 10) => ({
  statut: 'ok' as const,
  coords: { latitude, longitude: 2, precision },
});

async function rendre(monument: object, etat: object = { statut: 'attente' }) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Position, useValue: { etat: signal(etat) } },
    ],
  });
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
    expect(el.textContent).not.toContain('Histoire à venir');
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

  it('capturée : tampon, date jj/mm/aaaa en heure de Paris, Remplacer la photo', async () => {
    const { el } = await rendre({ ...capture, captureeLe: '2026-10-31T23:30:00Z' });
    expect(el.querySelector('[data-tampon]')?.textContent).toContain('01/11/2026');
    expect(el.textContent).toContain('Remplacer la photo');
  });

  it('capturée : stats inconnues « — »', async () => {
    const { el } = await rendre({
      ...capture,
      stats: { annee: null, style: null, hauteurMetres: null },
    });
    expect(el.querySelectorAll('dd')[0].textContent).toBe('—');
    expect(el.querySelectorAll('dd')[2].textContent).toBe('—');
  });

  it('verrouillée : ni tampon ni Remplacer la photo', async () => {
    const { el } = await rendre(verrouille);
    expect(el.querySelector('[data-tampon]')).toBeNull();
    expect(el.textContent).not.toContain('Remplacer la photo');
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

  describe('animation du tampon (après capture)', () => {
    const reduit = (v: boolean) => (window.matchMedia = vi.fn(() => ({ matches: v })) as never);
    const anim = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-animation]');
    afterEach(() => {
      history.replaceState(null, '');
      vi.useRealTimers();
    });

    it('rareté en toutes lettres, histoire déjà lisible, ni succès ni XP', async () => {
      reduit(false);
      history.replaceState({ capture: true }, '');
      const { el } = await rendre({ ...capture, rarete: 'LEGENDAIRE' });
      expect(anim(el)?.textContent).toContain('Légendaire');
      expect(anim(el)?.textContent).not.toMatch(/succès|XP/i);
      expect(el.textContent).toContain('Construite pour 1889.');
    });

    it('un appui sur Continuer passe l’animation', async () => {
      reduit(false);
      history.replaceState({ capture: true }, '');
      const { fixture, el } = await rendre(capture);
      el.querySelector<HTMLButtonElement>('[data-animation] button')!.click();
      fixture.detectChanges();
      expect(anim(el)).toBeNull();
      expect(history.state?.capture).toBeUndefined();
    });

    it('se termine seule à la fin de l’animation', async () => {
      reduit(false);
      history.replaceState({ capture: true }, '');
      const { fixture, el } = await rendre(capture);
      vi.useFakeTimers();
      anim(el)!.dispatchEvent(new Event('animationend', { bubbles: true }));
      fixture.detectChanges();
      expect(anim(el)).toBeNull();
    });

    it('mouvement réduit : tampon fixe, reste jusqu’à l’appui', async () => {
      reduit(true);
      history.replaceState({ capture: true }, '');
      const { fixture, el } = await rendre(capture);
      anim(el)!.dispatchEvent(new Event('animationend', { bubbles: true }));
      fixture.detectChanges();
      expect(anim(el)).not.toBeNull();
      expect(anim(el)!.classList.contains('fixe')).toBe(true);
    });

    it('ouverture normale de la fiche : pas d’animation', async () => {
      const { el } = await rendre(capture);
      expect(anim(el)).toBeNull();
    });
  });

  describe('non capturé', () => {
    it('identité : numéro, type, rareté en lettres, siècle, histoire cadenassée, pas de tampon', async () => {
      const { el } = await rendre({ ...verrouille, siecle: 17 });
      const t = el.textContent ?? '';
      expect(t).toContain('N° 7');
      expect(t).toContain('Tour');
      expect(t).toContain('Légendaire');
      expect(t).toContain('XVIIe siècle');
      expect(t).toContain('Histoire verrouillée');
      expect(t).toContain('Stats verrouillées');
      expect(el.querySelector('[data-tampon]')).toBeNull();
    });

    it('sans date : siècle « — »', async () => {
      const { el } = await rendre({ ...verrouille, siecle: null });
      expect(el.textContent).toContain('Paris · —');
    });

    it('hors zone : distance, direction lue, bouton verrouillé', async () => {
      const { el } = await rendre(verrouille, ici());
      expect(el.textContent).toContain('110 m');
      expect(el.textContent).toContain('Direction : nord');
      expect(el.querySelector('button')?.disabled).toBe(true);
    });

    it('dans la zone : « Aller le tamponner » actif', async () => {
      const { el } = await rendre(verrouille, ici(48.0008));
      const b = el.querySelector('button');
      expect(b?.textContent).toContain('Aller le tamponner');
      expect(b?.disabled).toBe(false);
    });

    it('« Aller le tamponner » ouvre l’écran caméra', async () => {
      const { el } = await rendre(verrouille, ici(48.0008));
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      el.querySelector('button')?.click();
      expect(navigate).toHaveBeenCalledWith(['/monument', '7', 'capturer']);
    });

    it('sans position : pas de distance', async () => {
      const { el } = await rendre(verrouille);
      expect(el.textContent).not.toContain('Direction');
      expect(el.textContent).not.toMatch(/\d m\b/);
    });

    it('image absente : silhouette', async () => {
      const { el } = await rendre({ ...verrouille, image: null });
      expect(el.querySelector('img')).toBeNull();
      expect(el.querySelector('[data-silhouette]')).not.toBeNull();
    });

    it('hors ligne : « Pas de connexion » et Réessayer', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Position, useValue: { etat: signal({ statut: 'attente' }) } },
        ],
      });
      const http = TestBed.inject(HttpTestingController);
      const fixture = TestBed.createComponent(Fiche);
      fixture.componentRef.setInput('numero', '7');
      fixture.detectChanges();
      http.expectOne('/api/catalogue/monuments/7').error(new ProgressEvent('error'));
      await attendre(fixture);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Pas de connexion.');
      expect(el.querySelector('button')?.textContent).toContain('Réessayer');
    });
  });
});
