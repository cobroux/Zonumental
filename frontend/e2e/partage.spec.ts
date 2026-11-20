import { expect, test } from '@playwright/test';
import { aMetres, mockApi } from './api';

test.use({ geolocation: aMetres(100), viewport: { width: 390, height: 844 } });

test('fidelite-19 : « Partager ma page » télécharge une image 1080 x 1920 sans Web Share', async ({
  page,
}) => {
  const api = await mockApi(page);
  api.captures.add(1);
  // PNG 1x1 bleu : rend visible le cadrage de la photo dans l'image partagée
  await page.route('**/api/captures/1/photo', (r) =>
    r.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/QbA4VQAAAABJRU5ErkJggg==',
        'base64',
      ),
    }),
  );
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'canShare', { value: undefined }),
  );
  await page.goto('/monument/1');
  await expect(page.getByRole('heading', { name: 'Tour A' })).toBeVisible();
  const bouton = page.getByRole('button', { name: 'Partager ma page' });
  await bouton.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '../docs/design/captures/partage-fidelite-19-fiche.png' });
  const [telechargement] = await Promise.all([page.waitForEvent('download'), bouton.click()]);
  expect(telechargement.suggestedFilename()).toBe('zonumental-1.png');
  await telechargement.saveAs('../docs/design/captures/partage-fidelite-19.png');
  await expect(page.getByRole('status')).toContainText('Image téléchargée.');
});
