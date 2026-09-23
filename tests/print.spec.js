// Printversie: dagplanning, boekingen, gezondheid en noodinfo samengevat op één pagina.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

test('toont dagplanning, boekingen, gezondheid en noodinfo, met een printknop', async ({ page }) => {
  const dagen = [{ id: 'd1', trip_id: REIS.id, dagnummer: 1, datum: '2027-07-10', titel: 'Aankomst', notitie: 'Auto ophalen' }];
  const activiteiten = [{ id: 'a1', trip_id: REIS.id, day_id: 'd1', titel: 'Inchecken bij lodge', dagdeel: 'avond' }];
  const boekingen = [{ id: 'b1', trip_id: REIS.id, type: 'vlucht', titel: 'KLM heenvlucht', status: 'geboekt', kosten: 800 }];
  await page.setViewportSize({ width: 1280, height: 900 });
  await nepSupabase(page, { days: dagen, activities: activiteiten, bookings: boekingen });
  REIS.gezondheid = 'Milo: pinda-allergie.';   // ná nepSupabase(): die zet REIS terug naar de standaardwaarden
  REIS.noodinfo = 'Ambassade NL Windhoek: 06 123 456 78';
  await page.goto('/#/meer/print');
  await expect(page.getByRole('heading', { level: 1, name: 'Printversie' })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Dag 1 · za 10 jul · Aankomst' })).toBeVisible();
  await expect(page.getByText('Auto ophalen')).toBeVisible();
  await expect(page.getByText(/Inchecken bij lodge/)).toBeVisible();
  await expect(page.getByText(/KLM heenvlucht/)).toBeVisible();
  await expect(page.getByText('Milo: pinda-allergie.')).toBeVisible();
  await expect(page.getByText('Ambassade NL Windhoek: 06 123 456 78')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Printen' })).toBeVisible();
});

test('printknop roept window.print aan', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await nepSupabase(page);
  await page.addInitScript(() => { window.__geprint = false; window.print = () => { window.__geprint = true; }; });
  await page.goto('/#/meer/print');
  await page.getByRole('button', { name: 'Printen' }).click();
  expect(await page.evaluate(() => window.__geprint)).toBe(true);
});

test('rooktest telefoon: printversie past op het scherm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nepSupabase(page, { days: [{ id: 'd1', trip_id: REIS.id, dagnummer: 1, datum: '2027-07-10' }] });
  await page.goto('/#/meer/print');
  await expect(page.getByRole('heading', { level: 1, name: 'Printversie' })).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
