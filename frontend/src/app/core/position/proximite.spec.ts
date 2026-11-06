import { MonumentResume } from '../api/models/monument-resume';
import { distanceMetres, etatBouton, formaterDistance, proches } from './proximite';

const monument = (numero: number, latitude: number, captureeLe: string | null = null, rayon = 50) =>
  ({
    numero,
    nom: `M${numero}`,
    position: { latitude, longitude: 2 },
    captureeLe,
    rayonCaptureMetres: rayon,
  }) as MonumentResume;

// 0,001° de latitude = 111,2 m
const ici = (precision = 10) => ({ latitude: 48, longitude: 2, precision });
const ok = (precision?: number) => ({ statut: 'ok' as const, coords: ici(precision) });

describe('distanceMetres', () => {
  it('0 pour le même point, ~111 m pour 0,001° de latitude', () => {
    expect(distanceMetres(ici(), { latitude: 48, longitude: 2 })).toBe(0);
    expect(distanceMetres(ici(), { latitude: 48.001, longitude: 2 })).toBeCloseTo(111.2, 0);
  });
});

describe('formaterDistance', () => {
  it.each([
    [420, '420 m'],
    [424, '420 m'],
    [996, '1,0 km'],
    [1234, '1,2 km'],
    [2000, '2,0 km'],
  ])('%d m -> %s', (m, texte) => expect(formaterDistance(m)).toBe(texte));
});

describe('proches', () => {
  it('garde < 2000 m, trie par distance, marque la capture', () => {
    const liste = proches(
      [monument(1, 48.01), monument(2, 48.0005, '2026-01-01T00:00:00Z'), monument(3, 48.02)],
      ici(),
    );
    expect(liste.map((p) => p.numero)).toEqual([2, 1]); // 3 est à 2,2 km
    expect(liste.map((p) => p.capture)).toEqual([true, false]);
  });
});

describe('etatBouton', () => {
  it.each(['attente', 'refus', 'indisponible'] as const)('%s -> sans-position', (statut) => {
    expect(etatBouton([], { statut }).etat).toBe('sans-position');
  });

  it('aucun monument proche -> loin', () => {
    expect(etatBouton([], ok())).toEqual({ etat: 'loin', texte: '> 2 km' });
  });

  it('tous capturés -> deja', () => {
    const p = proches([monument(1, 48.0005, '2026-01-01T00:00:00Z')], ici());
    expect(etatBouton(p, ok())).toEqual({ etat: 'deja', texte: 'Déjà tamponné ici' });
  });

  it('hors rayon -> proche avec distance du plus proche non capturé', () => {
    const p = proches([monument(1, 48.0001, '2026-01-01T00:00:00Z'), monument(2, 48.004)], ici());
    expect(etatBouton(p, ok())).toEqual({ etat: 'proche', texte: '440 m' });
  });

  it('dans le rayon, précision 100 m -> zone ; 101 m ou absente -> imprecis', () => {
    const p = proches([monument(1, 48.0003)], ici()); // 33 m <= 50
    expect(etatBouton(p, ok(100))).toEqual({ etat: 'zone', texte: 'Tamponner' });
    expect(etatBouton(p, ok(101))).toEqual({ etat: 'imprecis', texte: 'Signal faible' });
    expect(etatBouton(p, { statut: 'ok', coords: { latitude: 48, longitude: 2 } }).etat).toBe(
      'imprecis',
    );
  });

  it('le rayon propre au monument compte : 55 m hors de 50 m, dans 60 m', () => {
    const lat = 48 + 55 / 111195;
    expect(etatBouton(proches([monument(1, lat, null, 50)], ici()), ok()).etat).toBe('proche');
    expect(etatBouton(proches([monument(1, lat, null, 60)], ici()), ok()).etat).toBe('zone');
  });
});
