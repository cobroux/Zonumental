import { afterEach, describe, expect, it, vi } from 'vitest';
import { Page, dessiner, ligneMrz, partager, pseudoPartage, rang } from './partage';

const page: Page = {
  nom: 'Basilique du Sacré-Cœur',
  ville: 'Paris',
  numero: 4,
  rarete: 'RARE',
  encre: '--zn-tampon-rare',
  iso: '2026-10-19T10:00:00Z',
  annee: 1914,
  pseudo: 'Explorateur',
  capturesFrance: 38,
  totalFrance: 118,
  photo: null,
};

describe('partage', () => {
  it('rang : monuments distincts des collections, capturé si capturé quelque part', () => {
    const col = (...m: [number, boolean][]) => ({
      captures: 0,
      monuments: m.map(([numero, capture]) => ({ numero, capture })),
    });
    expect(rang([col([1, true], [2, false]), col([2, true], [3, false])])).toEqual({
      n: 2,
      total: 3,
    });
    expect(rang([])).toEqual({ n: 0, total: 0 });
  });

  it('pseudo : seulement avec le consentement classement (D5)', () => {
    expect(pseudoPartage('lea', true)).toBe('@lea');
    expect(pseudoPartage('lea', false)).toBe('Explorateur');
    expect(pseudoPartage(undefined, true)).toBe('Explorateur');
  });

  it('MRZ : 2 lignes de 30 caractères, accents et ponctuation neutralisés', () => {
    const [a, b] = ligneMrz(page);
    expect(a).toBe('ZNM<FRA<BASILIQUE<DU<SACRE<004');
    expect(b).toBe('PARIS<<19102026<<038<118<<<<<<');
    expect(a).toHaveLength(30);
  });

  it('dessine nom, rang, pseudo et « CAPTURÉ » dans une image 1080 x 1920', () => {
    const textes: string[] = [];
    const ctx = new Proxy(
      { fillText: (t: string) => textes.push(t), canvas: {} },
      {
        get: (cible, cle) => (cle in cible ? (cible as never)[cle] : () => undefined),
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D;
    dessiner(ctx, page, { couleur: (t) => t, police: { titre: 'T', ui: 'U', mono: 'M' } });
    expect(textes).toEqual(
      expect.arrayContaining([
        'CAPTURÉ',
        'par Explorateur',
        '38 / 118 en France',
        'Basilique du',
        'Sacré-Cœur',
      ]),
    );
  });

  it("guillochis : 36 ellipses 230 x 54 en (202, 590) comme V2-Partage ; le disque central vide en est l'œil, pas un médaillon", () => {
    const ellipses: unknown[][] = [];
    const ctx = new Proxy(
      { ellipse: (...a: unknown[]) => ellipses.push(a), canvas: {} },
      {
        get: (cible, cle) => (cle in cible ? (cible as never)[cle] : () => undefined),
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D;
    dessiner(ctx, page, { couleur: (t) => t, police: { titre: 'T', ui: 'U', mono: 'M' } });
    const guil = ellipses.filter((e) => e[0] === 202 && e[1] === 590);
    expect(guil).toHaveLength(36);
    expect(guil.every((e) => e[2] === 230 && e[3] === 54)).toBe(true);
    expect(ellipses.some((e) => e[2] === 54 && e[3] === 54)).toBe(false); // aucun cercle ajouté
  });
});

describe('partager', () => {
  afterEach(() => vi.restoreAllMocks());
  const blob = new Blob(['x'], { type: 'image/png' });

  it('partage natif quand les fichiers sont supportés', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { canShare: () => true, share });
    expect(await partager(blob, 'page')).toBe('partage');
    expect(share).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('repli : téléchargement si Web Share indisponible', async () => {
    vi.stubGlobal('navigator', {});
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    expect(await partager(blob, 'page')).toBe('telechargement');
    expect(clic).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('repli aussi si le partage échoue autrement que par annulation', async () => {
    vi.stubGlobal('navigator', {
      canShare: () => true,
      share: vi.fn().mockRejectedValue(new DOMException('x', 'NotAllowedError')),
    });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    expect(await partager(blob, 'page')).toBe('telechargement');
    vi.unstubAllGlobals();
  });
});
