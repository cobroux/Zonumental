import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../core/api/api-configuration';
import { Position } from '../../core/position/position';
import { Camera, dimensionsReduites } from './camera';

describe('dimensionsReduites', () => {
  it('ramène le côté long à 1600 px, sans agrandir', () => {
    expect(dimensionsReduites(4000, 3000)).toEqual([1600, 1200]);
    expect(dimensionsReduites(3000, 4000)).toEqual([1200, 1600]);
    expect(dimensionsReduites(800, 600)).toEqual([800, 600]);
  });
});

// ~0,001° de latitude = 111 m
const monument = {
  numero: 1,
  nom: 'Tour Eiffel',
  rarete: 'LEGENDAIRE',
  ville: { nom: 'Paris' },
  position: { latitude: 48.1, longitude: 2.2 },
  rayonCaptureMetres: 150,
};
const vide = () => new Promise((r) => setTimeout(r, 0));

describe('Camera', () => {
  const arreter = vi.fn();
  const coords = { latitude: 48.1, longitude: 2.2, precision: 12 };
  let etat: ReturnType<typeof signal<object>>;
  const relire = vi.fn();
  let getUserMedia: ReturnType<typeof vi.fn>;
  let piste: Record<string, unknown>;
  let peripheriques: { kind: string }[];

  async function rendre(media: 'ok' | 'refus' = 'ok', permission: PermissionState = 'granted') {
    Object.defineProperty(navigator, 'permissions', {
      value: { query: vi.fn(() => Promise.resolve({ state: permission })) },
      configurable: true,
    });
    getUserMedia = vi.fn(() =>
      media === 'ok'
        ? Promise.resolve({
            getTracks: () => [{ stop: arreter }],
            getVideoTracks: () => [piste],
          })
        : Promise.reject(new DOMException('no', 'NotAllowedError')),
    );
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia, enumerateDevices: () => Promise.resolve(peripheriques) },
      configurable: true,
    });
    etat = signal({ statut: 'ok', coords });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(''),
        provideRouter([]),
        { provide: Position, useValue: { etat, relire } },
      ],
    });
    const fixture = TestBed.createComponent(Camera);
    fixture.componentRef.setInput('numero', '7');
    fixture.detectChanges();
    await vide();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/catalogue/monuments/7').flush(monument);
    await vide();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, http };
  }
  const declencher = (el: HTMLElement) =>
    el.querySelector<HTMLButtonElement>('button[data-prendre]')!;

  const reessayer = (el: HTMLElement) =>
    el.querySelector<HTMLButtonElement>('button[data-reessayer]');

  beforeEach(() => {
    arreter.mockClear();
    piste = { stop: arreter };
    peripheriques = [{ kind: 'videoinput' }];
    relire.mockReset().mockResolvedValue(coords);
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as never;
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (cb: BlobCallback) {
      cb(new Blob(['x'], { type: 'image/jpeg' }));
    }) as never;
  });

  it('ouvre la caméra arrière, sans champ de fichier (pas de galerie)', async () => {
    const { el } = await rendre();
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'environment' },
      audio: false,
    });
    expect(el.querySelector('input[type=file]')).toBeNull();
    expect(declencher(el).getAttribute('aria-label')).toBe('Prendre la photo');
  });

  describe('feuille « Autoriser la caméra » (O3)', () => {
    const feuille = (el: HTMLElement) => el.querySelector('app-autoriser-camera dialog');
    const bouton = (el: HTMLElement, nom: string) =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === nom)!;

    it('permission déjà accordée : pas de feuille, caméra ouverte', async () => {
      const { el } = await rendre('ok', 'granted');
      expect(feuille(el)).toBeNull();
      expect(getUserMedia).toHaveBeenCalled();
    });

    it('sinon : feuille dialog nommée, aucune demande système avant le choix', async () => {
      const { el } = await rendre('ok', 'prompt');
      const d = feuille(el)!;
      expect(d.getAttribute('aria-labelledby')).toBe('titre-camera');
      expect(el.querySelector('#titre-camera')?.textContent).toContain(
        'Dernière étape\u00a0: la caméra',
      );
      expect(el.textContent).toContain('TON PREMIER TAMPON');
      expect(el.textContent).toContain('Photo prise en direct uniquement');
      expect(getUserMedia).not.toHaveBeenCalled();
    });

    it('Autoriser la caméra : demande système puis capture', async () => {
      const { fixture, el } = await rendre('ok', 'prompt');
      bouton(el, 'Autoriser la caméra').click();
      await vide();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(getUserMedia).toHaveBeenCalledTimes(1);
      expect(feuille(el)).toBeNull();
      expect(declencher(el)).not.toBeNull();
    });

    it('Pas maintenant (et Échap) : retour à la fiche sans demande système', async () => {
      for (const sortie of ['bouton', 'echap']) {
        const { fixture, el } = await rendre('ok', 'prompt');
        const aller = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        if (sortie === 'bouton') bouton(el, 'Pas maintenant').click();
        else feuille(el)!.dispatchEvent(new Event('close'));
        fixture.detectChanges();
        expect(aller).toHaveBeenCalledWith(['/monument', '7']);
        expect(getUserMedia).not.toHaveBeenCalled();
        TestBed.resetTestingModule();
      }
    });
  });

  describe('statut de zone', () => {
    const puce = (el: HTMLElement) => el.querySelector('.puce')!;
    const annonce = (el: HTMLElement) => el.querySelector('[aria-live=polite]')!.textContent;

    it('dans la zone : pastille, cadre, bloc monument, annonce polie', async () => {
      const { el } = await rendre();
      expect(puce(el).textContent).toContain('Dans la zone · 0 m');
      expect(puce(el).querySelector('.point')).not.toBeNull();
      expect(el.querySelector('.cadre')).not.toBeNull();
      expect(el.querySelector('h1')?.textContent).toBe('Tour Eiffel');
      expect(el.querySelector('.kicker')?.textContent?.replace(/\s+/g, ' ')).toContain(
        'N°001 · LÉGENDAIRE · Paris',
      );
      expect(el.textContent).toContain('Cadre le monument entier');
      expect(annonce(el)).toBe('Dans la zone');
      expect(el.querySelector('[aria-label="Fermer la caméra"]')).not.toBeNull();
    });

    it('hors zone, en direct : distance arrondie, plus de cadre', async () => {
      const { el, fixture } = await rendre();
      etat.set({ statut: 'ok', coords: { latitude: 48.1038, longitude: 2.2, precision: 10 } });
      fixture.detectChanges();
      expect(puce(el).textContent).toContain('Hors zone · 420 m');
      expect(puce(el).getAttribute('data-etat')).toBe('hors');
      expect(el.querySelector('.cadre')).toBeNull();
      expect(annonce(el)).toBe('Hors zone');
    });

    it('dans la zone : déclencheur actif nommé, lien carnet, flux plein', async () => {
      const { el } = await rendre();
      const d = declencher(el);
      expect(d.getAttribute('aria-label')).toBe('Prendre la photo');
      expect(d.getAttribute('aria-disabled')).toBeNull();
      expect(d.disabled).toBe(false);
      expect(el.querySelector('a[aria-label="Ouvrir le carnet"]')?.getAttribute('href')).toBe(
        '/carnet',
      );
      expect(el.querySelector('video.attenue')).toBeNull();
      expect(el.querySelector('.boussole')).toBeNull();
    });

    it('hors zone : déclencheur verrouillé, boussole, flux réduit, aucun envoi', async () => {
      const { el, fixture, http } = await rendre();
      etat.set({ statut: 'ok', coords: { latitude: 48.1038, longitude: 2.2, precision: 10 } });
      fixture.detectChanges();
      const d = declencher(el);
      expect(d.getAttribute('aria-disabled')).toBe('true');
      expect(d.getAttribute('aria-label')).toContain('rapproche-toi à moins de 150 mètres');
      expect(el.querySelector('#aide-declencheur')?.textContent).toContain(
        "s'active à 150 m · encore 270 m",
      );
      expect(el.querySelector('.boussole')?.textContent).toContain('420 m au sud · 5 min à pied');
      expect(el.querySelector<HTMLElement>('.aiguille svg')?.style.transform).toBe(
        'rotate(180deg)',
      );
      expect(el.querySelector('video.attenue')).not.toBeNull();
      d.click();
      http.expectNone('/api/captures');
      expect(el.querySelector('.flash')).toBeNull();
    });

    it('position imprécise : ni dans la zone ni hors zone', async () => {
      const { el, fixture } = await rendre();
      etat.set({ statut: 'ok', coords: { ...coords, precision: 250 } });
      fixture.detectChanges();
      expect(puce(el).textContent).toContain('Position imprécise');
      expect(annonce(el)).toContain('Position imprécise');
    });
  });

  describe('flash et changement de caméra', () => {
    it('masqués si le navigateur ne les gère pas', async () => {
      const { el } = await rendre();
      expect(el.querySelector('[aria-label="Flash"]')).toBeNull();
      expect(el.querySelector('[aria-label="Changer de caméra"]')).toBeNull();
    });

    it('flash : agit sur la torche et reflète l’état', async () => {
      piste['getCapabilities'] = () => ({ torch: true });
      piste['applyConstraints'] = vi.fn(() => Promise.resolve());
      const { el, fixture } = await rendre();
      const b = el.querySelector<HTMLButtonElement>('[aria-label="Flash"]')!;
      b.click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(piste['applyConstraints']).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
      expect(b.getAttribute('aria-pressed')).toBe('true');
    });

    it('changer de caméra : rouvre le flux en façade', async () => {
      peripheriques = [{ kind: 'videoinput' }, { kind: 'videoinput' }];
      const { el, fixture } = await rendre();
      el.querySelector<HTMLButtonElement>('[aria-label="Changer de caméra"]')!.click();
      await fixture.whenStable();
      expect(getUserMedia).toHaveBeenLastCalledWith({
        video: { facingMode: 'user' },
        audio: false,
      });
      expect(arreter).toHaveBeenCalled();
    });
  });

  it('transmet les succès gagnés à la fiche', async () => {
    const { el, fixture, http } = await rendre();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    declencher(el).click();
    await fixture.whenStable();
    const succes = [{ code: 'PREMIER_TAMPON', libelle: 'Premier tampon' }];
    http.expectOne('/api/captures').flush({ succesGagnes: succes });
    await vide();
    expect(navigate).toHaveBeenCalledWith(['/monument', '7'], { state: { capture: true, succes } });
  });

  it('envoie id, position et précision lus à la prise, bouton bloqué pendant l’envoi', async () => {
    const { el, fixture, http } = await rendre();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const bouton = declencher(el);
    bouton.click();
    bouton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(bouton.disabled).toBe(true);
    expect(el.querySelector('.flash')).not.toBeNull();
    const req = http.expectOne('/api/captures');
    const corps = req.request.body as FormData;
    expect(corps.get('numero')).toBe('7');
    expect(corps.get('latitude')).toBe('48.1');
    expect(corps.get('longitude')).toBe('2.2');
    expect(corps.get('precisionMetres')).toBe('12');
    expect((corps.get('photo') as Blob).type).toBe('image/jpeg');
    req.flush({});
    await vide();
    expect(navigate).toHaveBeenCalledWith(['/monument', '7'], {
      state: { capture: true, succes: [] },
    });
    http.verify();
  });

  it('caméra refusée : explication, aucun envoi', async () => {
    const { el, http } = await rendre('refus');
    expect(el.querySelector('[role=alert]')?.textContent).toContain('caméra');
    expect(el.querySelector('button[data-prendre]')).toBeNull();
    http.verify();
  });

  it('position absente : pas de capture', async () => {
    const { el, fixture, http } = await rendre();
    etat.set({ statut: 'refus' });
    declencher(el).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('position');
    http.verify();
  });

  it('erreur serveur : message, bouton réactivé ', async () => {
    const { el, fixture, http } = await rendre();
    declencher(el).click();
    await fixture.whenStable();
    http.expectOne('/api/captures').flush({}, { status: 500, statusText: 'x' });
    await vide();
    fixture.detectChanges();
    expect(el.querySelector('[role=alert]')).not.toBeNull();
    expect(reessayer(el)!.disabled).toBe(false);
  });

  it('coupe la caméra à la destruction', async () => {
    const { fixture } = await rendre();
    fixture.destroy();
    expect(arreter).toHaveBeenCalled();
  });

  async function refuser(
    corps: object,
    status: number,
    entetes: Record<string, string> = {},
    attendu = '/api/captures',
  ) {
    const r = await rendre();
    declencher(r.el).click();
    await r.fixture.whenStable();
    r.http.expectOne(attendu).flush(corps, { status, statusText: 'x', headers: entetes });
    await vide();
    r.fixture.detectChanges();
    return r;
  }
  const texte = (el: HTMLElement) => el.querySelector('zn-message')?.textContent ?? '';

  it('trop loin : distance et flèche orientée vers le monument, un seul message', async () => {
    const { el, fixture, http } = await rendre();
    declencher(el).click();
    await fixture.whenStable();
    http
      .expectOne('/api/captures')
      .flush({ code: 'trop-loin', distanceMetres: 420 }, { status: 422, statusText: 'x' });
    await vide();
    fixture.detectChanges();
    expect(el.querySelectorAll('zn-message').length).toBe(1);
    expect(texte(el)).toContain('Tu es à 420 m, rapproche-toi !');
    expect(texte(el)).toContain('nord');
    expect(el.querySelector<HTMLElement>('[data-fleche]')?.style.transform).toBe('rotate(0deg)');
    expect(reessayer(el)).not.toBeNull();
  });

  it('signal faible puis « Réessayer » : position relue, même photo renvoyée', async () => {
    const { el, fixture, http } = await refuser({ code: 'precision-insuffisante' }, 422);
    expect(texte(el)).toContain('Signal trop faible, réessaie à découvert');
    const avant = [...(HTMLCanvasElement.prototype.toBlob as ReturnType<typeof vi.fn>).mock.calls];
    relire.mockResolvedValue({ latitude: 48.2, longitude: 2.3, precision: 20 });
    reessayer(el)!.click();
    await fixture.whenStable();
    const req = http.expectOne('/api/captures');
    const corps = req.request.body as FormData;
    expect(relire).toHaveBeenCalled();
    expect(corps.get('latitude')).toBe('48.2');
    expect(corps.get('precisionMetres')).toBe('20');
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(avant.length);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    req.flush({});
    await vide();
    expect(navigate).toHaveBeenCalledWith(['/monument', '7'], {
      state: { capture: true, succes: [] },
    });
    expect(fixture.nativeElement.querySelector('zn-message')).toBeNull();
  });

  it('précision toujours mauvaise : toujours refusé, aucun mode dégradé', async () => {
    const { el, fixture, http } = await refuser({ code: 'precision-insuffisante' }, 422);
    reessayer(el)!.click();
    await fixture.whenStable();
    http
      .expectOne('/api/captures')
      .flush({ code: 'precision-insuffisante' }, { status: 422, statusText: 'x' });
    await vide();
    fixture.detectChanges();
    expect(texte(el)).toContain('Signal trop faible');
    expect(reessayer(el)).not.toBeNull();
  });

  it('limite de fréquence : délai avant le prochain essai', async () => {
    const { el } = await refuser({ code: 'limite-frequence' }, 429, { 'Retry-After': '1500' });
    expect(texte(el)).toContain('25 min');
  });

  it('déplacement improbable : message neutre, sans accusation', async () => {
    const { el } = await refuser({ code: 'deplacement-improbable' }, 429, { 'Retry-After': '60' });
    expect(texte(el)).not.toMatch(/triche|fraude|faux/i);
    expect(texte(el)).toContain('1 min');
  });

  it('image invalide : message explicite, nouvelle photo à prendre', async () => {
    const { el } = await refuser({ code: 'image-invalide' }, 422);
    expect(texte(el)).toContain('photo');
    expect(texte(el)).toContain('5 Mo');
    expect(reessayer(el)).toBeNull();
    expect(declencher(el)).not.toBeNull();
  });

  it('e-mail non vérifié : invitation avec lien vers la vérification', async () => {
    const { el } = await refuser({ code: 'email-non-verifie' }, 403);
    expect(texte(el)).toContain('e-mail');
    expect(el.querySelector('a[href="/inscription/verifie-ton-email"]')).not.toBeNull();
  });

  it('session expirée (401) : aucun message, l’intercepteur renvoie à la connexion', async () => {
    const { el } = await refuser({ code: 'non-authentifie' }, 401);
    expect(el.querySelector('zn-message')).toBeNull();
  });

  it('hors connexion : « Pas de connexion. », « Réessayer » renvoie la même photo', async () => {
    const r = await rendre();
    declencher(r.el).click();
    await r.fixture.whenStable();
    r.http.expectOne('/api/captures').error(new ProgressEvent('error'));
    await vide();
    r.fixture.detectChanges();
    expect(texte(r.el)).toContain('Pas de connexion.');
    reessayer(r.el)!.click();
    await r.fixture.whenStable();
    r.http.expectOne('/api/captures');
  });

  it('position introuvable au réessai : message, pas d’envoi', async () => {
    const { el, fixture, http } = await refuser({ code: 'trop-loin', distanceMetres: 50 }, 422);
    http.match('/api/catalogue/monuments/7');
    relire.mockResolvedValue(null);
    reessayer(el)!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(texte(el)).toContain('position');
    http.verify();
  });

  describe('déjà capturé (r1-capturer-4)', () => {
    const remplacer = (el: HTMLElement) =>
      el.querySelector<HTMLButtonElement>('button[data-remplacer]');

    it('deja-capture : propose « Remplacer la photo » sans récompense', async () => {
      const { el } = await refuser({ code: 'deja-capture' }, 409);
      expect(texte(el)).toContain('déjà tamponné');
      expect(remplacer(el)!.textContent).toContain('Remplacer la photo');
      expect(reessayer(el)).toBeNull();
    });

    it('« Remplacer la photo » renvoie la même photo avec remplacer=true, puis fiche sans animation', async () => {
      const { el, fixture, http } = await refuser({ code: 'deja-capture' }, 409);
      const prises = (HTMLCanvasElement.prototype.toBlob as ReturnType<typeof vi.fn>).mock.calls
        .length;
      relire.mockResolvedValue({ latitude: 48.2, longitude: 2.3, precision: 20 });
      remplacer(el)!.click();
      await fixture.whenStable();
      const req = http.expectOne('/api/captures');
      const corps = req.request.body as FormData;
      expect(corps.get('remplacer')).toBe('true');
      expect(corps.get('latitude')).toBe('48.2');
      expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(prises);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      req.flush({}, { status: 200, statusText: 'OK' });
      await vide();
      expect(navigate).toHaveBeenCalledWith(['/monument', '7'], undefined);
    });

    it('ouverte depuis la fiche (état remplacer) : premier envoi en remplacement, sans animation', async () => {
      history.replaceState({ remplacer: true }, '');
      const { el, fixture, http } = await rendre();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      declencher(el).click();
      await fixture.whenStable();
      const req = http.expectOne('/api/captures');
      expect((req.request.body as FormData).get('remplacer')).toBe('true');
      req.flush({}, { status: 200, statusText: 'OK' });
      await vide();
      expect(navigate).toHaveBeenCalledWith(['/monument', '7'], undefined);
      history.replaceState({}, '');
    });

    it('remplacement trop loin : message #42, « Réessayer » garde le remplacement', async () => {
      const { el, fixture, http } = await refuser({ code: 'deja-capture' }, 409);
      remplacer(el)!.click();
      await fixture.whenStable();
      http
        .expectOne('/api/captures')
        .flush({ code: 'trop-loin', distanceMetres: 500 }, { status: 422, statusText: 'x' });
      await vide();
      http.match('/api/catalogue/monuments/7');
      fixture.detectChanges();
      expect(texte(el)).toContain('Tu es à 500 m');
      reessayer(el)!.click();
      await fixture.whenStable();
      expect((http.expectOne('/api/captures').request.body as FormData).get('remplacer')).toBe(
        'true',
      );
    });

    it('échec d’envoi du remplacement : reste sur l’écran, aucune navigation (ancienne photo conservée)', async () => {
      const { el, fixture, http } = await refuser({ code: 'deja-capture' }, 409);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      remplacer(el)!.click();
      await fixture.whenStable();
      http.expectOne('/api/captures').error(new ProgressEvent('error'));
      await vide();
      fixture.detectChanges();
      expect(texte(el)).toContain('Pas de connexion.');
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
