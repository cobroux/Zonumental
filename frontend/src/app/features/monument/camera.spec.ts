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

const vide = () => new Promise((r) => setTimeout(r, 0));

describe('Camera', () => {
  const arreter = vi.fn();
  const coords = { latitude: 48.1, longitude: 2.2, precision: 12 };
  let etat: ReturnType<typeof signal<object>>;
  const relire = vi.fn();
  let getUserMedia: ReturnType<typeof vi.fn>;

  async function rendre(media: 'ok' | 'refus' = 'ok') {
    getUserMedia = vi.fn(() =>
      media === 'ok'
        ? Promise.resolve({ getTracks: () => [{ stop: arreter }] })
        : Promise.reject(new DOMException('no', 'NotAllowedError')),
    );
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
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
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, http: TestBed.inject(HttpTestingController) };
  }
  const declencher = (el: HTMLElement) =>
    el.querySelector<HTMLButtonElement>('button[data-prendre]')!;

  const reessayer = (el: HTMLElement) =>
    el.querySelector<HTMLButtonElement>('button[data-reessayer]');

  beforeEach(() => {
    arreter.mockClear();
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
    expect(declencher(el).textContent).toContain('Prendre la photo');
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
    const req = http.expectOne('/api/captures');
    const corps = req.request.body as FormData;
    expect(corps.get('numero')).toBe('7');
    expect(corps.get('latitude')).toBe('48.1');
    expect(corps.get('longitude')).toBe('2.2');
    expect(corps.get('precisionMetres')).toBe('12');
    expect((corps.get('photo') as Blob).type).toBe('image/jpeg');
    req.flush({});
    await vide();
    expect(navigate).toHaveBeenCalledWith(['/monument', '7'], { state: { capture: true } });
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
    http
      .expectOne('/api/catalogue/monuments/7')
      .flush({ position: { latitude: 49.1, longitude: 2.2 } });
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
    expect(navigate).toHaveBeenCalledWith(['/monument', '7'], { state: { capture: true } });
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
