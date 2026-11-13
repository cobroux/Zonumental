import { expect, test } from '@playwright/test';
import { mockApi } from './api';

test.use({ viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false });

for (const route of ['/explorer', '/carnet']) {
  test(`colonne centrée de 430 px max, nav incluse : ${route}`, async ({ page }, info) => {
    await mockApi(page);
    await page.goto(route);
    const nav = page.locator('zn-navigation');
    await expect(nav).toBeVisible();
    for (const el of [page.locator('main'), nav]) {
      const b = (await el.boundingBox())!;
      expect(b.width).toBeLessThanOrEqual(430);
      expect(b.x + b.width / 2).toBeCloseTo(720, 0);
    }
    const debord = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(debord).toBe(false);
    await page.screenshot({ path: info.outputPath(`bureau-1440${route.replace('/', '-')}.png`) });
  });
}
