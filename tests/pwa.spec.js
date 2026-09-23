// PWA: manifest, iconen en thema-kleur staan klaar zodat de app op het beginscherm gezet kan worden.
// De service worker zelf wordt niet in Chromium-onder-Playwright geregistreerd (zie app.js:
// navigator.webdriver-check, nodig om interferentie met de nagemaakte netwerkverzoeken te voorkomen),
// dus dat deel hoort bij de handmatige eindtest op een echte telefoon (zie docs/tests.md).
import { test, expect } from '@playwright/test';
import { nepSupabase } from './nepdb.js';

test('manifest, iconen en thema-kleur staan in de pagina', async ({ page, request, baseURL }) => {
  await nepSupabase(page);
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'manifest.json');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#3F5A3A');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

  const manifest = await (await request.get(baseURL + '/manifest.json')).json();
  expect(manifest.name).toContain('Reisplanner');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  for (const icoon of manifest.icons) {
    const res = await request.get(baseURL + '/' + icoon.src);
    expect(res.ok(), `${icoon.src} moet bestaan`).toBeTruthy();
  }
});

test('sw.js bestaat en cachet nooit de reisdata- of kaart-API\'s', async ({ request, baseURL }) => {
  const res = await request.get(baseURL + '/sw.js');
  expect(res.ok()).toBeTruthy();
  const tekst = await res.text();
  for (const host of ['supabase.co', 'openrouteservice.org', 'nominatim.openstreetmap.org', 'tile.openstreetmap.org']) {
    expect(tekst).toContain(host);
  }
});

test('service worker registreert in een echte (niet-webdriver) browser', async ({ page }) => {
  // navigator.webdriver overschrijven vóórdat de pagina-scripts draaien, zodat app.js denkt dat dit
  // een gewone bezoeker is en de registratie dus probeert (net als op de telefoons van Eric en Ilse).
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await nepSupabase(page);
  await page.goto('/');
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())),
    { timeout: 10000 }).toBe(true);
});
