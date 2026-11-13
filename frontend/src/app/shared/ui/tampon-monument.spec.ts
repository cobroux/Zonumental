import {
  ENCRE_PAR_RARETE,
  MonumentResume,
  TypeMonument,
  FORME_PAR_TYPE,
  contenuTampon,
  etiquetteTampon,
} from './tampon-monument';

const mon = (over: Partial<MonumentResume> = {}) =>
  ({
    numero: 1,
    nom: 'Tour Eiffel',
    type: 'TOUR',
    rarete: 'LEGENDAIRE',
    captureeLe: '2026-10-19T10:00:00Z',
    ville: { codeInsee: '75056', nom: 'Paris' },
    ...over,
  }) as MonumentResume;

describe('tampon-monument', () => {
  it('forme par type et encre par rareté (spec §3)', () => {
    expect(FORME_PAR_TYPE.TOUR).toBe('cercle');
    expect(FORME_PAR_TYPE.PONT).toBe('rectangle');
    expect(FORME_PAR_TYPE.RELIGIEUX).toBe('octogone');
    expect(FORME_PAR_TYPE.MUSEE).toBe('ovale');
    expect(Object.keys(FORME_PAR_TYPE).length).toBe(8);
    expect(ENCRE_PAR_RARETE).toEqual({
      COMMUN: 'commun',
      RARE: 'rare',
      LEGENDAIRE: 'legendaire',
    });
  });

  it('cercle : arc VILLE · NOM · N°001 ·, rareté au centre, date JJ·MM·AA', () => {
    expect(contenuTampon(mon())).toEqual({
      haut: 'PARIS · TOUR EIFFEL · N°001 ·',
      centre: 'LÉGENDAIRE',
      bas: '19·10·26',
    });
  });

  it('rectangle : nom, ville, numéro et rareté', () => {
    const c = contenuTampon(
      mon({ type: 'PONT', nom: 'Arc de Triomphe', numero: 2, rarete: 'RARE' }),
    );
    expect(c).toEqual({ haut: 'ARC DE TRIOMPHE', centre: 'PARIS', bas: 'N°002 · RARE' });
  });

  it('octogone : nom, numéro, rareté', () => {
    const c = contenuTampon(mon({ type: 'RELIGIEUX', nom: 'Notre-Dame', numero: 3 }));
    expect(c).toEqual({ haut: 'NOTRE-DAME', centre: 'N°003', bas: 'LÉGENDAIRE' });
  });

  it('ovale : ville, nom, numéro et rareté (commun écrit en toutes lettres)', () => {
    const c = contenuTampon(
      mon({ type: 'MUSEE', nom: 'Opéra Garnier', numero: 8, rarete: 'COMMUN' }),
    );
    expect(c).toEqual({ haut: 'PARIS', centre: 'OPÉRA GARNIER', bas: 'N°008 · COMMUN' });
  });

  it('nom trop long : tronqué avec …, jamais abrégé ; l’arc tient en 34 caractères', () => {
    const arc = contenuTampon(mon({ nom: 'Chapelle expiatoire de la Révolution' })).haut;
    expect(arc.length).toBeLessThanOrEqual(34);
    expect(arc).toContain('…');
    const octo = contenuTampon(mon({ type: 'RELIGIEUX', nom: 'Sainte-Chapelle de Vincennes' }));
    expect(octo.haut.length).toBeLessThanOrEqual(14);
    expect(octo.haut.endsWith('…')).toBe(true);
    expect(octo.haut.startsWith('SAINTE-CHAPE')).toBe(true);
  });

  it.each(['TOUR', 'PONT', 'RELIGIEUX', 'MUSEE'] as TypeMonument[])(
    'nom accessible (%s) : nom complet, N°001 sans espace, ville, rareté, date',
    (type) => {
      expect(etiquetteTampon(mon({ type, nom: 'Sainte-Chapelle de Vincennes' }))).toBe(
        'Sainte-Chapelle de Vincennes, N°001, Paris, légendaire, tamponné le 19 octobre 2026',
      );
    },
  );
});
