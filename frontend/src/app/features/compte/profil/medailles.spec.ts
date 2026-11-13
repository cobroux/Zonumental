import { medailles, niveau } from './medailles';

describe('medailles', () => {
  it('niveau = 1 + tampons ÷ 3 arrondi vers le bas', () => {
    expect([0, 2, 3, 41].map(niveau)).toEqual([1, 1, 2, 14]);
  });

  it('2 obtenues récentes, puis en cours les plus avancées, puis à découvrir', () => {
    const m = medailles({
      obtenus: [
        { code: 'PREMIER_TAMPON', libelle: 'A', obtenuLe: '2026-10-01T00:00:00Z' },
        { code: 'LEGENDE', libelle: 'B', obtenuLe: '2026-10-03T00:00:00Z' },
        { code: 'PARISIEN', libelle: 'C', obtenuLe: '2026-10-02T00:00:00Z' },
      ],
      enCours: [{ code: 'GLOBE_TROTTEUR', libelle: 'D', valeur: 2, seuil: 3 }],
    });
    expect(m.map((x) => [x.nom, x.etat])).toEqual([
      ['B', 'obtenue'],
      ['C', 'obtenue'],
      ['D', 'en-cours'],
      ['À découvrir', 'a-decouvrir'],
    ]);
    expect(m[0].encre).toBe('legendaire');
  });

  it('jamais vide : 4 à découvrir sans succès', () => {
    expect(medailles({ obtenus: [], enCours: [] }).every((x) => x.etat === 'a-decouvrir')).toBe(
      true,
    );
  });
});
