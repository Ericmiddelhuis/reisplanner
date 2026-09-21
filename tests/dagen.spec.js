// Dagplanning: genereren, toevoegen/verwijderen, plaatsen, overnachting, activiteiten.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

test.beforeEach(() => { REIS.startdatum = '2027-07-10'; REIS.einddatum = null; });

async function opDagen(page, breedte = 1280) {
  await page.setViewportSize({ width: breedte, height: 900 });
  const db = await nepSupabase(page);
  await page.goto('/#/dagen');
  await expect(page.getByRole('heading', { level: 1, name: 'Dagen' })).toBeVisible();
  return db;
}

test('28 dagen worden automatisch aangemaakt met datums', async ({ page }) => {
  const db = await opDagen(page);
  await expect(page.getByRole('button', { name: /^Week \d$/ })).toHaveCount(4);
  await expect(page.locator('.dag')).toHaveCount(7);
  expect(db.days).toHaveLength(28);
  expect(db.days[0].datum).toBe('2027-07-10');
  expect(db.days[27].datum).toBe('2027-08-06');
  expect(REIS.einddatum).toBe('2027-08-06');
  await page.getByRole('button', { name: 'Week 4' }).click();
  await expect(page.locator('.dag').first()).toContainText('22');
});

test('dag toevoegen en verwijderen', async ({ page }) => {
  const db = await opDagen(page);
  await page.getByRole('button', { name: '+ Dag toevoegen aan het einde' }).click();
  await expect(page.getByRole('heading', { name: /^Dag 29/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Week \d$/ })).toHaveCount(5);
  expect(db.days).toHaveLength(29);

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Deze dag verwijderen' }).click();
  await expect(page.getByRole('button', { name: /^Week \d$/ })).toHaveCount(4);
  expect(db.days).toHaveLength(28);

  // Een dag halverwege verwijderen laat de rest opschuiven
  await page.locator('.dag').nth(1).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Deze dag verwijderen' }).click();
  // Wachten tot ook het opschuiven van de latere dagen klaar is
  await expect.poll(() => db.days.map((x) => x.dagnummer)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
  expect(db.days[26].datum).toBe('2027-08-05');
});

test('titel, plaats, overnachting en boekingsstatus', async ({ page }) => {
  const db = await opDagen(page);
  await page.getByLabel('Titel').fill('Windhoek → Sossusvlei');
  await page.getByLabel('Titel').blur();
  await expect.poll(() => db.days[0].titel).toBe('Windhoek → Sossusvlei');

  await page.getByLabel('Overnachting', { exact: true }).selectOption('__nieuw__');
  const dlg = page.getByRole('dialog', { name: 'Nieuwe plaats' });
  await dlg.getByLabel('Naam').fill('Sesriem Camping');
  await dlg.getByLabel('Land').selectOption('NA');
  await dlg.getByLabel('Soort plaats').selectOption('camping');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.places.length).toBe(1);
  await expect(page.getByLabel('Overnachting', { exact: true })).toHaveValue(db.places[0].id);
  await expect.poll(() => db.days[0].overnachting_place_id).toBe(db.places[0].id);

  await page.getByLabel('Boekingsstatus overnachting').selectOption('geboekt');
  await expect.poll(() => db.bookings.length).toBe(1);
  expect(db.bookings[0]).toMatchObject({ type: 'verblijf', status: 'geboekt', titel: 'Overnachting Sesriem Camping' });
  await expect(page.locator('.dag').first()).toContainText('Sesriem Camping');
  await expect(page.locator('.dag').first().locator('.badge')).toHaveText('geboekt');

  await page.getByLabel('Boekingsstatus overnachting').selectOption('');
  await expect.poll(() => db.bookings.length).toBe(0);
});

test('activiteit per dagdeel toevoegen, bewerken en verwijderen', async ({ page }) => {
  const db = await opDagen(page);
  const middag = page.locator('.kaart', { has: page.getByRole('heading', { name: 'Middag' }) });
  await middag.getByRole('button', { name: '+ Activiteit' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe activiteit' });
  await dlg.getByLabel('Titel').fill('Dune 45');
  await dlg.getByLabel('Kosten (EUR)').fill('25');
  await dlg.getByLabel('Minimumleeftijd kind (jaar)').fill('6');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect(middag.getByText('Dune 45')).toBeVisible();
  await expect(middag.getByText('Vanaf 6 jaar')).toBeVisible();
  expect(db.activities[0]).toMatchObject({ titel: 'Dune 45', dagdeel: 'middag', kosten: 25, minimumleeftijd_kind: 6 });

  await middag.getByText('Dune 45').click();
  const bew = page.getByRole('dialog', { name: 'Activiteit bewerken' });
  await bew.getByLabel('Titel').fill('Dune 45 bij zonsopgang');
  await bew.getByLabel('Dagdeel').selectOption('ochtend');
  await bew.getByRole('button', { name: 'Opslaan' }).click();
  const ochtend = page.locator('.kaart', { has: page.getByRole('heading', { name: 'Ochtend' }) });
  await expect(ochtend.getByText('Dune 45 bij zonsopgang')).toBeVisible();

  page.once('dialog', (d) => d.accept());
  await ochtend.getByText('Dune 45 bij zonsopgang').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verwijderen' }).click();
  await expect(page.getByText('Dune 45 bij zonsopgang')).toHaveCount(0);
  expect(db.activities).toHaveLength(0);
});

test('telefoon: lijst, dan detail met terugknop', async ({ page }) => {
  await opDagen(page, 390);
  await expect(page.locator('#dagdetail')).toBeHidden();
  await page.locator('.dag').nth(2).click();
  await expect(page.getByRole('heading', { name: /^Dag 3/ })).toBeVisible();
  await expect(page.locator('#daglijstkolom')).toBeHidden();
  await page.getByRole('button', { name: '← Alle dagen' }).click();
  await expect(page.locator('.dag')).toHaveCount(7);
});

test('laptop: lijst en details staan naast elkaar', async ({ page }) => {
  await opDagen(page, 1280);
  const lijst = await page.locator('#daglijstkolom').boundingBox();
  const detail = await page.locator('#dagdetail').boundingBox();
  expect(detail.x).toBeGreaterThan(lijst.x + lijst.width - 1);
  await expect(page.getByRole('heading', { name: /^Dag 1/ })).toBeVisible();
});
