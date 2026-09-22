// Paklijst: items met groep en voor wie, afvinken en filteren.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

async function opPaklijst(page, begin = {}) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page, begin);
  await page.goto('/#/meer/paklijst');
  await expect(page.getByRole('heading', { level: 1, name: 'Paklijst' })).toBeVisible();
  return db;
}

test('standaardfilter toont alleen nog in te pakken items', async ({ page }) => {
  const items = [
    { id: 'i1', trip_id: REIS.id, titel: 'Zonnebrand', ingepakt: false },
    { id: 'i2', trip_id: REIS.id, titel: 'Malariapillen', ingepakt: true },
  ];
  await opPaklijst(page, { packing_items: items });
  await expect(page.getByRole('button', { name: 'Zonnebrand' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Malariapillen' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ingepakt', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Malariapillen' })).toBeVisible();
});

test('item toevoegen met groep en voor wie', async ({ page }) => {
  const db = await opPaklijst(page);
  await page.getByRole('button', { name: '+ Item toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuw item' });
  await dlg.getByLabel('Titel').fill('Warme trui');
  await dlg.getByLabel('Groep (optioneel)').fill('Kleding');
  await dlg.getByLabel('Voor wie').selectOption('Kind');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.packing_items.length).toBe(1);
  expect(db.packing_items[0]).toMatchObject({ titel: 'Warme trui', groep: 'Kleding', voor_wie: 'Kind', ingepakt: false });
  const regel = page.locator('li', { hasText: 'Warme trui' });
  await expect(regel).toContainText('Kleding');
  await expect(regel).toContainText('Kind');
});

test('item afvinken via het selectievakje', async ({ page }) => {
  const db = await opPaklijst(page, { packing_items: [{ id: 'i1', trip_id: REIS.id, titel: 'Slaapzak', ingepakt: false }] });
  await page.getByLabel('Slaapzak als ingepakt markeren').check();
  await expect.poll(() => db.packing_items[0].ingepakt).toBe(true);
  await expect(page.getByText('Slaapzak')).toHaveCount(0);   // filter "Nog inpakken" toont hem niet meer
});

test('item bewerken en verwijderen', async ({ page }) => {
  const db = await opPaklijst(page, { packing_items: [{ id: 'i1', trip_id: REIS.id, titel: 'Verrekijker', ingepakt: false }] });
  await page.getByRole('button', { name: 'Verrekijker' }).click();
  const dlg = page.getByRole('dialog', { name: 'Item bewerken' });
  await dlg.getByLabel('Groep (optioneel)').fill('Elektronica');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.packing_items[0].groep).toBe('Elektronica');

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Verrekijker' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verwijderen' }).click();
  await expect(page.getByText('Verrekijker')).toHaveCount(0);
  expect(db.packing_items).toHaveLength(0);
});

test('rooktest telefoon: Paklijst past op het scherm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nepSupabase(page, { packing_items: [{ id: 'i1', trip_id: REIS.id, titel: 'Muskietennet', ingepakt: false }] });
  await page.goto('/#/meer/paklijst');
  await expect(page.getByRole('heading', { level: 1, name: 'Paklijst' })).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
