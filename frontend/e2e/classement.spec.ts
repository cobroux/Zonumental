import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockApi } from './api';

test.use({ viewport: { width: 390, height: 844 } });

const ligne = (
  rang: number | null,
  pseudo: string,
  score: number,
  tendance: number | null,
  moi = false,
) => ({
  rang,
  pseudo,
  score,
  tendance,
  moi,
});

// Captures : CAPTURE=1 PORT=4311 npx playwright test classement
test('Défis : classement actif (Paris), France « Bientôt », accessible', async ({ page }, info) => {
  await mockApi(page);
  await page.route('**/api/classement/villes/75056/lancement', (r) =>
    r.fulfill({
      json: {
        ville: { codeInsee: '75056', nom: 'Paris' },
        seuil: 50,
        explorateurs: 50,
        ouvert: true,
        consentementClassement: true,
        moi: { tampons: 9 },
      },
    }),
  );
  await page.route('**/api/classement?**', (r) =>
    r.fulfill({
      json: {
        portee: 'VILLE',
        ville: { codeInsee: '75056', nom: 'Paris' },
        semaineDebutLe: '2026-11-15T23:00:00Z',
        ouvert: true,
        podium: [
          ligne(1, 'lea_voyage', 18, 0),
          ligne(2, 'tom_pierres', 16, 1),
          ligne(3, 'camille_b', 15, -1),
        ],
        autourDeMoi: [
          ligne(11, 'hugo_l', 9, 2),
          ligne(12, 'enzo', 9, 4, true),
          ligne(13, 'ines_p', 8, -3),
        ],
      },
    }),
  );
  await page.goto('/defis');
  await expect(page.getByText('@lea_voyage')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Paris', selected: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Amis' })).toBeDisabled();
  await page.getByText('Toi', { exact: true }).scrollIntoViewIfNeeded();
  let { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(violations).toEqual([]);
  if (process.env['CAPTURE'])
    await page.screenshot({ path: info.outputPath('defis-defis-2-390.png'), fullPage: true });
  await page.getByRole('tab', { name: 'France' }).click();
  await expect(page.getByText('France : bientôt disponible')).toBeVisible();
  ({ violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze());
  expect(violations).toEqual([]);
});
