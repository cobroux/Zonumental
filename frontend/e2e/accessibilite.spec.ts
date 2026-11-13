import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { aMetres, cameraPrete, mockApi } from './api';

test.use({ geolocation: aMetres(100) });

const violations = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze())
    .violations;

test('Explorer', async ({ page }) => {
  await mockApi(page);
  await page.goto('/explorer');
  await expect(page.locator('ol')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('Carnet', async ({ page }) => {
  await mockApi(page);
  await page.goto('/carnet');
  await expect(page.getByText('0 sur 4')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('fiche non capturée', async ({ page }) => {
  await mockApi(page);
  await page.goto('/monument/1');
  await expect(page.getByText('Histoire verrouillée')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('fiche capturée', async ({ page }) => {
  const api = await mockApi(page);
  api.captures.add(1);
  await page.goto('/monument/1');
  await expect(page.getByText('Histoire de la Tour A.')).toBeVisible();
  await expect(page.getByAltText('Ta photo')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('caméra', async ({ page }) => {
  await mockApi(page);
  await page.goto('/monument/1/capturer');
  await expect(page.getByRole('button', { name: 'Prendre la photo' })).toBeEnabled();
  expect(await violations(page)).toEqual([]);
});

test('caméra refusée', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException('', 'NotAllowedError'));
  });
  await page.goto('/monument/1/capturer');
  await expect(page.getByText(/a besoin de la caméra/)).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('refus de capture', async ({ page }) => {
  const api = await mockApi(page);
  api.refuser = 1;
  await page.goto('/monument/1/capturer');
  await cameraPrete(page);
  await page.getByRole('button', { name: 'Prendre la photo' }).click();
  await expect(page.getByText('Signal trop faible')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('Design system : tampons, planche, bandeau, médailles', async ({ page }) => {
  await mockApi(page);
  await page.goto('/design-system');
  await expect(page.locator('zn-planche svg[role="img"]')).toHaveCount(4);
  expect(await violations(page)).toEqual([]);
});
