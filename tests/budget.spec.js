// Budget: totaalbudget, budgetbalk, begroting per categorie (handmatig/afgeleid), valutaschakelaar, uitgaven.
import { test, expect } from '@playwright/test';
import { nepSupabase, REIS } from './nepdb.js';

test.beforeEach(() => {
  REIS.totaalbudget = null;
  REIS.koersen = { EUR: 1, NAD: 0.05, BWP: 0.07 };
});

async function opBudget(page, begin = {}) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const db = await nepSupabase(page, begin);
  await page.goto('/#/budget');
  await expect(page.getByRole('heading', { level: 1, name: 'Budget' })).toBeVisible();
  return db;
}

test('zonder budget of uitgaven: geen balk, wel een melding', async ({ page }) => {
  await opBudget(page);
  await expect(page.getByText('Nog geen totaalbudget of uitgaven ingevoerd.')).toBeVisible();
  await expect(page.locator('.budgetbalk')).toHaveCount(0);
});

test('uitgave toevoegen telt mee in de balk en de categorie', async ({ page }) => {
  const db = await opBudget(page);
  await page.getByRole('button', { name: '+ Uitgave toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe uitgave' });
  await dlg.getByLabel('Omschrijving (optioneel)').fill('Vluchten KLM');
  await dlg.getByLabel('Bedrag').fill('1200');
  await dlg.getByLabel('Categorie').selectOption('Vluchten');
  await dlg.getByLabel('Status').selectOption('gepland');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.expenses.length).toBe(1);
  expect(db.expenses[0]).toMatchObject({ omschrijving: 'Vluchten KLM', bedrag: 1200, valuta: 'EUR', bedrag_eur: 1200, categorie: 'Vluchten' });

  await expect(page.getByText('Gepland: € 1.200,00')).toBeVisible();
  const vluchten = page.locator('.kaart', { has: page.getByRole('heading', { name: 'Vluchten' }) });
  await expect(vluchten.getByText('Afgeleid uit geplande en betaalde uitgaven: € 1.200,00')).toBeVisible();
  await expect(vluchten.getByText('Betaald € 0,00 van € 1.200,00')).toBeVisible();
});

test('betaalde uitgave in vreemde valuta wordt in EUR meegeteld', async ({ page }) => {
  const db = await opBudget(page);
  await page.getByRole('button', { name: '+ Uitgave toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe uitgave' });
  await dlg.getByLabel('Bedrag').fill('2000');
  await dlg.getByLabel('Valuta').selectOption('NAD');
  await dlg.getByLabel('Categorie').selectOption('Eten & boodschappen');
  await dlg.getByLabel('Status').selectOption('betaald');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  // 2000 NAD * 0.05 = 100 EUR
  await expect.poll(() => db.expenses[0]?.bedrag_eur).toBe(100);
  await expect(page.getByText('Betaald: € 100,00')).toBeVisible();
});

test('categorie handmatig begroten en weer terug naar afgeleid', async ({ page }) => {
  const db = await opBudget(page, { expenses: [{ id: 'e1', trip_id: REIS.id, omschrijving: 'Diner', bedrag: 50,
    valuta: 'EUR', bedrag_eur: 50, categorie: 'Eten & boodschappen', status: 'gepland', created_at: 't1' }] });
  const kaart = page.locator('.kaart', { has: page.getByRole('heading', { name: 'Eten & boodschappen' }) });
  await expect(kaart.getByText('Afgeleid uit geplande en betaalde uitgaven: € 50,00')).toBeVisible();

  await kaart.getByLabel('Handmatig begroot bedrag').check();
  await expect.poll(() => db.budgetten.find((b) => b.categorie === 'Eten & boodschappen')?.bedrag).toBe(50);
  await kaart.getByLabel('Begroot bedrag (EUR)').fill('300');
  await kaart.getByLabel('Begroot bedrag (EUR)').blur();
  await expect.poll(() => db.budgetten.find((b) => b.categorie === 'Eten & boodschappen')?.bedrag).toBe(300);
  await expect(kaart.getByText('Betaald € 0,00 van € 300,00')).toBeVisible();

  await kaart.getByLabel('Handmatig begroot bedrag').uncheck();
  await expect.poll(() => db.budgetten.find((b) => b.categorie === 'Eten & boodschappen')?.bedrag).toBe(null);
  await expect(kaart.getByText('Afgeleid uit geplande en betaalde uitgaven: € 50,00')).toBeVisible();
});

