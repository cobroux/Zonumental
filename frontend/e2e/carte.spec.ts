import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { aMetres, mockApi } from './api';

test.use({ geolocation: aMetres(100), viewport: { width: 390, height: 844 } });

test('Carte : épingles, attribution, accessibilité (tuiles coupées)', async ({ page }) => {
  const api = await mockApi(page);
  api.captures.add(1);
  await page.route('https://tiles.openfreemap.org/**', (r) => r.abort());
  await page.goto('/carte');
  await expect(page.locator('.position')).toBeVisible();
  const epingles = page.locator('.epingles button');
  await expect(epingles).toHaveCount(2); // A (obtenu) et D (à faire) sont à Paris
  await expect(epingles.nth(0).locator('zn-tampon')).toHaveCount(1);
  await expect(epingles.nth(1)).toHaveText('004');
  await expect(epingles.nth(1)).toHaveAccessibleName('N° 004');
  await expect(page.getByText('Paris dévoilé à 50 %')).toBeVisible();
  await expect(page.getByText('OpenStreetMap contributors')).toBeVisible();
  await epingles.nth(1).click();
  await expect(page.getByRole('link', { name: /Arc D/ })).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(violations).toEqual([]);
});

test('Carte : position, Recentrer et monument le plus proche', async ({ page }, info) => {
  const api = await mockApi(page);
  api.captures.add(1);
  // Capture locale avec les vraies tuiles : CAPTURE=1 npx playwright test carte
  if (!process.env['CAPTURE'])
    await page.route('https://tiles.openfreemap.org/**', (r) => r.abort());
  await page.goto('/carte');
  await expect(page.locator('.position .centre')).toBeVisible();
  const proche = page.getByRole('link', { name: /Arc D/ });
  await expect(proche).toContainText('N° 004 · Commun · À découvrir');
  await expect(proche).toContainText(/\d+ m · \d+ min à pied/);
  await expect(proche).toContainText('Y aller');
  await expect(proche).toHaveAttribute('href', '/monument/4');
  await page.getByRole('button', { name: 'Recentrer sur ma position' }).click();
  if (process.env['CAPTURE'])
    await page.screenshot({ path: info.outputPath('carte-fidelite-21-390.png') });
  await proche.click();
  await expect(page).toHaveURL(/\/monument\/4/);
});

test.describe('sans autorisation de position', () => {
  test.use({ permissions: [] });
  test('Carte utilisable : épingles, ni point, ni Recentrer, ni demande', async ({ page }) => {
    await mockApi(page);
    await page.route('https://tiles.openfreemap.org/**', (r) => r.abort());
    await page.goto('/carte');
    await expect(page.locator('.epingles button')).toHaveCount(2);
    await expect(page.locator('.position')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Recentrer sur ma position' })).toHaveCount(0);
    await expect(page.locator('.proche')).toHaveCount(0);
  });
});
