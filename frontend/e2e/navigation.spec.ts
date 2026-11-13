import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { aMetres, mockApi } from './api';

const ETATS = [
  { etat: 'zone', pos: aMetres(100), texte: 'Tamponner' },
  { etat: 'proche', pos: aMetres(415), /* D est le plus proche */ texte: '380 m' },
  { etat: 'loin', pos: { latitude: 45, longitude: 5, accuracy: 10 }, texte: '> 2 km' },
];

for (const { etat, pos, texte } of ETATS) {
  test.describe(`bouton central ${etat}`, () => {
    test.use({ geolocation: pos });
    test(`libellé « ${texte} » visible, cible ≥ 44 px, sans backdrop-filter`, async ({ page }) => {
      await mockApi(page);
      await page.goto('/explorer');
      const bouton = page.locator('zn-navigation a.tamponner');
      await expect(bouton).toHaveAttribute('data-etat', etat);
      await expect(bouton).toContainText(texte);
      const rond = (await bouton.locator('.rond').boundingBox())!;
      expect(rond.width).toBe(64);
      expect(rond.height).toBe(64);
      const filtre = await page
        .locator('zn-navigation nav')
        .evaluate((n) => getComputedStyle(n).backdropFilter);
      expect(filtre).toBe('none');
      const axe = await new AxeBuilder({ page }).include('zn-navigation').analyze();
      expect(axe.violations).toEqual([]);
    });
  });
}

test.describe('déjà tamponné ici (RG-056)', () => {
  test.use({ geolocation: aMetres(420) });
  test('libellé sur une seule ligne', async ({ page }) => {
    const api = await mockApi(page);
    api.captures.add(1);
    api.captures.add(4);
    await page.goto('/explorer');
    const libelle = page.locator('zn-navigation .libelle');
    await expect(libelle).toHaveText('Déjà tamponné');
    expect((await libelle.boundingBox())!.height).toBeLessThan(18);
  });
});

test('Carte et Défis mènent à l’écran « Bientôt » avec l’onglet actif', async ({ page }) => {
  await mockApi(page);
  await page.goto('/explorer');
  const nav = page.locator('zn-navigation');
  await expect(nav.locator('li')).toHaveCount(5);
  for (const nom of ['Carte', 'Défis']) {
    await nav.getByRole('link', { name: nom }).click();
    await expect(page.getByRole('heading', { level: 1, name: nom })).toBeVisible();
    await expect(nav.locator('a[aria-current="page"]')).toHaveText(nom);
  }
});
