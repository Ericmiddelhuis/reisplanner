// Supabase-client en gedeelde opslag
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { toonOfflineBalk, verbergOfflineBalk } from './offline.js';
import { dagTijd } from './util.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------
// Offline: laatst opgehaalde data bewaren in localStorage, zodat dagplanning, boekingen en
// noodinfo ook zonder bereik te zien zijn (belangrijk onderweg in Namibië/Botswana).
// Bij een geslaagde ophaling wordt de cache bijgewerkt; bij een mislukte (geen netwerk) valt de
// app terug op de laatste cache, met een balkje erbij. Een echte API-fout (bijv. geen toegang meer)
// wordt nooit verborgen achter verouderde cache: alleen een netwerkfout leidt tot de terugval.
// ---------------------------------------------------------------
function leesCache(sleutel) {
  try { return JSON.parse(localStorage.getItem(sleutel)); } catch { return null; }
}
function schrijfCache(sleutel, data) {
  try { localStorage.setItem(sleutel, JSON.stringify({ data, bijgewerkt: new Date().toISOString() })); }
  catch { /* localStorage kan vol of uitgeschakeld zijn: dan geen offline-cache, verder geen probleem */ }
}
// Supabase-js probeert bij een netwerkfout intern een paar keer opnieuw (~7 seconden) voor het opgeeft.
// Dat is te traag voor onderweg: na deze tijdslimiet behandelen we het alvast als "geen netwerk".
// De oorspronkelijke aanvraag loopt op de achtergrond gewoon door; het resultaat ervan wordt dan genegeerd.
function metTijdslimiet(belofte, ms = 6000) {
  return Promise.race([
    belofte,
    new Promise((op) => setTimeout(() => op({ data: null, error: { message: 'Geen antwoord binnen de tijd' }, status: 0 }), ms)),
  ]);
}

// Voert `ophalen` uit; supabase-js gooit nooit een fout, maar geeft altijd {data, error, status} terug.
// status 0 betekent: geen antwoord van de server gekregen (waarschijnlijk geen netwerk) — dan valt de app
// terug op de cache onder `sleutel`. Een echte serverfout (wél een status, bijv. 403 bij geen toegang meer)
// wordt altijd getoond, nooit verborgen achter verouderde cache. Een succesvolle ophaling ververst de cache.
async function metCache(sleutel, ophalen) {
  const { data, error, status } = await metTijdslimiet(ophalen());
  if (error) {
    if (!status) {
      const cache = leesCache(sleutel);
      if (cache) { toonOfflineBalk(`Offline — laatst opgehaald op ${dagTijd(cache.bijgewerkt)}.`); return cache.data; }
    }
    throw error;
  }
  schrijfCache(sleutel, data);
  verbergOfflineBalk();
  return data;
}

// Tabellen die bij export/import horen, in volgorde van afhankelijkheid
const TABELLEN = ['places', 'days', 'bookings', 'activities', 'legs', 'expenses', 'budgetten',
  'tasks', 'links', 'packing_items', 'documents', 'notities'];

export async function laadReizen() {
  return metCache('reisplanner:reizen', () => supabase.from('trips').select('*').order('created_at'));
}

export async function maakReis(naam, startdatum) {
  const { data, error } = await supabase.rpc('create_trip', { p_naam: naam, p_startdatum: startdatum || null });
  if (error) throw error;
  return data;
}

export async function laadLeden(tripId) {
  const { data, error } = await supabase.from('trip_members').select('*').eq('trip_id', tripId).order('created_at');
  if (error) throw error;
  return data;
}

export async function nodigUit(tripId, email) {
  const { error } = await supabase.from('trip_members')
    .insert({ trip_id: tripId, email: email.trim().toLowerCase(), rol: 'lid' });
  if (error) throw error;
}

export async function bewaarReis(tripId, velden) {
  const { error } = await supabase.from('trips').update(velden).eq('id', tripId);
  if (error) throw error;
}

// Realtime: roept terugbel aan bij elke wijziging aan de reis
export function volgReis(tripId, terugbel) {
  return supabase.channel('reis-' + tripId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
      (m) => terugbel(m.new))
    .subscribe();
}

export async function exporteerAlles(tripId) {
  const uit = { versie: 1, geexporteerd: new Date().toISOString() };
  const { data: reis, error } = await supabase.from('trips').select('*').eq('id', tripId).single();
  if (error) throw error;
  uit.trips = reis;
  for (const t of TABELLEN) {
    const { data, error: e } = await supabase.from(t).select('*').eq('trip_id', tripId);
    if (e) throw e;
    uit[t] = data;
  }
  return uit;
}

export async function importeerAlles(tripId, bestand) {
  if (!bestand || bestand.versie !== 1) throw new Error('Onbekend importbestand');
  for (const t of TABELLEN) {
    const rijen = (bestand[t] || []).map((r) => ({ ...r, trip_id: tripId }));
    if (!rijen.length) continue;
    const { error } = await supabase.from(t).upsert(rijen);
    if (error) throw new Error(`${t}: ${error.message}`);
  }
  if (bestand.trips) {
    const { id, created_at, updated_at, updated_by, ...velden } = bestand.trips;
    await bewaarReis(tripId, velden);
  }
}

// ---------------------------------------------------------------
// Algemene hulpfuncties voor de tabellen van een reis
// ---------------------------------------------------------------
export async function lijst(tabel, tripId, sorteer = 'created_at') {
  return metCache(`reisplanner:${tripId}:${tabel}`,
    () => supabase.from(tabel).select('*').eq('trip_id', tripId).order(sorteer));
}

export async function voegToe(tabel, rij) {
  const { data, error } = await supabase.from(tabel).insert(rij).select().single();
  if (error) throw error;
  return data;
}

// Bij ignoreDuplicates worden bestaande rijen (zelfde onConflict-kolommen) overgeslagen
export async function voegMeerToe(tabel, rijen, { onConflict, ignoreDuplicates } = {}) {
  const { error } = await supabase.from(tabel).upsert(rijen, { onConflict, ignoreDuplicates });
  if (error) throw error;
}

export async function wijzig(tabel, id, velden) {
  const { error } = await supabase.from(tabel).update(velden).eq('id', id);
  if (error) throw error;
}

export async function verwijder(tabel, id) {
  const { error } = await supabase.from(tabel).delete().eq('id', id);
  if (error) throw error;
}

// Realtime: roept terugbel aan bij elke wijziging in een van de tabellen.
// Zonder filter, want verwijderingen bevatten alleen de id; RLS bepaalt wat je krijgt.
export function volgTabellen(tabellen, terugbel) {
  const kanaal = supabase.channel('tabellen');
  for (const t of tabellen) {
    kanaal.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => terugbel(t));
  }
  return kanaal.subscribe();
}