test('valutaschakelaar toont bedragen omgerekend', async ({ page }) => {
  await opBudget(page, { expenses: [{ id: 'e1', trip_id: REIS.id, bedrag: 100, valuta: 'EUR', bedrag_eur: 100,
    categorie: 'Buffer', status: 'betaald', created_at: 't1' }] });
  await expect(page.getByText('Betaald: € 100,00')).toBeVisible();
  await page.getByRole('button', { name: 'NAD', exact: true }).click();
  // 100 EUR / 0.05 = 2000 NAD
  await expect(page.getByText(/Betaald: NAD\s*2\.000,00/)).toBeVisible();
});

test('wisselkoers aanpassen verandert de omrekening', async ({ page }) => {
  const db = await opBudget(page, { expenses: [{ id: 'e1', trip_id: REIS.id, bedrag: 100, valuta: 'EUR', bedrag_eur: 100,
    categorie: 'Buffer', status: 'betaald', created_at: 't1' }] });
  await page.getByLabel('1 NAD = … EUR').fill('0.1');
  await page.getByRole('button', { name: 'Koersen opslaan' }).click();
  await expect.poll(() => db.trips?.koersen ?? REIS.koersen).toMatchObject({ NAD: 0.1 });
  await page.getByRole('button', { name: 'NAD', exact: true }).click();
  // 100 EUR / 0.1 = 1000 NAD
  await expect(page.getByText(/Betaald: NAD\s*1\.000,00/)).toBeVisible();
});

