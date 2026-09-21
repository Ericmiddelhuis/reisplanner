// Gedeelde dialogen (o.a. plaats aanmaken/bewerken, met zoeken en coördinaten)
import { maak } from './util.js';
import { voegToe, wijzig, verwijder } from './db.js';
import { zoekPlaats } from './ors.js';

export const PLAATSTYPEN = [['stad', 'Stad'], ['park', 'Park'], ['camping', 'Camping'], ['lodge', 'Lodge'],
  ['grenspost', 'Grenspost'], ['tankstation', 'Tankstation']];

export function opendialoog(ouder, titel, formulier) {
  const dlg = maak('dialog', { class: 'dialoog', 'aria-label': titel }, maak('h2', {}, titel), formulier);
  dlg.addEventListener('close', () => dlg.remove());
  ouder.append(dlg);
  dlg.showModal();
  return dlg;
}

export const veld = (id, label, invoer) => maak('div', {}, maak('label', { for: id }, label), invoer);

// plaats = bestaande plaats (bewerken) of null (nieuw); lat/lng = voorinvulling (bijv. klik op de kaart)
export function plaatsDialoog({ ouder, tripId, plaats = null, lat = null, lng = null, naOpslaan, naVerwijderen }) {
  const fout = maak('p', { class: 'melding fout verborgen', role: 'alert' });
  const toonFout = (t) => { fout.textContent = t; fout.classList.remove('verborgen'); };
  const zoek = maak('input', { id: 'pl-zoek', type: 'search', placeholder: 'bijv. Sesriem' });
  const resultaten = maak('ul', { class: 'lijst' });
  const naam = maak('input', { id: 'pl-naam', required: true, value: plaats?.naam || '' });
  const land = maak('select', { id: 'pl-land', value: plaats?.land || '' }, maak('option', { value: '' }, '—'),
    maak('option', { value: 'NA' }, 'Namibië'), maak('option', { value: 'BW' }, 'Botswana'));
  const type = maak('select', { id: 'pl-type', value: plaats?.type || '' }, maak('option', { value: '' }, '—'),
    PLAATSTYPEN.map(([w, t]) => maak('option', { value: w }, t)));
  const breedte = maak('input', { id: 'pl-lat', type: 'number', step: 'any', inputmode: 'decimal', value: plaats?.lat ?? lat ?? '' });
  const lengte = maak('input', { id: 'pl-lng', type: 'number', step: 'any', inputmode: 'decimal', value: plaats?.lng ?? lng ?? '' });
  const notitie = maak('textarea', { id: 'pl-notitie', rows: '2' }, plaats?.notitie || '');

  async function zoeken() {
    if (!zoek.value.trim()) return;
    resultaten.replaceChildren(maak('li', { class: 'gedempt' }, 'Zoeken…'));
    try {
      const gevonden = await zoekPlaats(zoek.value.trim());
      resultaten.replaceChildren(...(gevonden.length
        ? gevonden.map((x) => maak('li', {}, maak('button', { type: 'button', class: 'resultaat', onclick: () => {
            if (!naam.value.trim()) naam.value = x.kort;
            breedte.value = x.lat; lengte.value = x.lng;
            if (['NA', 'BW'].includes(x.land)) land.value = x.land;
            resultaten.replaceChildren(maak('li', { class: 'gedempt' }, `Gekozen: ${x.naam}`));
          } }, x.naam)))
        : [maak('li', { class: 'gedempt' }, 'Niets gevonden.')]));
    } catch (e) { resultaten.replaceChildren(maak('li', { class: 'gedempt' }, e.message)); }
  }
  zoek.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); zoeken(); } });

  let dlg;
  const form = maak('form', { method: 'dialog', onsubmit: async (ev) => {
    ev.preventDefault();
    const b = breedte.value === '' ? null : Number(breedte.value);
    const l = lengte.value === '' ? null : Number(lengte.value);
    if ((b === null) !== (l === null) || (b !== null && (Math.abs(b) > 90 || Math.abs(l) > 180))) {
      return toonFout('Vul beide coördinaten in (breedte tussen -90 en 90, lengte tussen -180 en 180) of laat ze leeg.');
    }
    const velden = { naam: naam.value.trim(), land: land.value || null, type: type.value || null,
      lat: b, lng: l, notitie: notitie.value.trim() || null };
    try {
      let p;
      if (plaats) { await wijzig('places', plaats.id, velden); p = Object.assign(plaats, velden); }
      else p = await voegToe('places', { ...velden, trip_id: tripId });
      dlg.close(); naOpslaan?.(p);
    } catch (e) { toonFout(e.message); }
  } },
    maak('label', { for: 'pl-zoek' }, 'Zoeken (OpenStreetMap)'),
    maak('div', { class: 'rij zoekrij' }, zoek, maak('button', { type: 'button', class: 'knop licht', onclick: zoeken }, 'Zoeken')),
    resultaten,
    veld('pl-naam', 'Naam', naam),
    maak('div', { class: 'rij' }, veld('pl-land', 'Land', land), veld('pl-type', 'Soort plaats', type)),
    maak('div', { class: 'rij' }, veld('pl-lat', 'Breedtegraad (lat)', breedte), veld('pl-lng', 'Lengtegraad (lng)', lengte)),
    veld('pl-notitie', 'Notitie', notitie), fout,
    maak('div', { class: 'knoppen' },
      maak('button', { type: 'submit', class: 'knop' }, 'Opslaan'),
      maak('button', { type: 'button', class: 'knop licht', onclick: () => dlg.close() }, 'Annuleren'),
      plaats ? maak('button', { type: 'button', class: 'knop licht gevaar', onclick: async () => {
        if (!confirm(`Plaats "${plaats.naam}" verwijderen? Overnachtingen en etappes verliezen dan hun plaats.`)) return;
        try { await verwijder('places', plaats.id); dlg.close(); naVerwijderen?.(plaats); } catch (e) { toonFout(e.message); }
      } }, 'Verwijderen') : null));
  dlg = opendialoog(ouder, plaats ? 'Plaats bewerken' : 'Nieuwe plaats', form);
  return dlg;
}
