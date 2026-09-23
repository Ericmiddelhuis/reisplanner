// Overzicht: countdown en de gedeelde notities (een lijstje losse notities, elk met datumstempel).
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

async function opOverzicht(page, begin = {}) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page, begin);
  await page.goto('/#/overzicht');
  await expect(page.getByRole('heading', { level: 1, name: 'Testreis' })).toBeVisible();
  return db;
}

test('nieuwe notitie toevoegen, met datumstempel, en bestaande blijft staan', async ({ page }) => {
  const db = await opOverzicht(page, { notities: [{ id: 'n1', trip_id: REIS.id, tekst: 'Auto ophalen om 10:00',
    created_at: '2027-01-01T09:00:00Z' }] });
  await expect(page.getByText('Auto ophalen om 10:00')).toBeVisible();

  await page.getByRole('button', { name: '+ Notitie toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe notitie' });
  await dlg.getByLabel('Notitie').fill('Denk aan de malariapillen');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();

  // Beide notities staan er nog, allebei met een datumstempel
  await expect(page.getByText('Auto ophalen om 10:00')).toBeVisible();
  const nieuweRegel = page.locator('li', { hasText: 'Denk aan de malariapillen' });
  await expect(nieuweRegel).toBeVisible();
  await expect(nieuweRegel.locator('.gedempt')).not.toHaveText('');
  await expect.poll(() => db.notities.length).toBe(2);
});

test('bewerken past alleen die ene notitie aan, de andere blijft ongewijzigd', async ({ page }) => {
  const notities = [
    { id: 'n1', trip_id: REIS.id, tekst: 'Eerste notitie', created_at: '2027-01-01T09:00:00Z' },
    { id: 'n2', trip_id: REIS.id, tekst: 'Tweede notitie', created_at: '2027-01-02T09:00:00Z' },
  ];
  const db = await opOverzicht(page, { notities });
  await page.getByRole('button', { name: /Eerste notitie/ }).click();
  const dlg = page.getByRole('dialog', { name: 'Notitie bewerken' });
  await expect(dlg.getByLabel('Notitie')).toHaveValue('Eerste notitie');
  await dlg.getByLabel('Notitie').fill('Eerste notitie, aangepast');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();

  await expect(page.getByText('Eerste notitie, aangepast')).toBeVisible();
  await expect(page.getByText('Tweede notitie')).toBeVisible();
  expect(db.notities.find((n) => n.id === 'n1').tekst).toBe('Eerste notitie, aangepast');
  expect(db.notities.find((n) => n.id === 'n2').tekst).toBe('Tweede notitie');
});

test('notitie verwijderen', async ({ page }) => {
  const db = await opOverzicht(page, { notities: [{ id: 'n1', trip_id: REIS.id, tekst: 'Weg ermee',
    created_at: '2027-01-01T09:00:00Z' }] });
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /Weg ermee/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verwijderen' }).click();
  await expect(page.getByText('Nog geen notities.')).toBeVisible();
  expect(db.notities).toHaveLength(0);
});

test('lege notitie kan niet worden opgeslagen', async ({ page }) => {
  await opOverzicht(page);
  await page.getByRole('button', { name: '+ Notitie toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe notitie' });
  await dlg.getByLabel('Notitie').fill('   ');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect(dlg.getByRole('alert')).toHaveText('Vul een notitie in.');
});
