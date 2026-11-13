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

const capturerA = async (page: Page) => {
  await page.goto('/monument/1/capturer');
  await cameraPrete(page);
  await page.getByRole('button', { name: 'Prendre la photo' }).click();
};

test('fidelite-4 : la célébration est une feuille modale, fermable au clavier', async ({
  page,
}) => {
  await auSeuil(page);
  await capturerA(page);

  const feuille = page.getByRole('dialog', { name: 'Tampon posé' });
  await expect(feuille).toBeVisible();
  await expect(feuille.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(feuille.getByRole('listitem')).toContainText(['Trois tampons']);
  expect(await violations(page)).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(feuille).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Tour A' })).toBeFocused();

  await page.goto('/profil');
  await expect(page.getByRole('heading', { name: 'Explorateur' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Succès obtenu : Trois tampons' })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('fidelite-4 : « Continuer » ferme la feuille et laisse la fiche', async ({ page }) => {
  await auSeuil(page);
  await capturerA(page);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/monument\/1$/);
});

test('fidelite-4 : Collections depuis le carnet, progression mise à jour, détail et fiche', async ({
  page,
}) => {
  await auSeuil(page);
  await page.goto('/carnet');
  await page.getByRole('link', { name: /^Collections/ }).click();
  await expect(page).toHaveURL(/\/carnet\/collections$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Collections' })).toBeFocused();
  const carte = page.getByRole('link', { name: /Grands sites/ });
  await expect(carte).toContainText('2 / 4');
  expect(await violations(page)).toEqual([]);

  await capturerA(page);
  await page.getByRole('button', { name: 'Continuer' }).click();

  await page.goto('/carnet/collections');
  await expect(carte).toContainText('3 / 4');
  await carte.click();
  await expect(page).toHaveURL(/\/carnet\/collections\/GRANDS_SITES$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Grands sites' })).toBeFocused();
  await expect(page.locator('ul.grille a')).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'N°004, à découvrir' })).toBeVisible();
  expect(await violations(page)).toEqual([]);

  await page.locator('ul.grille a').first().click();
  await expect(page).toHaveURL(/\/monument\/\d+$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('fidelite-4 : collection inconnue', async ({ page }) => {
  await auSeuil(page);
  await page.goto('/carnet/collections/INCONNUE');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('n’existe pas');
  await page.getByRole('link', { name: 'Retour aux collections' }).click();
  await expect(page).toHaveURL(/\/carnet\/collections$/);
});
