import { expect, Page } from '@playwright/test';

/** Position de A ; l'explorateur est placé au nord par décalage de latitude (1 m ≈ 0,000009°). */
export const A = { latitude: 48.8584, longitude: 2.2945 };
export const aMetres = (m: number) => ({
  latitude: A.latitude + m * 0.000009,
  longitude: A.longitude,
  accuracy: 10,
});

const ville = (codeInsee: string, nom: string) => ({ codeInsee, nom });
const paris = ville('75056', 'Paris');
const lyon = ville('69123', 'Lyon');
// N = 4 : A et D à Paris (proches l'un de l'autre), B et C à Lyon.
const MONUMENTS = [
  { numero: 1, nom: 'Tour A', ville: paris, position: A },
  { numero: 2, nom: 'Basilique B', ville: lyon, position: { latitude: 45.762, longitude: 4.822 } },
  { numero: 3, nom: 'Pont C', ville: lyon, position: { latitude: 45.77, longitude: 4.83 } },
  {
    numero: 4,
    nom: 'Arc D',
    ville: paris,
    position: { latitude: A.latitude + 0.0003, longitude: A.longitude },
  },
].map((m) => ({
  ...m,
  type: 'TOUR',
  rarete: 'COMMUN',
  rayonCaptureMetres: 150,
  image: null,
}));

const HISTOIRE = {
  texte: 'Histoire de la Tour A.',
  sourceUrl: 'https://fr.wikipedia.org/wiki/Tour_A',
  licence: 'CC BY-SA 4.0',
};
const CAPTUREE_LE = '2026-11-09T10:00:00Z';
// JPEG 1x1
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

const distance = (a: typeof A, b: typeof A) => {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
};

const champ = (corps: string, nom: string) =>
  new RegExp(`name="${nom}"\\r\\n\\r\\n([^\\r]*)`).exec(corps)?.[1] ?? '';

const probleme = (status: number, code: string, extra = {}) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({
    type: `https://zonumental.fr/erreurs/${code}`,
    title: code,
    status,
    code,
    ...extra,
  }),
});

/** Faux backend conforme à docs/api/openapi.yaml ; `captures` = numéros capturés, `envois` = POST /captures reçus. */
export async function mockApi(page: Page) {
  const etat = {
    captures: new Set<number>(),
    envois: [] as number[],
    refuser: null as number | null,
  };
  const resume = (m: (typeof MONUMENTS)[number]) => ({
    ...m,
    captureeLe: etat.captures.has(m.numero) ? CAPTUREE_LE : null,
  });
  await page.route(/\/api\/(auth|catalogue|captures)\b/, async (route) => {
    const req = route.request();
    const { pathname } = new URL(req.url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (pathname === '/api/auth/renouvellement')
      return json({ jetonAcces: 'jeton', expireDans: 900 });
    if (pathname === '/api/catalogue/monuments') return json(MONUMENTS.map(resume));
    if (pathname === '/api/captures' && req.method() === 'POST') {
      const corps = req.postDataBuffer()?.toString('latin1') ?? '';
      const numero = Number(champ(corps, 'numero'));
      etat.envois.push(numero);
      const m = MONUMENTS.find((x) => x.numero === numero)!;
      if (etat.refuser === numero) return route.fulfill(probleme(422, 'precision-insuffisante'));
      const d = distance(
        {
          latitude: Number(champ(corps, 'latitude')),
          longitude: Number(champ(corps, 'longitude')),
        },
        m.position,
      );
      if (d > m.rayonCaptureMetres)
        return route.fulfill(
          probleme(422, 'trop-loin', { distanceMetres: Math.ceil(d / 10) * 10 }),
        );
      etat.captures.add(numero);
      return json(
        {
          numero,
          captureeLe: CAPTUREE_LE,
          distanceMetres: Math.round(d),
          photoUrl: `/api/captures/${numero}/photo`,
          histoire: HISTOIRE,
        },
        201,
      );
    }
    const photo = /^\/api\/captures\/(\d+)\/photo$/.exec(pathname);
    if (photo) return route.fulfill({ contentType: 'image/jpeg', body: JPEG });
    const fiche = /^\/api\/catalogue\/monuments\/(\d+)$/.exec(pathname);
    const m = MONUMENTS.find((x) => x.numero === Number(fiche?.[1]));
    if (m) {
      const prise = etat.captures.has(m.numero);
      return json({
        ...resume(m),
        siecle: 19,
        stats: prise ? { annee: 1889, style: 'Art nouveau', hauteurMetres: 330 } : null,
        photoUrl: prise ? `/api/captures/${m.numero}/photo` : null,
        histoire: prise ? HISTOIRE : null,
      });
    }
    return route.fulfill(probleme(404, 'introuvable'));
  });
  return etat;
}

/** Attend que la caméra factice fournisse des images avant de prendre la photo. */
export const cameraPrete = (page: Page) =>
  expect
    .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.videoWidth))
    .toBeGreaterThan(0);
