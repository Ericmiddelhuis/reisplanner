// Boekingen: vluchten, auto, verblijf, activiteiten en parken, met status, kosten en filter.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

async function opBoekingen(page, begin = {}) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page, begin);
  await page.goto('/#/meer/boekingen');
  await expect(page.getByRole('heading', { level: 1, name: 'Boekingen' })).toBeVisible();
  return db;
}

test('boeking toevoegen met alle velden', async ({ page }) => {
  const dagen = [{ id: 'd1', trip_id: REIS.id, dagnummer: 5, datum: '2027-07-14' }];
  const db = await opBoekingen(page, { days: dagen });
  await page.getByRole('button', { name: '+ Boeking toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe boeking' });
  await dlg.getByLabel('Type').selectOption('vlucht');
  await dlg.getByLabel('Titel').fill('KLM Amsterdam - Windhoek');
  await dlg.getByLabel('Status').selectOption('geboekt');
  await dlg.getByLabel('Gekoppelde dag (optioneel)').selectOption('d1');
  await dlg.getByLabel('Kosten (EUR)').fill('850');
  await dlg.getByLabel('Bevestigingsnummer (optioneel)').fill('ABC123');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.bookings.length).toBe(1);
  expect(db.bookings[0]).toMatchObject({ type: 'vlucht', titel: 'KLM Amsterdam - Windhoek', status: 'geboekt',
    day_id: 'd1', kosten: 850, bevestigingsnr: 'ABC123' });
  const regel = page.locator('li', { hasText: 'KLM Amsterdam' });
  await expect(regel).toContainText('Vlucht');
  await expect(regel).toContainText('Dag 5');
  await expect(regel).toContainText('€ 850,00');
  await expect(regel.locator('.badge')).toHaveText('geboekt');
});

test('een automatisch aangemaakte overnachtingsboeking kan hier worden aangevuld', async ({ page }) => {
  const db = await opBoekingen(page, { bookings: [{ id: 'b1', trip_id: REIS.id, type: 'verblijf',
    titel: 'Overnachting Sesriem Camping', status: 'nog boeken', day_id: null }] });
  await page.getByRole('button', { name: 'Overnachting Sesriem Camping' }).click();
  const dlg = page.getByRole('dialog', { name: 'Boeking bewerken' });
  await dlg.getByLabel('Kosten (EUR)').fill('45');
  await dlg.getByLabel('Status').selectOption('betaald');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.bookings[0]).toMatchObject({ kosten: 45, status: 'betaald' });
});

test('filter op status', async ({ page }) => {
  const bookings = [
    { id: 'b1', trip_id: REIS.id, type: 'vlucht', titel: 'Vlucht heen', status: 'geboekt' },
    { id: 'b2', trip_id: REIS.id, type: 'auto', titel: 'Huurauto', status: 'idee' },
  ];
  await opBoekingen(page, { bookings });
  await expect(page.getByRole('button', { name: 'Vlucht heen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Huurauto' })).toBeVisible();
  await page.getByRole('button', { name: 'Geboekt', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Vlucht heen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Huurauto' })).toHaveCount(0);
});

test('boeking verwijderen', async ({ page }) => {
  const db = await opBoekingen(page, { bookings: [{ id: 'b1', trip_id: REIS.id, type: 'park', titel: 'Etosha park fee', status: 'idee' }] });
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Etosha park fee' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verwijderen' }).click();
  await expect(page.getByText('Nog geen boekingen.')).toBeVisible();
  expect(db.bookings).toHaveLength(0);
});

test('rooktest telefoon: Boekingen past op het scherm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nepSupabase(page, { bookings: [{ id: 'b1', trip_id: REIS.id, type: 'vlucht', titel: 'Vlucht', status: 'idee' }] });
  await page.goto('/#/meer/boekingen');
  await expect(page.getByRole('heading', { level: 1, name: 'Boekingen' })).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
