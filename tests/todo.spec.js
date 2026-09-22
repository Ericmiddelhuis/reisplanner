// To-do: eigen tabblad (los van Meer) met filter, toevoegen/bewerken/verwijderen en afvinken.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

async function opTodo(page, begin = {}) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page, begin);
  await page.goto('/#/todo');
  await expect(page.getByRole('heading', { level: 1, name: 'To-do' })).toBeVisible();
  return db;
}

test('standaardfilter toont alleen open taken', async ({ page }) => {
  const taken = [
    { id: 't1', trip_id: REIS.id, titel: 'Visum regelen', klaar: false, created_at: 't1' },
    { id: 't2', trip_id: REIS.id, titel: 'Auto gehuurd', klaar: true, created_at: 't2' },
  ];
  await opTodo(page, { tasks: taken });
  await expect(page.getByRole('button', { name: 'Visum regelen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Auto gehuurd' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Klaar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Auto gehuurd' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Visum regelen' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Visum regelen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Auto gehuurd' })).toBeVisible();
});

test('taak toevoegen met deadline, toewijzing, categorie en dag', async ({ page }) => {
  const dagen = [{ id: 'd1', trip_id: REIS.id, dagnummer: 1, datum: '2027-07-10' }];
  const db = await opTodo(page, { days: dagen });
  await page.getByRole('button', { name: '+ Taak toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe taak' });
  await dlg.getByLabel('Titel').fill('Malariapreventie bespreken');
  await dlg.getByLabel('Deadline (optioneel)').fill('2027-06-01');
  await dlg.getByLabel('Toegewezen aan').selectOption('Ilse');
  await dlg.getByLabel('Categorie (optioneel)').fill('Gezondheid');
  await dlg.getByLabel('Gekoppelde dag (optioneel)').selectOption('d1');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.tasks.length).toBe(1);
  expect(db.tasks[0]).toMatchObject({ titel: 'Malariapreventie bespreken', deadline: '2027-06-01',
    toegewezen_aan: 'Ilse', categorie: 'Gezondheid', day_id: 'd1', klaar: false });
  const regel = page.locator('li', { hasText: 'Malariapreventie bespreken' });
  await expect(regel).toContainText('Ilse');
  await expect(regel).toContainText('Dag 1');
});

test('taak afvinken via het selectievakje, zonder de dialoog te openen', async ({ page }) => {
  const db = await opTodo(page, { tasks: [{ id: 't1', trip_id: REIS.id, titel: 'Paspoorten controleren', klaar: false, created_at: 't1' }] });
  await page.getByLabel('Paspoorten controleren als klaar markeren').check();
  await expect.poll(() => db.tasks[0].klaar).toBe(true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Met filter "Open" verdwijnt de taak nu uit de lijst
  await expect(page.getByText('Paspoorten controleren')).toHaveCount(0);
});

test('verlopen taak krijgt een badge, een taak zonder deadline niet', async ({ page }) => {
  await opTodo(page, { tasks: [
    { id: 't1', trip_id: REIS.id, titel: 'Te laat', deadline: '2020-01-01', klaar: false, created_at: 't1' },
    { id: 't2', trip_id: REIS.id, titel: 'Geen datum', klaar: false, created_at: 't2' },
  ] });
  const teLaat = page.locator('li', { hasText: 'Te laat' });
  const geenDatum = page.locator('li', { hasText: 'Geen datum' });
  await expect(teLaat.getByText('Verlopen')).toBeVisible();
  await expect(geenDatum.getByText('Verlopen')).toHaveCount(0);
});

test('taak bewerken en verwijderen', async ({ page }) => {
  const db = await opTodo(page, { tasks: [{ id: 't1', trip_id: REIS.id, titel: 'Grensvergunning', klaar: false, created_at: 't1' }] });
  await page.getByRole('button', { name: 'Grensvergunning' }).click();
  const dlg = page.getByRole('dialog', { name: 'Taak bewerken' });
  await dlg.getByLabel('Toegewezen aan').selectOption('Eric');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.tasks[0].toegewezen_aan).toBe('Eric');

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Grensvergunning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verwijderen' }).click();
  await expect(page.getByText('Grensvergunning')).toHaveCount(0);
  expect(db.tasks).toHaveLength(0);
});

test('rooktest telefoon: To-do past op het scherm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nepSupabase(page, { tasks: [{ id: 't1', trip_id: REIS.id, titel: 'Visum', klaar: false, created_at: 't1' }] });
  await page.goto('/#/todo');
  await expect(page.getByRole('heading', { level: 1, name: 'To-do' })).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
