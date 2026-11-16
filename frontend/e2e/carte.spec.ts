import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { aMetres, mockApi } from './api';

test.use({ geolocation: aMetres(100) });

test('Carte : épingles, attribution, accessibilité (tuiles coupées)', async ({ page }) => {
  const api = await mockApi(page);
  api.captures.add(1);
  await page.route('https://tiles.openfreemap.org/**', (r) => r.abort());
  await page.goto('/carte');
  const epingles = page.locator('.epingles button');
  await expect(epingles).toHaveCount(2); // A (obtenu) et D (à faire) sont à Paris
  await expect(epingles.nth(0).locator('zn-tampon')).toHaveCount(1);
  await expect(epingles.nth(1)).toHaveText('004');
  await expect(epingles.nth(1)).toHaveAccessibleName('N° 004');
  await expect(page.getByText('Arc D')).toHaveCount(0); // RG-054 : pas de nom avant sélection
  await expect(page.getByText('Paris dévoilé à 50 %')).toBeVisible();
  await expect(page.getByText('OpenStreetMap contributors')).toBeVisible();
  await epingles.nth(1).click();
  await expect(page.getByRole('link', { name: /Arc D/ })).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(violations).toEqual([]);
});
