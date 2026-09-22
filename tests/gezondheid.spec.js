// Gezondheid: gedeeld tekstveld op de reis zelf.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

test('tekst opslaan en na herladen nog aanwezig', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await nepSupabase(page);
  await page.goto('/#/meer/gezondheid');
  await expect(page.getByRole('heading', { level: 1, name: 'Gezondheid' })).toBeVisible();
  await page.locator('#gz-tekst').fill('Kind: pinda-allergie, EpiPen in de rugzak.');
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => REIS.gezondheid).toBe('Kind: pinda-allergie, EpiPen in de rugzak.');

  await page.reload();
  await expect(page.locator('#gz-tekst')).toHaveValue('Kind: pinda-allergie, EpiPen in de rugzak.');
});

test('rooktest telefoon', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nepSupabase(page);
  await page.goto('/#/meer/gezondheid');
  await expect(page.getByRole('heading', { level: 1, name: 'Gezondheid' })).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
