import { expect, test } from '@playwright/test';
import { aMetres, cameraPrete, mockApi } from './api';

test.describe('à 100 m de A', () => {
  test.use({ geolocation: aMetres(100) });

  test('R1-50 : Tamponner ouvre la caméra du plus proche (D), photo, tampon, fiche, carnet 1 sur N', async ({
    page,
  }) => {
    const api = await mockApi(page);
    await page.goto('/explorer');
    await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible();

    await page.getByRole('link', { name: /^Tamponner/ }).click();
    await expect(page).toHaveURL(/\/monument\/4\/capturer$/);

    await cameraPrete(page);
    await page.getByRole('button', { name: 'Prendre la photo' }).click();

    await expect(page.getByRole('dialog', { name: /Ton premier tampon/ })).toContainText('Arc D');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: 'Arc D' })).toBeVisible();
    await expect(page.getByText('Histoire de la Tour A.')).toBeVisible();
    expect(api.envois).toEqual([4]);
    expect([...api.captures]).toEqual([4]);

    await page.goto('/carnet');
    await expect(page.locator('zn-bandeau')).toContainText('1 tampon');
    await expect(page.locator('a.tampon')).toHaveCount(1);
    await expect(page.locator('a.vide')).toHaveCount(1);
  });

  test('R1-52 : la photo prise pour A ne suit pas vers D', async ({ page }) => {
    const api = await mockApi(page);
    api.refuser = 1;
    await page.goto('/monument/1');
    await page.getByRole('button', { name: 'Aller le tamponner' }).click();
    await cameraPrete(page);
    await page.getByRole('button', { name: 'Prendre la photo' }).click();
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible();

    await page.goBack();
    await page.goto('/monument/4/capturer');
    await cameraPrete(page);
    await expect(page.getByRole('button', { name: 'Prendre la photo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Réessayer' })).toHaveCount(0);
    expect(api.envois).toEqual([1]);
  });
});

test.describe('à 420 m de A', () => {
  // 415 m réels : la distance affichée est arrondie à la dizaine supérieure (RG-046), soit 420 m.
  test.use({ geolocation: aMetres(415) });

  test('R1-20 : trop loin, aucune capture', async ({ page }) => {
    const api = await mockApi(page);
    await page.goto('/monument/1/capturer');
    await cameraPrete(page);
    const declencheur = page.getByRole('button', { name: /Déclencheur verrouillé/ });
    await expect(declencheur).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByText(/420 m au \S+ · \d+ min/)).toBeVisible();
    await expect(page.getByText(/encore 270 m/)).toBeVisible();
    await declencheur.click({ force: true });
    expect(api.captures.size).toBe(0);
    await page.goto('/carnet');
    await expect(page.locator('zn-bandeau')).toContainText('0 tampon');
  });

  test('proche : Tamponner ouvre la fiche du plus proche, pas la caméra', async ({ page }) => {
    await mockApi(page);
    await page.goto('/explorer');
    await page.getByRole('link', { name: /^Tamponner/ }).click();
    await expect(page).toHaveURL(/\/monument\/4$/);
    await expect(page.getByRole('heading', { name: 'Arc D' })).toBeVisible();
  });
});

test.describe('loin de tout', () => {
  test.use({ geolocation: { latitude: 45.7, longitude: 4.8, accuracy: 10 } });

  test('Tamponner ouvre la fiche du monument le plus proche, même à plus de 2 km', async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto('/explorer');
    await page.getByRole('link', { name: /^Tamponner/ }).click();
    await expect(page).toHaveURL(/\/monument\/[23]$/);
  });
});
