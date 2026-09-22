// Rooktests: de app laadt en de navigatie werkt op telefoon- en laptopbreedte.
// Supabase wordt nagebootst, zodat de tests geen echte login of data nodig hebben.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

async function metNepSessie(page) {
  await nepSupabase(page);   // reset REIS naar de standaardwaarden, dus pas daarna aanpassen
  REIS.startdatum = '2099-01-10';
  REIS.notitie = 'Hallo Ilse';
}

test('zonder sessie zie je het inlogscherm', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Reisplanner/ })).toBeVisible();
  await expect(page.getByLabel('E-mailadres')).toBeVisible();
});

test('overzicht toont reisnaam en countdown', async ({ page }) => {
  await metNepSessie(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Testreis' })).toBeVisible();
  await expect(page.locator('#countdown')).toHaveText(/^\d+$/);
  await expect(page.locator('#notitie-tekst')).toHaveText('Hallo Ilse');
});

const schermen = ['Overzicht', 'Dagen', 'Route', 'Budget', 'To-do', 'Meer'];

for (const [naam, breedte, hoogte] of [['telefoon', 390, 844], ['laptop', 1280, 800]]) {
  test(`navigatie werkt op ${naam}`, async ({ page }) => {
    await page.setViewportSize({ width: breedte, height: hoogte });
    await metNepSessie(page);
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Hoofdmenu' });
    await expect(nav.getByRole('link')).toHaveCount(6);
    for (const s of schermen) {
      await nav.getByRole('link', { name: s }).click();
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(nav.getByRole('link', { name: s })).toHaveAttribute('aria-current', 'page');
      if (s !== 'Overzicht') await expect(page.getByRole('heading', { level: 1, name: s })).toBeVisible();
    }
    // Onderbalk op telefoon, zijbalk op laptop
    const box = await nav.boundingBox();
    if (naam === 'telefoon') expect(box.y).toBeGreaterThan(hoogte / 2);
    else expect(box.x).toBe(0), expect(box.width).toBeLessThan(300);
  });
}
