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
  type: 'TOUR',
  rarete: 'RARE',
  image: image('/api/catalogue/monuments/7/image'),
  stats: { annee: 1889, style: 'Métallique', hauteurMetres: 330, materiau: 'Pierre' },
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
    expect(el.textContent).toContain('image modifiée : noir et blanc, teintée et floutée');
    expect(el.querySelector('img')?.classList).toContain('avant');
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

  it('capturée : bouton « Partager ma page » téléchargeant l image sans Web Share', async () => {
    const { el, http, fixture } = await rendre(capture);
    const bouton = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Partager ma page'),
    )!;
    expect(bouton).toBeTruthy();
    vi.stubGlobal('navigator', {});
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => new Proxy({}, { get: () => () => undefined, set: () => true }),
    ) as never;
    HTMLCanvasElement.prototype.toBlob = (f) => f(new Blob(['x'], { type: 'image/png' }));
    Object.defineProperty(document, 'fonts', { value: { load: () => Promise.resolve([]) } });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    bouton.click();
    await attendre(fixture);
    http.expectOne('/api/progression/collections').flush([]);
    http.expectOne('/api/compte/moi').flush({ pseudo: 'lea' });
    http.expectOne('/api/compte/consentements').flush({ classement: false, emails: false });
    await new Promise((r) => setTimeout(r, 20));
    await attendre(fixture);
    expect(clic).toHaveBeenCalledOnce();
    expect(el.textContent).toContain('Image téléchargée.');
    vi.unstubAllGlobals();
  });

  it('verrouillée : pas de bouton Partager', async () => {
    const { el } = await rendre(verrouille);
    expect(el.textContent).not.toContain('Partager ma page');
  });

  it('capturée : stats inconnues « — »', async () => {
    const { el } = await rendre({
      ...capture,
      stats: { annee: null, style: null, hauteurMetres: null, materiau: null },
    });
    expect(el.querySelectorAll('dd')[0].textContent).toBe('—');
    expect(el.querySelectorAll('dd')[2].textContent).toBe('—');
  });

  it('capturée : trio ANNÉE / HAUTEUR / MATÉRIAU, matériau issu de l’API', async () => {
    const { el } = await rendre(capture);
    const dt = [...el.querySelectorAll('dt')].map((x) => x.textContent);
    expect(dt).toEqual(['Année', 'Hauteur', 'Matériau']);
    expect([...el.querySelectorAll('dd')].map((x) => x.textContent)).toEqual([
      '1889',
      '330 m',
      'Pierre',
    ]);
  });

  it('gabarit : h1 unique, Retour nommé vers le carnet, pastilles rareté + type, licences visibles', async () => {
    const { el } = await rendre(capture);
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('a[aria-label="Retour au carnet"]')?.getAttribute('href')).toBe(
      '/carnet',
    );
    expect(el.querySelector('.pastilles')?.textContent).toContain('Rare');
    expect(el.querySelector('.pastilles')?.textContent).toContain('Tour');
    expect(el.textContent).toContain('CC BY-SA 4.0');
    expect(el.textContent).toContain('Texte : Source, CC BY-SA');
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

  describe('tampon sur la photo et succès lié (fidelite-15)', () => {
    afterEach(() => history.replaceState(null, ''));
    const tampon = (el: HTMLElement) => el.querySelector<HTMLElement>('.tampon-photo');
    const succes = (obtenuLe: string) => ({
      enCours: [],
      obtenus: [{ code: 'LEGENDE', libelle: 'Dame de fer', obtenuLe }],
    });

    it('fiche capturée ouverte normalement : tampon posé, sans animation ni annonce', async () => {
      const { el } = await rendre(capture);
      expect(tampon(el)).not.toBeNull();
      expect(tampon(el)!.dataset['etat']).toBeUndefined();
      expect(tampon(el)!.getAttribute('aria-hidden')).toBe('true');
      expect(el.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('');
    });

    it('verrouillée : pas de tampon', async () => {
      const { el } = await rendre(verrouille);
      expect(tampon(el)).toBeNull();
    });

    it('retour de capture : le tampon attend la fin de la feuille, puis se pose et est annoncé une fois', async () => {
      history.replaceState({ capture: true }, '');
      const { fixture, el } = await rendre(capture);
      expect(tampon(el)!.dataset['etat']).toBe('attente');
      expect(el.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('');
      el.querySelector<HTMLButtonElement>('app-celebration .principal')!.click();
      await attendre(fixture);
      expect(tampon(el)!.dataset['etat']).toBe('pose');
      expect(el.querySelector('[aria-live="polite"]')?.textContent).toContain('Tampon posé');
      expect(tampon(el)!.matches('a, button, [tabindex]')).toBe(false);
    });

    it('succès obtenu avec la capture : bloc « Succès débloqués » nommé, critère lisible', async () => {
      const { fixture, http, el } = await rendre(capture);
      http.expectOne('/api/progression/succes').flush(succes(capture.captureeLe));
      await attendre(fixture);
      const bloc = el.querySelector('.lie')!;
      expect(bloc.querySelector('h2')?.textContent).toContain('Succès débloqués');
      expect(bloc.textContent).toContain('Dame de fer');
      expect(bloc.querySelector('[role="img"]')?.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it('aucun succès lié à la capture, ou erreur : bloc absent', async () => {
      const a = await rendre(capture);
      a.http.expectOne('/api/progression/succes').flush(succes('2026-10-01T10:00:00Z'));
      await attendre(a.fixture);
      expect(a.el.querySelector('.lie')).toBeNull();
      TestBed.resetTestingModule();
      const b = await rendre(capture);
      b.http
        .expectOne('/api/progression/succes')
        .flush(null, { status: 500, statusText: 'Erreur' });
      await attendre(b.fixture);
      expect(b.el.querySelector('.lie')).toBeNull();
    });

    it('verrouillée : aucun appel aux succès', async () => {
      const { http } = await rendre(verrouille);
      http.expectNone('/api/progression/succes');
    });
  });

  describe('célébration du tampon (après capture)', () => {
    const feuille = (el: HTMLElement) => el.querySelector<HTMLElement>('app-celebration dialog');
    const continuer = (el: HTMLElement) =>
      [...el.querySelectorAll<HTMLButtonElement>('app-celebration button')].find(
        (b) => b.textContent?.trim() === 'Continuer',
      )!;
    const duo = [
      { code: 'PREMIER_TAMPON', libelle: 'Premier tampon' },
      { code: 'EXPLORATEUR_10', libelle: 'Dix tampons' },
    ];
    afterEach(() => history.replaceState(null, ''));

    it('feuille modale : titre h1 pris en nom, rareté en lettres, histoire déjà lisible', async () => {
      history.replaceState({ capture: true }, '');
      const { el } = await rendre({ ...capture, rarete: 'LEGENDAIRE' });
      const d = feuille(el)!;
      const h1 = d.querySelector('h1')!;
      expect(d.getAttribute('aria-labelledby')).toBe(h1.id);
      expect(h1.textContent).toContain('Tampon posé');
      expect(d.querySelector('.surtitre')?.textContent).toBe('N°007 · LÉGENDAIRE');
      expect(d.textContent).not.toMatch(/XP/);
      expect(d.querySelector('app-celebration .succes, .succes')).toBeNull();
      expect(el.textContent).toContain('Construite pour 1889.');
    });

    it('focus initial sur le titre de la feuille', async () => {
      history.replaceState({ capture: true }, '');
      const { el } = await rendre(capture);
      expect(document.activeElement).toBe(feuille(el)!.querySelector('h1'));
    });

    it('« Continuer » ferme la feuille, rend le focus au titre de la fiche et vide l’historique', async () => {
      history.replaceState({ capture: true, succes: duo }, '');
      const { fixture, el } = await rendre(capture);
      continuer(el).click();
      await attendre(fixture);
      expect(feuille(el)).toBeNull();
      expect(history.state?.capture).toBeUndefined();
      expect(history.state?.succes).toBeUndefined();
      expect(document.activeElement).toBe(el.querySelector('h1'));
    });

    it('fermeture native (Échap) : même effet', async () => {
      history.replaceState({ capture: true }, '');
      const { fixture, el } = await rendre(capture);
      feuille(el)!.dispatchEvent(new Event('close'));
      fixture.detectChanges();
      expect(feuille(el)).toBeNull();
    });

    it('appui sur le voile = Continuer, appui dans la feuille = rien', async () => {
      history.replaceState({ capture: true }, '');
      const { fixture, el } = await rendre(capture);
      feuille(el)!.querySelector<HTMLElement>('.feuille')!.click();
      fixture.detectChanges();
      expect(feuille(el)).not.toBeNull();
      feuille(el)!.click();
      fixture.detectChanges();
      expect(feuille(el)).toBeNull();
    });

    it('succès gagnés : premier tampon en titre, lignes avec critère, lien vers le carnet', async () => {
      history.replaceState({ capture: true, succes: duo }, '');
      const { el } = await rendre(capture);
      const d = feuille(el)!;
      expect(d.querySelector('h1')?.textContent).toContain('Ton premier tampon');
      const lignes = [...d.querySelectorAll('.succes li')];
      expect(lignes.length).toBe(2);
      expect(lignes[0].textContent).toContain('Premier tampon');
      expect(lignes[0].textContent).toContain('Premier monument tamponné');
      expect(lignes[1].textContent).toContain('10 monuments tamponnés');
      expect(d.querySelector('.autres')).toBeNull();
      expect(d.querySelector('a[href="/carnet"]')?.textContent).toContain('Voir mon carnet');
    });

    it('plus de 3 succès : 3 lignes puis « + 2 autres succès » vers la liste', async () => {
      const cinq = ['A', 'B', 'C', 'D', 'E'].map((code) => ({ code, libelle: `Succès ${code}` }));
      history.replaceState({ capture: true, succes: cinq }, '');
      const { el } = await rendre(capture);
      const d = feuille(el)!;
      expect(d.querySelectorAll('.succes li').length).toBe(3);
      expect(d.querySelector('.autres')?.textContent).toContain('+ 2 autres succès');
      expect(d.querySelector('.autres')?.getAttribute('href')).toBe('/profil');
    });

    it('ouverture normale de la fiche : pas de feuille', async () => {
      const { el } = await rendre(capture);
      expect(feuille(el)).toBeNull();
    });
  });

  describe('non capturé', () => {
    it('identité : numéro, type, rareté en lettres, siècle, histoire cadenassée, pas de tampon', async () => {
      const { el } = await rendre({ ...verrouille, siecle: 17 });
      const t = el.textContent ?? '';
      expect(t).toContain('N°007 · PARIS');
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
      expect(navigate).toHaveBeenCalledWith(['/monument', '7', 'capturer'], undefined);
    });

    it('« Remplacer la photo » ouvre l’écran caméra en mode remplacement', async () => {
      const { el } = await rendre({ ...capture, captureeLe: '2026-10-31T23:30:00Z' });
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      [...el.querySelectorAll('button')]
        .find((b) => b.textContent?.includes('Remplacer la photo'))
        ?.click();
      expect(navigate).toHaveBeenCalledWith(['/monument', '7', 'capturer'], {
        state: { remplacer: true },
      });
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
