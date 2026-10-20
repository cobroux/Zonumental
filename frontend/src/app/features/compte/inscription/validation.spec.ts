import { aujourdhuiParis, dateIso, erreursEtape1, erreursEtape2, messageDe } from './validation';

const ok1 = { pseudo: 'Marco_75', email: 'a@b.fr', motDePasse: 'chat-bleu-47-lune' };

describe('étape 1', () => {
  it('accepte des valeurs correctes', () => expect(erreursEtape1(ok1)).toEqual({}));

  it('refuse un mot de passe de 11 caractères, accepte 12 avec accents et espaces', () => {
    expect(erreursEtape1({ ...ok1, motDePasse: 'Abc123!xyz_' }).motDePasse).toBeTruthy();
    expect(erreursEtape1({ ...ok1, motDePasse: 'été à la mer' })).toEqual({});
  });

  it('refuse un mot de passe de plus de 128 caractères', () =>
    expect(erreursEtape1({ ...ok1, motDePasse: 'a'.repeat(129) }).motDePasse).toBeTruthy());

  it.each(['ab', 'a'.repeat(21), 'avec espace', 'é'])('refuse le pseudo « %s »', (pseudo) =>
    expect(erreursEtape1({ ...ok1, pseudo }).pseudo).toBeTruthy(),
  );

  it('refuse un e-mail invalide', () =>
    expect(erreursEtape1({ ...ok1, email: 'pas-un-mail' }).email).toBeTruthy());
});

const naissance = (jour: string, mois: string, annee: string) => ({ jour, mois, annee });
const ok2 = { cgu: true, naissance: naissance('19', '10', '2011') };

describe('étape 2 : âge minimum 15 ans (RG-002)', () => {
  const aujourdhui = '2026-10-19';

  it('15 ans aujourd’hui : accepté', () => expect(erreursEtape2(ok2, aujourdhui)).toEqual({}));

  it('15 ans demain : refusé', () =>
    expect(
      erreursEtape2({ ...ok2, naissance: naissance('20', '10', '2011') }, aujourdhui).dateNaissance,
    ).toMatch(/15 ans/));

  it('29 février : 15 ans le 1er mars seulement', () => {
    const n = { ...ok2, naissance: naissance('29', '2', '2012') };
    expect(erreursEtape2(n, '2027-02-28').dateNaissance).toMatch(/15 ans/);
    expect(erreursEtape2(n, '2027-03-01')).toEqual({});
  });

  it('refuse une date future', () =>
    expect(
      erreursEtape2({ ...ok2, naissance: naissance('1', '1', '2030') }, aujourdhui).dateNaissance,
    ).toBeTruthy());

  it.each([
    ['31', '2', '2000'],
    ['', '1', '2000'],
    ['1', '13', '2000'],
    ['1', '1', '99'],
  ])('refuse la date invalide %s/%s/%s', (j, m, a) =>
    expect(
      erreursEtape2({ ...ok2, naissance: naissance(j, m, a) }, aujourdhui).dateNaissance,
    ).toMatch(/date/i),
  );

  it('refuse sans CGU', () =>
    expect(erreursEtape2({ ...ok2, cgu: false }, aujourdhui).cgu).toBeTruthy());
});

describe('dateIso et aujourdhuiParis', () => {
  it('formate en AAAA-MM-JJ', () =>
    expect(dateIso(naissance('5', '3', '2001'))).toBe('2001-03-05'));

  it('prend le jour à Europe/Paris, pas en UTC', () =>
    expect(aujourdhuiParis(new Date('2026-10-19T22:30:00Z'))).toBe('2026-10-20'));
});

describe('messageDe', () => {
  it('dérive le texte d’un code de contrainte, par champ', () => {
    expect(messageDe('motDePasse', 'trop-court')).toMatch(/12 caractères/);
    expect(messageDe('dateNaissance', 'date-invalide')).toMatch(/date/i);
  });

  it('retombe sur un message par défaut pour un code inconnu', () =>
    expect(messageDe('pseudo', 'inconnu')).toBeTruthy());
});
