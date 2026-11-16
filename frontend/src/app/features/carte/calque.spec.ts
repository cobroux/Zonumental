import { libelle, pourcentage, rayon } from './calque';

const m = (numero: number, ville: string, capture: boolean) => ({
  numero,
  ville: { nom: ville },
  captureeLe: capture ? '2026-01-01T00:00:00Z' : null,
});

describe('rayon du brouillard', () => {
  it('62 px au zoom initial, double à chaque zoom', () => {
    expect(rayon(12, 12)).toBe(62);
    expect(rayon(13, 12)).toBe(124);
    expect(rayon(11, 12)).toBe(31);
  });
});

describe('pourcentage Paris dévoilé', () => {
  it('capturés de Paris sur catalogue de Paris, arrondi inférieur', () => {
    const liste = [
      m(1, 'Paris', true),
      m(2, 'Paris', false),
      m(3, 'Paris', false),
      m(4, 'Lyon', true),
    ];
    expect(pourcentage(liste, 'Paris')).toBe(33);
  });
  it('0 sans monument de la ville', () => {
    expect(pourcentage([m(4, 'Lyon', true)], 'Paris')).toBe(0);
    expect(pourcentage([], 'Paris')).toBe(0);
  });
  it('100 quand tout est capturé', () => {
    expect(pourcentage([m(1, 'Paris', true)], 'Paris')).toBe(100);
  });
});

describe('libellé de l’épingle (RG-054)', () => {
  it('numéro sur 3 chiffres, jamais le nom', () => {
    expect(libelle({ numero: 5 })).toBe('N° 005');
    expect(libelle({ numero: 118 })).toBe('N° 118');
  });
});
