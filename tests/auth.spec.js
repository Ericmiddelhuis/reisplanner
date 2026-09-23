// Inloggen met e-mail en wachtwoord, en het instellen/resetten van een wachtwoord via een mailtje.
import { test, expect } from '@playwright/test';
import { nepSupabase, REF } from './nepdb.js';

const AUTH = (pad) => `https://${REF}.supabase.co/auth/v1/${pad}`;

test('inlogscherm heeft e-mail + wachtwoord, en een aparte sectie om een wachtwoord in te stellen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Reisplanner/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inloggen' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nog geen wachtwoord, of vergeten?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stuur link' })).toBeVisible();
});

test('inloggen met een verkeerd wachtwoord toont een foutmelding', async ({ page }) => {
  await page.route(AUTH('token**'), (route) => route.fulfill({ status: 400,
    json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } }));
  await page.goto('/');
  await page.getByLabel('E-mailadres').first().fill('eric@example.com');
  await page.getByLabel('Wachtwoord', { exact: true }).fill('fout-wachtwoord');
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.getByText(/Invalid login credentials/)).toBeVisible();
});

test('een wachtwoordlink aanvragen toont een bevestiging', async ({ page }) => {
  let opgevraagdVoor = null;
  await page.route(AUTH('recover**'), (route) => {
    opgevraagdVoor = route.request().postDataJSON()?.email;
    return route.fulfill({ status: 200, json: {} });
  });
  await page.goto('/');
  await page.getByLabel('E-mailadres').nth(1).fill('ilse@example.com');
  await page.getByRole('button', { name: 'Stuur link' }).click();
  await expect(page.getByText(/Mail verstuurd/)).toBeVisible();
  expect(opgevraagdVoor).toBe('ilse@example.com');
});

test('nieuw wachtwoord instellen via de link, daarna gewoon door naar de reis', async ({ page }) => {
  await nepSupabase(page);   // geldige sessie + reisdata: net alsof je net op de link hebt geklikt
  await page.route(AUTH('user**'), (route) => route.fulfill({ status: 200, json: { id: '2', email: 'test@example.com' } }));
  await page.goto('/#access_token=x&type=recovery');
  await expect(page.getByRole('heading', { name: 'Nieuw wachtwoord' })).toBeVisible();

  await page.getByLabel('Nieuw wachtwoord (minstens 8 tekens)').fill('geheimwoord1');
  await page.getByLabel('Herhaal het wachtwoord').fill('anderwoord123');
  await page.getByRole('button', { name: 'Wachtwoord instellen' }).click();
  await expect(page.getByText('De wachtwoorden komen niet overeen.')).toBeVisible();

  await page.getByLabel('Herhaal het wachtwoord').fill('geheimwoord1');
  await page.getByRole('button', { name: 'Wachtwoord instellen' }).click();
  // Na het instellen wordt de app herladen; met de sessie uit nepSupabase() ga je gewoon door naar de reis
  await expect(page.getByRole('heading', { level: 1, name: 'Testreis' })).toBeVisible({ timeout: 10000 });
});

test('rooktest telefoon: inlogscherm past op het scherm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Reisplanner/ })).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
