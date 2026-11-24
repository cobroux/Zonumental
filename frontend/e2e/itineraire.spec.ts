import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { aMetres, mockApi } from './api';

test.use({ geolocation: aMetres(100), viewport: { width: 390, height: 844 } });

// Capture locale avec les vraies tuiles : CAPTURE=1 PORT=4312 npx playwright test itineraire
test('Itinéraire : mention, tracé, résumé, étapes, écart, accessibilité', async ({
  page,
  context,
}, info) => {
  const api = await mockApi(page);
  api.captures.add(1);
  api.modeFacile = true;
  if (!process.env['CAPTURE'])
    await page.route('https://tiles.openfreemap.org/**', (r) => r.abort());
  let corps = '';
  await page.route('**/api/itineraire', (r) => {
    corps = r.request().postData() ?? '';
    return r.fulfill({
      json: {
        distanceMetres: 1840,
        dureeSecondes: 1380,
        trace: {
          type: 'LineString',
          coordinates: [
            [2.2945, 48.8584],
            [2.2985, 48.8605],
            [2.3045, 48.8625],
          ],
        },
        etapes: [
          { instruction: 'Marchez vers le nord-est.', distanceMetres: 220 },
          { instruction: 'Tournez à droite.', distanceMetres: 900 },
          { instruction: 'Vous êtes arrivé.', distanceMetres: 0 },
        ],
      },
    });
  });
  await page.goto('/carte');
  await page.locator('.epingles button').nth(1).click();
  await page.getByRole('button', { name: 'Itinéraire', exact: true }).click();
  await expect(page.getByText('Ta position arrondie')).toBeVisible();
  await page.getByRole('button', { name: 'Calculer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'min · ' })).toHaveText(
    '23 min · 1,8 km',
  );
  expect(JSON.parse(corps).numero).toBe(4);
  await page.getByText('Étapes (3)').click();
  await expect(page.locator('.selection ol li')).toHaveCount(3);
  if (process.env['CAPTURE'])
    await page.screenshot({ path: info.outputPath('itineraire-itineraire-3-390.png') });
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(violations).toEqual([]);
  // itineraire-4 : position simulée à ~1 km du tracé -> annonce et « Recalculer », sans appel réseau
  await context.setGeolocation({ latitude: 48.87, longitude: 2.3 });
  await expect(page.getByText("Tu t'es écarté de l'itinéraire")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recalculer' })).toBeVisible();
  if (process.env['CAPTURE'])
    await page.screenshot({ path: info.outputPath('itineraire-itineraire-4-390.png') });
  await page.getByRole('button', { name: "Effacer l'itinéraire" }).click();
  await expect(page.getByRole('button', { name: 'Itinéraire', exact: true })).toBeFocused();
});

test('Mode facile désactivé : pas de bouton Itinéraire ; activé depuis le Profil : il apparaît', async ({
  page,
}) => {
  await mockApi(page);
  await page.route('https://tiles.openfreemap.org/**', (r) => r.abort());
  await page.goto('/carte');
  await page.locator('.epingles button').nth(1).click();
  await expect(page.locator('.selection')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Itinéraire', exact: true })).toHaveCount(0);
  await page.goto('/profil');
  await page.getByRole('switch', { name: 'Mode facile' }).check();
  await expect(page.getByRole('switch', { name: 'Mode facile' })).toBeChecked();
  await page.goto('/carte');
  await page.locator('.epingles button').nth(1).click();
  await expect(page.getByRole('button', { name: 'Itinéraire', exact: true })).toBeVisible();
});
