import { lireCouleurs, styleCarte } from './style-carte';

const couleurs = { fond: 'f0', rue: 'r1', rueFine: 'r2', eau: 'e0' };

describe('style de la carte', () => {
  it('sans libellé, glyphe ni sprite (pas de requête tierce hors tuiles)', () => {
    const style = styleCarte(couleurs);
    expect(style.glyphs).toBeUndefined();
    expect(style.sprite).toBeUndefined();
    expect(style.layers.some((l) => l.type === 'symbol')).toBe(false);
  });

  it('source vectorielle unique et couleurs venant des tokens', () => {
    const style = styleCarte(couleurs, 'https://exemple.test/planet');
    expect(Object.values(style.sources)).toEqual([
      { type: 'vector', url: 'https://exemple.test/planet' },
    ]);
    const json = JSON.stringify(style.layers);
    for (const c of Object.values(couleurs)) expect(json).toContain(c);
  });

  it('lit les couleurs dans les variables CSS', () => {
    const el = document.createElement('div');
    document.body.append(el);
    el.style.setProperty('--zn-carte-fond', '#111111');
    el.style.setProperty('--zn-carte-rue', '#222222');
    el.style.setProperty('--zn-carte-rue-fine', '#333333');
    el.style.setProperty('--zn-carte-eau', '#444444');
    expect(lireCouleurs(el)).toEqual({
      fond: '#111111',
      rue: '#222222',
      rueFine: '#333333',
      eau: '#444444',
    });
    el.remove();
  });
});
