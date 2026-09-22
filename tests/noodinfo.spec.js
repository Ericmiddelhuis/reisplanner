// Noodinfo: gedeeld tekstveld met een waarschuwing om zelf de gegevens te controleren.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

test('tekst opslaan en de veiligheidsmelding is zichtbaar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await nepSupabase(page);
  await page.goto('/#/meer/noodinfo');
  await expect(page.getByRole('heading', { level: 1, name: 'Noodinfo' })).toBeVisible();
  await expect(page.getByText(/Vul deze gegevens zelf in en controleer ze/)).toBeVisible();
  await page.locator('#ni-tekst').fill('Ambassade NL Windhoek: 06 123 456 78');
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => REIS.noodinfo).toBe('Ambassade NL Windhoek: 06 123 456 78');
});
