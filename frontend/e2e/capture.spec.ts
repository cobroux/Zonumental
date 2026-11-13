import { expect, test } from '@playwright/test';
import { aMetres, cameraPrete, mockApi } from './api';

test.describe('à 100 m de A', () => {
  test.use({ geolocation: aMetres(100) });

  test('R1-50 : Explorer, choix de A, photo, tampon, fiche avec histoire, carnet 1 sur N', async ({
    page,
  }) => {
    const api = await mockApi(page);
    await page.goto('/explorer');
    await expect(page.getByRole('heading', { name: 'Explorer' })).toBeVisible();

    await page.getByRole('link', { name: /^Tamponner/ }).click();
    await page.getByRole('radio', { name: /Tour A/ }).check();
    await page.getByRole('link', { name: 'Voir la fiche de Tour A' }).click();
    await page.getByRole('button', { name: 'Aller le tamponner' }).click();

    await cameraPrete(page);
    await page.getByRole('button', { name: 'Prendre la photo' }).click();

    await expect(page.getByRole('dialog', { name: /Ton premier tampon/ })).toContainText('Tour A');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: 'Tour A' })).toBeVisible();
    await expect(page.getByText('Histoire de la Tour A.')).toBeVisible();
    expect(api.envois).toEqual([1]);

    await page.goto('/carnet');
    await expect(page.locator('zn-bandeau')).toContainText('1 tampon');
    await expect(page.locator('a.tampon')).toHaveCount(1);
    await expect(page.locator('a.vide')).toHaveCount(1);
  });

  test('R1-51 : A et D proposés sans présélection, seule la capture de D est créée', async ({
    page,
  }) => {
    const api = await mockApi(page);
    await page.goto('/tamponner');
    const radios = page.getByRole('radio');
    await expect(radios).toHaveCount(2);
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);

    await page.getByRole('radio', { name: /Arc D/ }).check();
    await page.getByRole('link', { name: 'Voir la fiche de Arc D' }).click();
    await page.getByRole('button', { name: 'Aller le tamponner' }).click();
    await cameraPrete(page);
    await page.getByRole('button', { name: 'Prendre la photo' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();

    expect(api.envois).toEqual([4]);
    expect([...api.captures]).toEqual([4]);
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
    await page.getByRole('button', { name: 'Prendre la photo' }).click();

    await expect(page.getByText('Tu es à 420 m, rapproche-toi !')).toBeVisible();
    expect(api.captures.size).toBe(0);
    await page.goto('/carnet');
    await expect(page.locator('zn-bandeau')).toContainText('0 tampon');
  });
});
