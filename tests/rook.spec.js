// Rooktests: de app laadt en de navigatie werkt op telefoon- en laptopbreedte.
// Supabase wordt nagebootst, zodat de tests geen echte login of data nodig hebben.
import { test, expect } from '@playwright/test';

const REF = 'ewbhlxqgdgzrsbytuwtk';
const REIS = { id: '11111111-1111-1111-1111-111111111111', naam: 'Testreis', startdatum: '2099-01-10',
  notitie: 'Hallo Ilse', created_at: '2027-01-01T00:00:00Z' };

async function metNepSessie(page) {
  const sessie = { access_token: 'x', refresh_token: 'x', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '22222222-2222-2222-2222-222222222222', email: 'test@example.com', aud: 'authenticated' } };
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${REF}-auth-token`, JSON.stringify(sessie)]);
  await page.route(`https://${REF}.supabase.co/rest/v1/rpc/**`, (r) => r.fulfill({ status: 200, json: null }));
  await page.route(`https://${REF}.supabase.co/rest/v1/trips**`, (r) => r.fulfill({ json: [REIS] }));
  await page.route(`https://${REF}.supabase.co/rest/v1/trip_members**`, (r) => r.fulfill({ json: [] }));
  await page.routeWebSocket(/realtime/, () => {});  // Realtime negeren
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

const schermen = ['Overzicht', 'Dagen', 'Route', 'Budget', 'Meer'];

for (const [naam, breedte, hoogte] of [['telefoon', 390, 844], ['laptop', 1280, 800]]) {
  test(`navigatie werkt op ${naam}`, async ({ page }) => {
    await page.setViewportSize({ width: breedte, height: hoogte });
    await metNepSessie(page);
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Hoofdmenu' });
    await expect(nav.getByRole('link')).toHaveCount(5);
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
