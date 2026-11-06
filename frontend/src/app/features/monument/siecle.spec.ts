import { formaterSiecle } from './siecle';

describe('formaterSiecle', () => {
  it.each([
    [17, 'XVIIe siècle'],
    [21, 'XXIe siècle'],
    [1, 'Ier siècle'],
    [-1, 'Ier siècle av. J.-C.'],
    [-5, 'Ve siècle av. J.-C.'],
    [null, '—'],
  ])('%s -> %s', (n, attendu) => expect(formaterSiecle(n)).toBe(attendu));
});
