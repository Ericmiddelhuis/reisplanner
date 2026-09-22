// Links: nuttige URL's bij Meer, optioneel gekoppeld aan dag, plaats of taak.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

async function opMeer(page, begin = {}) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page, begin);
  await page.goto('/#/meer');
  await expect(page.getByRole('heading', { level: 2, name: 'Links' })).toBeVisible();
  return db;
}

test('link toevoegen zonder https:// ervoor krijgt dat automatisch', async ({ page }) => {
  const db = await opMeer(page);
  await page.getByRole('button', { name: '+ Link toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe link' });
  await dlg.getByLabel('URL').fill('www.nwr.com.na');
  await dlg.getByLabel('Titel (optioneel)').fill('Namibia Wildlife Resorts');
  await dlg.getByLabel('Categorie (optioneel)').fill('Boekingen');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.links.length).toBe(1);
  expect(db.links[0]).toMatchObject({ url: 'https://www.nwr.com.na', titel: 'Namibia Wildlife Resorts', categorie: 'Boekingen' });
  const link = page.getByRole('link', { name: 'Namibia Wildlife Resorts' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', 'https://www.nwr.com.na');
  await expect(link).toHaveAttribute('target', '_blank');
});

test('zonder titel wordt de url getoond', async ({ page }) => {
  const db = await opMeer(page);
  await page.getByRole('button', { name: '+ Link toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe link' });
  await dlg.getByLabel('URL').fill('https://etoshanationalpark.org');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect(page.getByRole('link', { name: 'https://etoshanationalpark.org' })).toBeVisible();
});

test('link koppelen aan een dag, plaats en taak', async ({ page }) => {
  const dagen = [{ id: 'd1', trip_id: REIS.id, dagnummer: 3, datum: '2027-07-12' }];
  const plaatsen = [{ id: 'p1', trip_id: REIS.id, naam: 'Sesriem' }];
  const taken = [{ id: 't1', trip_id: REIS.id, titel: 'Visum regelen', klaar: false, created_at: 't1' }];
  const db = await opMeer(page, { days: dagen, places: plaatsen, tasks: taken });
  await page.getByRole('button', { name: '+ Link toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe link' });
  await dlg.getByLabel('URL').fill('https://sesriem.example');
  await dlg.getByLabel('Koppel aan dag').selectOption('d1');
  await dlg.getByLabel('Koppel aan plaats').selectOption('p1');
  await dlg.getByLabel('Koppel aan taak').selectOption('t1');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.links[0]).toMatchObject({ day_id: 'd1', place_id: 'p1', task_id: 't1' });
  const regel = page.locator('.link-regel', { hasText: 'sesriem.example' });
  await expect(regel).toContainText('Dag 3');
  await expect(regel).toContainText('Sesriem');
  await expect(regel).toContainText('Visum regelen');
});

test('link bewerken en verwijderen', async ({ page }) => {
  const db = await opMeer(page, { links: [{ id: 'l1', trip_id: REIS.id, url: 'https://oud.example', titel: 'Oude titel' }] });
  await expect(page.getByRole('link', { name: 'Oude titel' })).toBeVisible();
  await page.getByRole('button', { name: 'Bewerken' }).click();
  const dlg = page.getByRole('dialog', { name: 'Link bewerken' });
  await dlg.getByLabel('Titel (optioneel)').fill('Nieuwe titel');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.links[0].titel).toBe('Nieuwe titel');
  await expect(page.getByRole('link', { name: 'Nieuwe titel' })).toBeVisible();

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Bewerken' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verwijderen' }).click();
  await expect(page.getByText('Nog geen links.')).toBeVisible();
  expect(db.links).toHaveLength(0);
});

test('URL van alleen spaties geeft een foutmelding (required vangt een echt lege URL al af)', async ({ page }) => {
  const db = await opMeer(page);
  await page.getByRole('button', { name: '+ Link toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe link' });
  await dlg.getByLabel('URL').fill('   ');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect(dlg.getByRole('alert')).toHaveText('Vul een URL in.');
  expect(db.links).toHaveLength(0);
});

test('rooktest telefoon: Meer met links past op het scherm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nepSupabase(page, { links: [{ id: 'l1', trip_id: REIS.id, url: 'https://voorbeeld.example', titel: 'Een lange titel om op te testen of het scherm breekt' }] });
  await page.goto('/#/meer');
  await expect(page.getByRole('heading', { level: 2, name: 'Links' })).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
