import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { aMetres, mockApi } from './api';

test.use({ geolocation: aMetres(100), viewport: { width: 390, height: 844 } });

// Captures : CAPTURE=1 npx playwright test bientot
test('Carte France « Bientôt » ; Défis : carte du défi et état de lancement du classement, accessibles', async ({
  page,
}, info) => {
  await mockApi(page);
  await page.route('https://tiles.openfreemap.org/**', (r) => r.abort());
  await page.goto('/carte');
  await page.getByRole('tab', { name: 'France' }).click();
  await expect(page.getByText('Carte de France : bientôt disponible')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Paris' })).toBeInViewport({ ratio: 1 });
  let { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(violations).toEqual([]);
  if (process.env['CAPTURE'])
    await page.screenshot({ path: info.outputPath('carte-france-fidelite-24-390.png') });
  await page.goto('/defis');
  await expect(page.getByRole('heading', { name: 'Les trois dômes' })).toBeVisible();
  await expect(page.getByText('FIN DANS 3 J 04 H')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Le classement de Paris/ })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Explorateurs de Paris' })).toBeVisible();
  await expect(page.getByText('23 / 50')).toBeVisible();
  ({ violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze());
  expect(violations).toEqual([]);
  if (process.env['CAPTURE'])
    await page.screenshot({ path: info.outputPath('defis-fidelite-23-390.png') });
});
