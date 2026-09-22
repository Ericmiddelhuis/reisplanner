// Kleine in-memory nabootsing van Supabase (PostgREST) voor de end-to-end tests.
import { randomUUID } from 'node:crypto';

export const REF = 'ewbhlxqgdgzrsbytuwtk';
export const REIS = { id: '11111111-1111-1111-1111-111111111111', naam: 'Testreis', startdatum: '2027-07-10',
  einddatum: null, notitie: null, max_rijuren_per_dag: 4, totaalbudget: null,
  koersen: { EUR: 1, NAD: 0.05, BWP: 0.07 }, created_at: '2027-01-01T00:00:00Z' };

export async function nepSupabase(page, begin = {}) {
  const db = { days: [], places: [], activities: [], bookings: [], legs: [], expenses: [], budgetten: [], ...begin };
  const sessie = { access_token: 'x', refresh_token: 'x', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '22222222-2222-2222-2222-222222222222', email: 'test@example.com', aud: 'authenticated' } };
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${REF}-auth-token`, JSON.stringify(sessie)]);
  await page.routeWebSocket(/realtime/, () => {});

  await page.route(`https://${REF}.supabase.co/rest/v1/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const tabel = url.pathname.split('/').pop();
    const enkel = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    const uit = (rijen) => route.fulfill({ status: 200, json: enkel ? rijen[0] : rijen });

    if (tabel === 'claim_memberships') return route.fulfill({ status: 200, json: null });
    if (tabel === 'trip_members') return route.fulfill({ json: [] });
    if (tabel === 'trips') {
      if (req.method() === 'PATCH') { Object.assign(REIS, req.postDataJSON()); return route.fulfill({ status: 204 }); }
      return route.fulfill({ json: [REIS] });
    }
    const rijen = db[tabel];
    const filters = [...url.searchParams].filter(([, v]) => v.startsWith('eq.')).map(([k, v]) => [k, v.slice(3)]);
    const passend = (r) => filters.every(([k, v]) => k === 'trip_id' || String(r[k]) === v);

    if (req.method() === 'GET') {
      let res = rijen.filter(passend);
      const orde = url.searchParams.get('order')?.split('.')[0];
      if (orde) res = [...res].sort((a, b) => (a[orde] > b[orde] ? 1 : a[orde] < b[orde] ? -1 : 0));
      return uit(res);
    }
    if (req.method() === 'POST') {
      const body = [].concat(req.postDataJSON());
      const nieuw = [];
      for (const r of body) {
        if (tabel === 'days' && rijen.some((x) => x.dagnummer === r.dagnummer)) continue;  // ignoreDuplicates
        const rij = { id: randomUUID(), created_at: new Date().toISOString(), ...r };
        rijen.push(rij); nieuw.push(rij);
      }
      return uit(nieuw);
    }
    if (req.method() === 'PATCH') {
      rijen.filter(passend).forEach((r) => Object.assign(r, req.postDataJSON()));
      return route.fulfill({ status: 204 });
    }
    if (req.method() === 'DELETE') {
      const weg = new Set(rijen.filter(passend).map((r) => r.id));
      db[tabel] = rijen.filter((r) => !weg.has(r.id));
      if (tabel === 'days') db.activities = db.activities.filter((a) => !weg.has(a.day_id));
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ status: 200, json: [] });
  });
  return db;
}
