// Supabase-client en gedeelde opslag
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Tabellen die bij export/import horen, in volgorde van afhankelijkheid
const TABELLEN = ['places', 'days', 'bookings', 'activities', 'legs', 'expenses',
  'tasks', 'links', 'packing_items', 'documents'];

export async function laadReizen() {
  const { data, error } = await supabase.from('trips').select('*').order('created_at');
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase.from(tabel).select('*').eq('trip_id', tripId).order(sorteer);
  if (error) throw error;
  return data;
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
