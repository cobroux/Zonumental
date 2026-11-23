import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { aMetres, mockApi } from './api';

test.use({ viewport: { width: 390, height: 844 } });

// Captures : CAPTURE=1 npx playwright test tamponner
test.describe('/tamponner', () => {
  test('sans position : invitation et bouton, accessible', async ({ page, context }, info) => {
    await context.clearPermissions();
    await mockApi(page);
    await page.goto('/tamponner');
    await expect(page.getByRole('button', { name: 'Activer la position' })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations).toEqual([]);
    if (process.env['CAPTURE'])
      await page.screenshot({
        path: info.outputPath('tamponner-fidelite-26-sans-position-390.png'),
      });
  });

  test.describe('avec position', () => {
    test.use({ geolocation: aMetres(420) });
    test('liste mise en forme, accessible', async ({ page }, info) => {
      await mockApi(page);
      await page.goto('/tamponner');
      await expect(page.getByRole('link', { name: /N°00\d.*À tamponner/ }).first()).toBeVisible();
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      expect(violations).toEqual([]);
      if (process.env['CAPTURE'])
        await page.screenshot({ path: info.outputPath('tamponner-fidelite-26-liste-390.png') });
    });
  });
});