test('totaalbudget instellen toont een vrij-bedrag en waarschuwt bij overschrijding', async ({ page }) => {
  await opBudget(page, { expenses: [{ id: 'e1', trip_id: REIS.id, bedrag: 900, valuta: 'EUR', bedrag_eur: 900,
    categorie: 'Vluchten', status: 'betaald', created_at: 't1' }] });
  await page.getByLabel('Totaalbudget (EUR)').fill('1000');
  await page.getByLabel('Totaalbudget (EUR)').blur();
  await expect(page.getByText('Vrij: € 100,00')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByLabel('Totaalbudget (EUR)').fill('500');
  await page.getByLabel('Totaalbudget (EUR)').blur();
  await expect(page.getByRole('alert')).toContainText('€ 400,00 over het totaalbudget');
});

test('geen letterlijke "null" op het scherm als er geen waarschuwing is', async ({ page }) => {
  await opBudget(page, { expenses: [{ id: 'e1', trip_id: REIS.id, bedrag: 100, valuta: 'EUR', bedrag_eur: 100,
    categorie: 'Buffer', status: 'betaald', created_at: 't1' }] });
  await page.getByLabel('Totaalbudget (EUR)').fill('1000');
  await page.getByLabel('Totaalbudget (EUR)').blur();
  await expect(page.getByText('Vrij: € 900,00')).toBeVisible();
  await expect(page.locator('.kaart').filter({ hasText: 'Overzicht' }).getByText('null', { exact: true })).toHaveCount(0);
});

test('activiteit met kosten en categorie uit Dagen telt mee bij Budget', async ({ page }) => {
  const dagen = [{ id: 'd1', trip_id: REIS.id, dagnummer: 1, datum: '2027-07-10' }];
  const activiteiten = [{ id: 'a1', trip_id: REIS.id, day_id: 'd1', titel: 'Dune 45', dagdeel: 'ochtend',
    kosten: 60, categorie: "Parkgelden & safari's" }];
  await opBudget(page, { days: dagen, activities: activiteiten });
  await expect(page.getByText('Gepland: € 60,00')).toBeVisible();
  const kaart = page.locator('.kaart', { has: page.getByRole('heading', { name: "Parkgelden & safari's" }) });
  await expect(kaart.getByText('Afgeleid uit geplande en betaalde uitgaven: € 60,00')).toBeVisible();
  await expect(kaart.getByText('Waarvan € 60,00 aan activiteiten uit Dagen.')).toBeVisible();
  // De activiteit zelf staat niet als losse regel bij Uitgaven (die blijft beheerd via Dagen)
  await expect(page.locator('#uitgaven')).not.toContainText('Dune 45');
});

test('brandstofkosten uit Route tellen mee bij Budget (categorie 4x4-huurauto & brandstof)', async ({ page }) => {
  const places = [{ id: 'p1', trip_id: REIS.id, naam: 'Windhoek' }, { id: 'p2', trip_id: REIS.id, naam: 'Sesriem' }];
  const legs = [{ id: 'l1', trip_id: REIS.id, van_place_id: 'p1', naar_place_id: 'p2', brandstofkosten: 45 }];
  await opBudget(page, { places, legs });
  await expect(page.getByText('Gepland: € 45,00')).toBeVisible();
  const kaart = page.locator('.kaart', { has: page.getByRole('heading', { name: '4x4-huurauto & brandstof' }) });
  await expect(kaart.getByText('Afgeleid uit geplande en betaalde uitgaven: € 45,00')).toBeVisible();
  await expect(kaart.getByText('Waarvan € 45,00 aan brandstof uit Route.')).toBeVisible();
  // Brandstofkosten horen niet bij een andere categorie
  const buffer = page.locator('.kaart', { has: page.getByRole('heading', { name: 'Buffer', exact: true }) });
  await expect(buffer.getByText('Afgeleid uit geplande en betaalde uitgaven: € 0,00')).toBeVisible();
});

test('geen "betaald door"-veld meer bij een uitgave', async ({ page }) => {
  await opBudget(page);
  await page.getByRole('button', { name: '+ Uitgave toevoegen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nieuwe uitgave' });
  await expect(dlg.getByLabel('Betaald door')).toHaveCount(0);
  await expect(dlg.getByText('Eric', { exact: true })).toHaveCount(0);
});

test('uitgave bewerken en verwijderen', async ({ page }) => {
  const db = await opBudget(page, { expenses: [{ id: 'e1', trip_id: REIS.id, omschrijving: 'Tent', bedrag: 80,
    valuta: 'EUR', bedrag_eur: 80, categorie: 'Buffer', status: 'gepland', created_at: 't1' }] });
  await page.getByText('Tent').click();
  const dlg = page.getByRole('dialog', { name: 'Uitgave bewerken' });
  await dlg.getByLabel('Status').selectOption('betaald');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect.poll(() => db.expenses[0].status).toBe('betaald');
  await expect(page.locator('.badge.betaald')).toBeVisible();

  page.once('dialog', (d) => d.accept());
  await page.getByText('Tent').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verwijderen' }).click();
  await expect(page.getByText('Tent')).toHaveCount(0);
  expect(db.expenses).toHaveLength(0);
});

test('rooktest telefoon: budget past op het scherm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nepSupabase(page, { expenses: [{ id: 'e1', trip_id: REIS.id, bedrag: 50, valuta: 'EUR', bedrag_eur: 50,
    categorie: 'Buffer', status: 'gepland', created_at: 't1' }] });
  await page.goto('/#/budget');
  await expect(page.getByRole('heading', { level: 1, name: 'Budget' })).toBeVisible();
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(breedte).toBeLessThanOrEqual(390);
});
