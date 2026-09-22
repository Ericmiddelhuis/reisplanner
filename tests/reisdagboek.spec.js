// Reisdagboek: per dag een los tekstveld, apart van de planningsnotitie bij Dagen.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

test('per dag een eigen dagboektekst opslaan', async ({ page }) => {
  const dagen = [
    { id: 'd1', trip_id: REIS.id, dagnummer: 1, datum: '2027-07-10', titel: 'Aankomst Windhoek' },
    { id: 'd2', trip_id: REIS.id, dagnummer: 2, datum: '2027-07-11' },
  ];
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page, { days: dagen });
  await page.goto('/#/meer/reisdagboek');
  await expect(page.getByRole('heading', { level: 1, name: 'Reisdagboek' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Dag 1.*Aankomst Windhoek/ })).toBeVisible();

  await page.locator('#db-d1').fill('Lange vlucht, maar de auto stond klaar.');
  await page.locator('#db-d1').blur();
  await expect.poll(() => db.days.find((x) => x.id === 'd1').dagboek).toBe('Lange vlucht, maar de auto stond klaar.');
  // Dag 2 blijft leeg: elke dag heeft een eigen, onafhankelijk veld
  expect(db.days.find((x) => x.id === 'd2').dagboek).toBeUndefined();
});

test('rooktest telefoon', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nepSupabase(page, { days: [{ id: 'd1', trip_id: REIS.id, dagnummer: 1, datum: '2027-07-10' }] });
  await page.goto('/#/meer/reisdagboek');
  await expect(page.getByRole('heading', { level: 1, name: 'Reisdagboek' })).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
