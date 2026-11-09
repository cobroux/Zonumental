import { TestBed } from '@angular/core/testing';
import { Position } from './position';

type Succes = (p: unknown) => void;
type Echec = (e: { code: number }) => void;

function installer(permission?: 'granted' | 'prompt' | 'denied', geoloc = true) {
  let ok!: Succes;
  let ko!: Echec;
  let options: object | undefined;
  const watch = vi.fn((s: Succes, e: Echec, o?: object) => {
    options = o;
    ok = s;
    ko = e;
    return 7;
  });
  const clearWatch = vi.fn();
  vi.stubGlobal('navigator', {
    ...(geoloc ? { geolocation: { watchPosition: watch, clearWatch } } : {}),
    ...(permission
      ? { permissions: { query: vi.fn().mockResolvedValue({ state: permission }) } }
      : {}),
  });
  const service = TestBed.inject(Position);
  return {
    service,
    watch,
    options: () => options,
    clearWatch,
    envoyer: (accuracy: number) => ok({ coords: { latitude: 48, longitude: 2, accuracy } }),
    echouer: (code: number) => ko({ code }),
  };
}
const vidange = () => new Promise((r) => setTimeout(r));
const visibilite = (v: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('Position', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    visibilite('visible');
  });

  it('granted : suit sans interaction, avec haute précision', async () => {
    const t = installer('granted');
    await vidange();
    expect(t.watch).toHaveBeenCalledOnce();
    expect(t.options()).toEqual({
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 30000,
    });
    t.envoyer(12);
    expect(t.service.etat()).toEqual({
      statut: 'ok',
      coords: { latitude: 48, longitude: 2, precision: 12 },
    });
  });

  it('prompt : attente, aucune demande système avant activer()', async () => {
    const t = installer('prompt');
    await vidange();
    expect(t.watch).not.toHaveBeenCalled();
    expect(t.service.etat().statut).toBe('attente');
    t.service.activer();
    expect(t.watch).toHaveBeenCalledOnce();
  });

  it('API permissions absente : attente', async () => {
    const t = installer(undefined);
    await vidange();
    expect(t.watch).not.toHaveBeenCalled();
    expect(t.service.etat().statut).toBe('attente');
  });

  it('denied : refus', async () => {
    const t = installer('denied');
    await vidange();
    expect(t.watch).not.toHaveBeenCalled();
    expect(t.service.etat().statut).toBe('refus');
  });

  it('erreurs : code 1 -> refus, autres -> indisponible, jamais d’exception', async () => {
    const t = installer('granted');
    await vidange();
    t.echouer(1);
    expect(t.service.etat().statut).toBe('refus');
    t.echouer(2);
    expect(t.service.etat().statut).toBe('indisponible');
    t.echouer(3);
    expect(t.service.etat().statut).toBe('indisponible');
  });

  it('pas de navigator.geolocation : indisponible à activer()', async () => {
    const t = installer('prompt', false);
    await vidange();
    t.service.activer();
    expect(t.service.etat().statut).toBe('indisponible');
  });

  it('page cachée : clearWatch et coords effacées ; visible : reprise', async () => {
    const t = installer('granted');
    await vidange();
    t.envoyer(10);
    visibilite('hidden');
    expect(t.clearWatch).toHaveBeenCalledWith(7);
    expect(t.service.etat().coords).toBeUndefined();
    visibilite('visible');
    expect(t.watch).toHaveBeenCalledTimes(2);
  });

  it('n’écrit jamais dans le stockage du navigateur (RG-036)', async () => {
    const set = vi.spyOn(Storage.prototype, 'setItem');
    const t = installer('granted');
    await vidange();
    t.envoyer(10);
    expect(set).not.toHaveBeenCalled();
  });

  it('relire() lit une position fraîche (maximumAge 0) et met l’état à jour', async () => {
    const getCurrentPosition = vi.fn((ok: Succes, _ko: Echec, o?: object) => {
      expect(o).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 });
      ok({ coords: { latitude: 1, longitude: 2, accuracy: 8 } });
    });
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    const service = TestBed.inject(Position);
    await expect(service.relire()).resolves.toEqual({ latitude: 1, longitude: 2, precision: 8 });
    expect(service.etat().coords?.precision).toBe(8);
  });

  it('relire() sans position disponible : null', async () => {
    vi.stubGlobal('navigator', {
      geolocation: { getCurrentPosition: (_o: Succes, ko: Echec) => ko({ code: 2 }) },
    });
    await expect(TestBed.inject(Position).relire()).resolves.toBeNull();
  });
});
