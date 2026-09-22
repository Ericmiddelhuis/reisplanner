// Route: kaart, etappes uit overnachtingen, correctiefactor, waarschuwingen, plaatsen zoeken.
// OpenRouteService en Nominatim worden nagebootst; kaarttegels worden geblokkeerd.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';
import { decodeer } from '../js/ors.js';

const WINDHOEK = { id: 'p1', trip_id: REIS.id, naam: 'Windhoek', land: 'NA', type: 'stad', lat: -22.5609, lng: 17.0658 };
const SESRIEM = { id: 'p2', trip_id: REIS.id, naam: 'Sesriem', land: 'NA', type: 'camping', lat: -24.4867, lng: 15.7997 };
const dagen = [1, 2, 3].map((n) => ({ id: 'd' + n, trip_id: REIS.id, dagnummer: n, datum: `2027-07-${9 + n}`, titel: null,
  overnachting_place_id: n === 1 ? 'p1' : n === 2 ? 'p2' : 'p2' }));

async function metRoute(page, begin) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page, begin);
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort());
  await page.route('https://api.openrouteservice.org/**', (r) => r.fulfill({ json: { routes: [{
    summary: { distance: 324511.2, duration: 30399.2 }, geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }] } }));
  await page.route('https://nominatim.openstreetmap.org/**', (r) => r.fulfill({ json: [
    { display_name: 'Sesriem, Hardap, Namibië', name: 'Sesriem', lat: '-24.4871', lon: '15.7985', address: { country_code: 'na' } }] }));
  await page.goto('/#/route');
  await expect(page.getByRole('heading', { level: 1, name: 'Route' })).toBeVisible();
  return db;
}

test('routelijn wordt goed gedecodeerd', () => {
  expect(decodeer('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
});

test('kaart toont een pin per plaats met locatie', async ({ page }) => {
  await metRoute(page, { places: [WINDHOEK, SESRIEM, { ...SESRIEM, id: 'p3', naam: 'Zonder locatie', lat: null, lng: null }] });
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('.pin')).toHaveCount(2);
  await expect(page.locator('#plaatsen').getByText('Zonder locatie').first()).toBeVisible();
});

test('etappes maken uit overnachtingen berekent afstand, rijtijd en waarschuwt', async ({ page }) => {
  const db = await metRoute(page, { places: [WINDHOEK, SESRIEM], days: dagen });
  await page.getByRole('button', { name: 'Etappes maken uit overnachtingen' }).click();
  await expect.poll(() => db.legs[0]?.geometrie).toBeTruthy();
  expect(db.legs).toHaveLength(1);                       // dag 3 blijft in Sesriem: geen tweede etappe
  expect(db.legs[0]).toMatchObject({ van_place_id: 'p1', naar_place_id: 'p2', day_id: 'd2', afstand_km: 324.5, rijtijd_min: 507 });
  await expect(page.locator('#etappes')).toContainText('Windhoek → Sesriem');
  await expect(page.locator('#etappes')).toContainText('324.5 km');
  // 8u27 rijden > 4 uur maximum
  await expect(page.getByRole('alert')).toContainText('Dag 2');
  await expect(page.getByRole('alert')).toContainText('maximum van 4 uur');
});

test('waarschuwt voor rijden na zonsondergang bij een hele lange dag', async ({ page }) => {
  await metRoute(page, { places: [WINDHOEK, SESRIEM], days: dagen, legs: [{ id: 'l1', trip_id: REIS.id,
    van_place_id: 'p1', naar_place_id: 'p2', day_id: 'd2', wegtype: 'asfalt', correctiefactor: 1, afstand_km: 800, rijtijd_min: 620 }] });
  await expect(page.getByRole('alert')).toContainText('zonsondergang');
});

test('wegtype grind zet correctiefactor en verlengt de rijtijd', async ({ page }) => {
  const db = await metRoute(page, { places: [WINDHOEK, SESRIEM], days: dagen, legs: [{ id: 'l1', trip_id: REIS.id,
    van_place_id: 'p1', naar_place_id: 'p2', day_id: 'd2', wegtype: 'asfalt', correctiefactor: 1, afstand_km: 324.5,
    rijtijd_min: 300, geometrie: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', grensovergang: false }] });
  await expect(page.getByRole('alert')).toContainText('Dag 2');       // 5 u > 4 u
  REIS.max_rijuren_per_dag = 4;
  await page.locator('#etappes').getByText('Windhoek → Sesriem').click();
  const dlg = page.getByRole('dialog', { name: 'Etappe bewerken' });
  await dlg.getByLabel('Wegtype').selectOption('grind');
  await expect(dlg.getByLabel('Correctiefactor rijtijd')).toHaveValue('1.3');
  await dlg.getByLabel('Grensovergang').check();
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.legs[0].wegtype).toBe('grind');
  expect(db.legs[0]).toMatchObject({ correctiefactor: 1.3, grensovergang: true });
  await expect(page.locator('#etappes')).toContainText('rijtijd ± 6 u 30 min');
  await expect(page.locator('#etappes').getByText('Grensovergang')).toBeVisible();
});

test('geen waarschuwing als de rijdag binnen het maximum blijft', async ({ page }) => {
  await metRoute(page, { places: [WINDHOEK, SESRIEM], days: dagen, legs: [{ id: 'l1', trip_id: REIS.id,
    van_place_id: 'p1', naar_place_id: 'p2', day_id: 'd2', wegtype: 'asfalt', correctiefactor: 1, afstand_km: 100, rijtijd_min: 120 }] });
  await expect(page.locator('#etappes')).toContainText('rijtijd ± 2 u 00 min');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('plaats zoeken via OpenStreetMap vult de coördinaten in', async ({ page }) => {
  const db = await metRoute(page, {});
  await page.locator('#plaatsen').getByRole('button', { name: '+ Plaats' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe plaats' });
  await dlg.getByLabel('Zoeken (OpenStreetMap)').fill('Sesriem');
  await dlg.getByRole('button', { name: 'Zoeken', exact: true }).click();
  await dlg.getByRole('button', { name: /Sesriem, Hardap/ }).click();
  await expect(dlg.getByLabel('Naam')).toHaveValue('Sesriem');
  await expect(dlg.getByLabel('Land')).toHaveValue('NA');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.places.length).toBe(1);
  expect(db.places[0]).toMatchObject({ naam: 'Sesriem', land: 'NA', lat: -24.4871, lng: 15.7985 });
  await expect(page.locator('.pin')).toHaveCount(1);
});

test('plaats op de kaart kiezen vult de coördinaten voor', async ({ page }) => {
  await metRoute(page, {});
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.getByRole('button', { name: 'Plaats op kaart kiezen' }).click();
  await page.locator('#kaart').click({ position: { x: 200, y: 200 } });
  const dlg = page.getByRole('dialog', { name: 'Nieuwe plaats' });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByLabel('Breedtegraad (lat)')).not.toHaveValue('');
  await expect(dlg.getByLabel('Lengtegraad (lng)')).not.toHaveValue('');
});

test('rooktest telefoon: route past op het scherm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nepSupabase(page, { places: [WINDHOEK, SESRIEM] });
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto('/#/route');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
