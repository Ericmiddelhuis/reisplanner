// Meer: reisinstellingen, leden en back-up.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

async function opMeer(page, begin = {}) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page, begin);
  await page.goto('/#/meer');
  await expect(page.getByRole('heading', { level: 1, name: 'Meer' })).toBeVisible();
  return db;
}

test('reisinstellingen zijn nog steeds bruikbaar (regressie na herschrijven van het scherm)', async ({ page }) => {
  await opMeer(page);
  await page.getByLabel('Naam').fill('Andere naam');
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => REIS.naam).toBe('Andere naam');
});

test('rooktest telefoon: Meer past op het scherm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nepSupabase(page);
  await page.goto('/#/meer');
  await expect(page.getByRole('heading', { level: 1, name: 'Meer' })).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
