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
        { provide: Position, useValue: { etat } },
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

  beforeEach(() => {
    arreter.mockClear();
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
    expect(navigate).toHaveBeenCalledWith(['/monument', '7']);
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

  it('erreur serveur : message, bouton réactivé', async () => {
    const { el, fixture, http } = await rendre();
    declencher(el).click();
    await fixture.whenStable();
    http.expectOne('/api/captures').flush({}, { status: 500, statusText: 'x' });
    await vide();
    fixture.detectChanges();
    expect(el.querySelector('[role=alert]')).not.toBeNull();
    expect(declencher(el).disabled).toBe(false);
  });

  it('coupe la caméra à la destruction', async () => {
    const { fixture } = await rendre();
    fixture.destroy();
    expect(arreter).toHaveBeenCalled();
  });
});
