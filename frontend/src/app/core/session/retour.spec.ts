import { retourSur } from './retour';

describe('retourSur', () => {
  it.each(['/profil', '/monuments?x=1'])('accepte %s', (v) => expect(retourSur(v)).toBe(v));
  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', '', null, undefined, 42])(
    'refuse %s',
    (v) => expect(retourSur(v)).toBe('/'),
  );
});
