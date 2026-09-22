// Documenten: type, vervaldatum, status en notitie. Nooit een documentnummer. Badge bij (bijna) verlopen.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

async function opDocumenten(page, begin = {}) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page, begin);
  await page.goto('/#/meer/documenten');
  await expect(page.getByRole('heading', { level: 1, name: 'Documenten' })).toBeVisible();
  return db;
}

const vandaagPlusDagen = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

test('document toevoegen; geen veld voor een documentnummer', async ({ page }) => {
  const db = await opDocumenten(page);
  await page.getByRole('button', { name: '+ Document toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuw document' });
  await expect(dlg.getByLabel(/nummer/i)).toHaveCount(0);
  await dlg.getByLabel('Persoon').selectOption('Ilse');
  await dlg.getByLabel('Type').selectOption('paspoort');
  await dlg.getByLabel('Vervaldatum (optioneel)').fill(vandaagPlusDagen(3000));
  await dlg.getByLabel('Status (optioneel)').fill('in bezit');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.documents.length).toBe(1);
  expect(db.documents[0]).toMatchObject({ persoon: 'Ilse', type: 'paspoort', status: 'in bezit' });
  await expect(page.locator('li', { hasText: 'Ilse' })).toContainText('Paspoort');
});

test('verlopen paspoort krijgt een badge', async ({ page }) => {
  await opDocumenten(page, { documents: [{ id: 'd1', trip_id: REIS.id, persoon: 'Eric', type: 'paspoort',
    vervaldatum: '2020-01-01' }] });
  await expect(page.locator('li', { hasText: 'Eric' }).getByText('Verlopen')).toBeVisible();
});

test('paspoort dat over 3 maanden verloopt waarschuwt (Namibië eist 6 maanden geldigheid)', async ({ page }) => {
  await opDocumenten(page, { documents: [{ id: 'd1', trip_id: REIS.id, persoon: 'Kind', type: 'paspoort',
    vervaldatum: vandaagPlusDagen(90) }] });
  await expect(page.locator('li', { hasText: 'Kind' }).getByText('Verloopt binnenkort')).toBeVisible();
});

test('paspoort dat nog jaren geldig is krijgt geen badge', async ({ page }) => {
  await opDocumenten(page, { documents: [{ id: 'd1', trip_id: REIS.id, persoon: 'Eric', type: 'paspoort',
    vervaldatum: vandaagPlusDagen(2000) }] });
  const regel = page.locator('li', { hasText: 'Eric' });
  await expect(regel.getByText('Verlopen')).toHaveCount(0);
  await expect(regel.getByText('Verloopt binnenkort')).toHaveCount(0);
});

test('document bewerken en verwijderen', async ({ page }) => {
  const db = await opDocumenten(page, { documents: [{ id: 'd1', trip_id: REIS.id, persoon: 'Eric', type: 'rijbewijs' }] });
  await page.getByRole('button', { name: /Eric/ }).click();
  const dlg = page.getByRole('dialog', { name: 'Document bewerken' });
  await dlg.getByLabel('Notitie (optioneel)').fill('Internationaal rijbewijs meenemen');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.documents[0].notitie).toBe('Internationaal rijbewijs meenemen');

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /Eric/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verwijderen' }).click();
  await expect(page.getByText('Nog geen documenten.')).toBeVisible();
  expect(db.documents).toHaveLength(0);
});
