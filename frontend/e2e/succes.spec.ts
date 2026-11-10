import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { aMetres, cameraPrete, mockApi } from './api';

test.use({ geolocation: aMetres(100) });

const violations = async (page: Page, sauf: string[] = []) =>
  (
    await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(sauf)
      .analyze()
  ).violations;

/** Deux tampons (Lyon) : capturer A franchit le seuil « Trois tampons ». */
const auSeuil = async (page: Page) => {
  const api = await mockApi(page);
  api.captures.add(2).add(3);
  return api;
};

test('R2-64 : le succès franchi apparaît à la célébration puis au profil', async ({ page }) => {
  await auSeuil(page);
  await page.goto('/monument/1/capturer');
  await cameraPrete(page);
  await page.getByRole('button', { name: 'Prendre la photo' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  const celebration = page.locator('[data-succes]');
  await expect(celebration).toContainText('Succès · Trois tampons');
  expect(await violations(page)).toEqual([]);
  await celebration.getByRole('button', { name: 'Terminer' }).click();
  await expect(celebration).toHaveCount(0);

  await page.goto('/profil');
  await expect(page.getByRole('heading', { name: 'Explorateur' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: /^Trois tampons$/ })).toBeVisible();
  await expect(page.getByText('3 sur 4').first()).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('R2-64 : la collection du carnet montre la progression mise à jour', async ({ page }) => {
  await auSeuil(page);
  await page.goto('/carnet');
  const bouton = page.getByRole('button', { name: /Grands sites/ });
  await expect(bouton).toContainText('2 / 4');

  await page.goto('/monument/1/capturer');
  await cameraPrete(page);
  await page.getByRole('button', { name: 'Prendre la photo' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await page.goto('/carnet');
  await expect(bouton).toContainText('3 / 4');
  await bouton.click();
  await expect(bouton).toHaveAttribute('aria-expanded', 'true');
  // Défaut connu hors périmètre (code applicatif) : l'aria-label des tampons du carnet ne reprend pas le texte visible.
  expect(await violations(page)).toEqual([]);

  await page.locator('#col-GRANDS_SITES').getByRole('link').first().click();
  await expect(page).toHaveURL(/\/monument\/\d+$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
