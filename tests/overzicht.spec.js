// Overzicht: countdown en de gedeelde notitie (opslaan leegt het veld; bewerken laadt de huidige tekst terug).
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

async function opOverzicht(page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page);
  await page.goto('/#/overzicht');
  await expect(page.getByRole('heading', { level: 1, name: 'Testreis' })).toBeVisible();
  return db;
}

test('nieuwe notitie opslaan leegt het veld en toont de tekst erboven', async ({ page }) => {
  await opOverzicht(page);
  await expect(page.getByText('Nog geen notitie.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bewerken' })).toBeHidden();

  await page.getByLabel('Nieuwe notitie').fill('Denk aan de malariapillen');
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect(page.getByText('Opgeslagen.')).toBeVisible();
  await expect(page.getByText('Denk aan de malariapillen')).toBeVisible();
  await expect(page.getByLabel('Nieuwe notitie')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Bewerken' })).toBeVisible();
});

test('bewerken laadt de huidige notitie in het veld; opslaan overschrijft en leegt weer', async ({ page }) => {
  const db = await opOverzicht(page);
  REIS.notitie = 'Auto ophalen om 10:00';
  await page.reload();
  await expect(page.getByText('Auto ophalen om 10:00')).toBeVisible();

  await page.getByRole('button', { name: 'Bewerken' }).click();
  await expect(page.getByLabel(/notitie/i).first()).toHaveValue('Auto ophalen om 10:00');
  await page.getByLabel(/notitie/i).first().fill('Auto ophalen om 11:00');
  await page.getByRole('button', { name: 'Opslaan' }).click();

  await expect(page.getByText('Auto ophalen om 11:00')).toBeVisible();
  await expect(page.getByLabel(/notitie/i).first()).toHaveValue('');
  await expect.poll(() => db.trips?.notitie ?? REIS.notitie).toBe('Auto ophalen om 11:00');
});

test('notitie leegmaken en opslaan verwijdert hem echt, ook na een nieuwe render', async ({ page }) => {
  const db = await opOverzicht(page);
  REIS.notitie = 'Oude notitie';
  await page.reload();
  await page.getByRole('button', { name: 'Bewerken' }).click();
  await page.getByLabel(/notitie/i).first().fill('');
  await page.getByRole('button', { name: 'Opslaan' }).click();

  await expect(page.getByText('Nog geen notitie.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bewerken' })).toBeHidden();
  expect(db.trips?.notitie ?? REIS.notitie).toBeNull();

  // Ook als het scherm opnieuw wordt getekend (bijv. na navigeren) blijft de lege notitie leeg,
  // en leunt niet meer op een verouderde lokale waarde.
  await page.goto('/#/dagen');
  await page.goto('/#/overzicht');
  await expect(page.getByText('Nog geen notitie.')).toBeVisible();
});
