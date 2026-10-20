import { aujourdhuiParis, dateIso, erreurs, messageDe } from './validation';

const ok1 = {
  pseudo: 'Marco_75',
  email: 'a@b.fr',
  motDePasse: 'chat-bleu-47-lune',
  dateNaissance: '19/10/2011',
  cgu: true,
};
const aujourdhui = '2026-10-19';
const erreursChamps = (v: typeof ok1) => erreurs(v, aujourdhui);

describe('pseudo, e-mail, mot de passe', () => {
  it('accepte des valeurs correctes', () => expect(erreursChamps(ok1)).toEqual({}));

  it('refuse un mot de passe de 11 caractères, accepte 12 avec accents et espaces', () => {
    expect(erreursChamps({ ...ok1, motDePasse: 'Abc123!xyz_' }).motDePasse).toBeTruthy();
    expect(erreursChamps({ ...ok1, motDePasse: 'été à la mer' })).toEqual({});
  });

  it('refuse un mot de passe de plus de 128 caractères', () =>
    expect(erreursChamps({ ...ok1, motDePasse: 'a'.repeat(129) }).motDePasse).toBeTruthy());

  it.each(['ab', 'a'.repeat(21), 'avec espace', 'é'])('refuse le pseudo « %s »', (pseudo) =>
    expect(erreursChamps({ ...ok1, pseudo }).pseudo).toBeTruthy(),
  );

  it('refuse un e-mail invalide', () =>
    expect(erreursChamps({ ...ok1, email: 'pas-un-mail' }).email).toBeTruthy());
});

const avec = (dateNaissance: string, cgu = true) => ({ ...ok1, dateNaissance, cgu });
const dateErr = (d: string) => erreurs(avec(d), aujourdhui).dateNaissance;

describe('âge minimum 15 ans (RG-002)', () => {
  it('15 ans aujourd’hui : accepté', () => expect(erreurs(ok1, aujourdhui)).toEqual({}));

  it('15 ans demain : refusé', () => expect(dateErr('20/10/2011')).toMatch(/15 ans/));

  it('29 février : 15 ans le 1er mars seulement', () => {
    expect(erreurs(avec('29/02/2012'), '2027-02-28').dateNaissance).toMatch(/15 ans/);
    expect(erreurs(avec('29/02/2012'), '2027-03-01')).toEqual({});
  });

  it('refuse une date future', () => expect(dateErr('01/01/2030')).toBeTruthy());

  it.each(['31/02/2000', '', '01/13/2000', '1/1/99', 'abc', '2000'])(
    'refuse la date invalide « %s »',
    (d) => expect(dateErr(d)).toMatch(/date/i),
  );

  it('refuse sans CGU', () =>
    expect(erreurs(avec('19/10/2011', false), aujourdhui).cgu).toBeTruthy());

  it('remonte toutes les erreurs d’un coup', () =>
    expect(
      Object.keys(
        erreurs(
          { pseudo: '', email: '', motDePasse: '', dateNaissance: '', cgu: false },
          aujourdhui,
        ),
      ),
    ).toEqual(['pseudo', 'email', 'motDePasse', 'dateNaissance', 'cgu']));
});

describe('dateIso et aujourdhuiParis', () => {
  it.each([
    '05/03/2001',
    '5 / 3 / 2001',
    '05-03-2001',
    '05.03.2001',
    '05032001',
    ' 5/3/2001 ',
    '2001-03-05',
  ])('lit « %s » comme 2001-03-05', (t) => expect(dateIso(t)).toBe('2001-03-05'));

  it.each(['', '5/3', '5/3/01', '32/01/2000', '0/1/2000', '1/1/2000/1'])('refuse « %s »', (t) =>
    expect(dateIso(t)).toBeNull(),
  );

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
