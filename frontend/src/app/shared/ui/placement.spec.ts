import { placement } from './placement';

describe('placement', () => {
  const de1a = (n: number) => Array.from({ length: n }, (_, i) => placement(i + 1));

  it('est stable : même numéro, même résultat', () => {
    expect(placement(42)).toEqual(placement(42));
  });

  it('reste dans les bornes : ±8° et ±5 %', () => {
    for (const p of de1a(200)) {
      expect(Math.abs(p.rotation)).toBeLessThanOrEqual(8);
      expect(Math.abs(p.dx)).toBeLessThanOrEqual(5);
      expect(Math.abs(p.dy)).toBeLessThanOrEqual(5);
    }
  });

  it('varie : au moins 20 rotations distinctes sur 120 numéros', () => {
    expect(new Set(de1a(120).map((p) => p.rotation)).size).toBeGreaterThanOrEqual(20);
  });

  it('ne produit jamais NaN', () => {
    for (const n of [0, 1, 9999]) {
      expect(Object.values(placement(n)).every(Number.isFinite)).toBe(true);
    }
  });
});
