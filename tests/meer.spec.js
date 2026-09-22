// Meer: het menu zelf, en de verplaatste onderdelen reisinstellingen/leden/back-up.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

test('menu toont alle onderdelen als echte links', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await nepSupabase(page);
  await page.goto('/#/meer');
  await expect(page.getByRole('heading', { level: 1, name: 'Meer' })).toBeVisible();
  for (const naam of ['Reisinstellingen', 'Boekingen', 'Paklijst', 'Links', 'Documenten', 'Gezondheid',
    'Reisdagboek', 'Noodinfo', 'Leden', 'Back-up']) {
    await expect(page.getByRole('link', { name: naam })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Boekingen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Boekingen' })).toBeVisible();
  await page.getByRole('link', { name: '← Meer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Meer' })).toBeVisible();
});

test('reisinstellingen zijn nog steeds bruikbaar (regressie na herschrijven van het scherm)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await nepSupabase(page);
  await page.goto('/#/meer/instellingen');
  await expect(page.getByRole('heading', { level: 1, name: 'Reisinstellingen' })).toBeVisible();
  await page.getByLabel('Naam').fill('Andere naam');
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => REIS.naam).toBe('Andere naam');
});

test('leden uitnodigen (regressie)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page);
  await page.goto('/#/meer/leden');
  await page.getByLabel('E-mailadres om uit te nodigen').fill('ilse@example.com');
  await page.getByRole('button', { name: 'Uitnodigen' }).click();
  await expect(page.getByText('ilse@example.com')).toBeVisible();
  expect(db.trip_members).toHaveLength(1);
  expect(db.trip_members[0]).toMatchObject({ email: 'ilse@example.com', rol: 'lid' });
});

test('rooktest telefoon: menu past op het scherm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nepSupabase(page);
  await page.goto('/#/meer');
  await expect(page.getByRole('heading', { level: 1, name: 'Meer' })).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
