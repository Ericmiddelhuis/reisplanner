// Offline: eerder opgehaalde data (dagen, boekingen, noodinfo) blijft zichtbaar zonder netwerk.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

test('dagen blijven zichtbaar zonder netwerk, met een offline-melding', async ({ page }) => {
  const dagen = [{ id: 'd1', trip_id: REIS.id, dagnummer: 1, datum: '2027-07-10', titel: 'Aankomst Windhoek' }];
  await page.setViewportSize({ width: 1280, height: 900 });
  await nepSupabase(page, { days: dagen });
  await page.goto('/#/dagen');
  await expect(page.getByRole('heading', { level: 1, name: 'Dagen' })).toBeVisible();
  await expect(page.getByText('Aankomst Windhoek')).toBeVisible();
  await expect(page.locator('.offline-balk')).toBeHidden();

  // Vanaf nu doet het "netwerk" alsof de dagen-tabel niet bereikbaar is
  await page.route('**/rest/v1/days**', (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Dagen' })).toBeVisible();
  // De app wacht eerst een tijdslimiet af voordat hij de cache gebruikt (zie db.js: metTijdslimiet)
  await expect(page.getByText('Aankomst Windhoek')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.offline-balk')).toBeVisible();
  await expect(page.locator('.offline-balk')).toContainText('Offline');
});

test('een echte serverfout wordt getoond, niet verborgen achter verouderde cache', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await nepSupabase(page);
  await page.addInitScript(([tripId]) => {
    localStorage.setItem(`reisplanner:${tripId}:days`,
      JSON.stringify({ data: [{ id: 'oud', dagnummer: 1 }], bijgewerkt: '2020-01-01T00:00:00.000Z' }));
  }, [REIS.id]);
  await page.route('**/rest/v1/days**', (route) => route.fulfill({ status: 403, json: { message: 'geen toegang meer' } }));
  await page.goto('/#/dagen');
  await expect(page.getByText(/Laden mislukt/)).toBeVisible();
  await expect(page.locator('.offline-balk')).toBeHidden();
});

test('opnieuw online: de melding verdwijnt zodra het weer lukt', async ({ page }) => {
  const dagen = [{ id: 'd1', trip_id: REIS.id, dagnummer: 1, datum: '2027-07-10', titel: 'Aankomst' }];
  await page.setViewportSize({ width: 1280, height: 900 });
  await nepSupabase(page, { days: dagen });
  await page.goto('/#/dagen');
  await expect(page.getByText('Aankomst')).toBeVisible();

  let uitgevallen = true;
  await page.route('**/rest/v1/days**', (route) => uitgevallen ? route.abort() : route.fallback());
  await page.reload();
  await expect(page.locator('.offline-balk')).toBeVisible({ timeout: 10000 });

  uitgevallen = false;
  await page.reload();
  await expect(page.getByText('Aankomst')).toBeVisible();
  await expect(page.locator('.offline-balk')).toBeHidden();
});
