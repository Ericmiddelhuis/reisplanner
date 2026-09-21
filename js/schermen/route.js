// Route: kaart met stops en etappes, afstand/rijtijd (OpenRouteService) en waarschuwingen voor lange rijdagen
import { lijst, voegToe, wijzig, verwijder } from '../db.js';
import { maak, dagTekst, geld } from '../util.js';
import { opendialoog, veld, plaatsDialoog } from '../dialogen.js';
import { berekenRoute, decodeer } from '../ors.js';

// Routeservices schatten rijtijden op grind en zand te optimistisch: standaard correctiefactor per wegtype
export const WEGTYPEN = { asfalt: ['Asfalt', 1], grind: ['Grind', 1.3], zand: ['Zand', 1.6], '4x4': ['4x4', 2] };
const KLEUREN = { asfalt: '#3F5A3A', grind: '#A8611E', zand: '#7A4210', '4x4': '#7A4210' };
const VERTREK_UUR = 8;          // aanname voor de zonsondergang-waarschuwing
const ZONSONDERGANG_UUR = 17.75; // juli/augustus, ± 17:45
const LEAFLET = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/';

let leafletBelofte;
function laadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  leafletBelofte ??= new Promise((ok, mis) => {
    document.head.append(maak('link', { rel: 'stylesheet', href: LEAFLET + 'leaflet.css' }));
    document.head.append(maak('script', { src: LEAFLET + 'leaflet.js', onload: () => ok(window.L),
      onerror: () => { leafletBelofte = null; mis(new Error('De kaart kon niet laden (geen internet?)')); } }));
  });
  return leafletBelofte;
}

const uren = (min) => `${Math.floor(min / 60)} u ${String(Math.round(min % 60)).padStart(2, '0')} min`;
const gecorrigeerd = (l) => (l.rijtijd_min == null ? null : l.rijtijd_min * (Number(l.correctiefactor) || 1));
const heeftLocatie = (p) => p && p.lat != null && p.lng != null;

export async function toonRoute(el, staat) {
  let d = { dagen: [], plaatsen: [], legs: [] };
  let L = null, kaart = null, laag = null, kiesModus = false, eersteTekening = true;
  const tripId = () => staat.reis.id;
  const plaats = (id) => d.plaatsen.find((p) => p.id === id);
  const dagVan = (id) => d.dagen.find((x) => x.id === id);

  async function laden() {
    const [dagen, plaatsen, legs] = await Promise.all([
      lijst('days', tripId(), 'dagnummer'), lijst('places', tripId(), 'naam'), lijst('legs', tripId())]);
    legs.sort((a, b) => (dagVan2(dagen, a)?.dagnummer ?? 999) - (dagVan2(dagen, b)?.dagnummer ?? 999));
    d = { dagen, plaatsen, legs };
  }
  const dagVan2 = (dagen, leg) => dagen.find((x) => x.id === leg.day_id);

  el.replaceChildren(maak('h1', {}, 'Route'), maak('p', { class: 'gedempt' }, 'Laden…'));
  try { await laden(); } catch (e) {
    el.replaceChildren(maak('h1', {}, 'Route'), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
    return;
  }
  if (staat.pad !== 'route') return;

  // ---------- opzet ----------
  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const kaartEl = maak('div', { id: 'kaart', role: 'application', 'aria-label': 'Kaart van de route' });
  const kiesHint = maak('p', { class: 'melding verborgen' }, 'Tik op de kaart op de plek van de nieuwe plaats.');
  const kiesKnop = maak('button', { type: 'button', class: 'knop licht', 'aria-pressed': 'false', onclick: () => zetKiesModus(!kiesModus) },
    'Plaats op kaart kiezen');
  const waarschuwingen = maak('div', { id: 'waarschuwingen' });
  const etappeKaart = maak('div', { class: 'kaart', id: 'etappes' });
  const plaatsKaart = maak('div', { class: 'kaart', id: 'plaatsen' });
  el.replaceChildren(maak('h1', {}, 'Route'), status,
    maak('div', { class: 'route-layout' },
      maak('div', { class: 'kaartkolom' }, kaartEl, kiesHint, kiesKnop),
      maak('div', { class: 'zijkolom' }, waarschuwingen, etappeCard(), plaatsCard())));

  function etappeCard() { return etappeKaart; }
  function plaatsCard() { return plaatsKaart; }

  function meld(tekst, fout = false) { status.textContent = tekst; status.className = 'melding' + (fout ? ' fout' : ''); }
  const veilig = async (actie) => { try { await actie(); } catch (e) { meld(e.message, true); } };

  function zetKiesModus(aan) {
    kiesModus = aan;
    kiesKnop.setAttribute('aria-pressed', String(aan));
    kiesKnop.textContent = aan ? 'Kiezen annuleren' : 'Plaats op kaart kiezen';
    kiesHint.classList.toggle('verborgen', !aan);
    kaartEl.classList.toggle('kiezen', aan);
  }

  // ---------- routes berekenen ----------
  async function bereken(leg) {
    const van = plaats(leg.van_place_id), naar = plaats(leg.naar_place_id);
    if (!heeftLocatie(van) || !heeftLocatie(naar)) throw new Error('Van- en naar-plaats hebben allebei een locatie nodig.');
    const uitkomst = await berekenRoute(van, naar);
    await wijzig('legs', leg.id, uitkomst);
    Object.assign(leg, uitkomst);
  }

  async function berekenOntbrekend() {
    const todo = d.legs.filter((l) => (l.afstand_km == null || !l.geometrie) &&
      heeftLocatie(plaats(l.van_place_id)) && heeftLocatie(naar(l)));
    let gelukt = 0; const fouten = [];
    for (const leg of todo) {
      meld(`Routes berekenen… (${gelukt + fouten.length + 1} van ${todo.length})`);
      try { await bereken(leg); gelukt++; } catch (e) { fouten.push(e.message); }
    }
    if (todo.length) meld(`${gelukt} van ${todo.length} routes berekend.` + (fouten.length ? ' Fout: ' + fouten[0] : ''), fouten.length > 0);
    else meld('Geen routes om te berekenen: kies bij de etappes plaatsen met een locatie.');
    tekenAlles();
  }
  const naar = (l) => plaats(l.naar_place_id);

  async function maakUitOvernachtingen() {
    await veilig(async () => {
      let nieuw = 0;
      for (let i = 1; i < d.dagen.length; i++) {
        const van = d.dagen[i - 1].overnachting_place_id, tot = d.dagen[i].overnachting_place_id;
        if (!van || !tot || van === tot) continue;
        if (d.legs.some((l) => l.day_id === d.dagen[i].id && l.van_place_id === van && l.naar_place_id === tot)) continue;
        d.legs.push(await voegToe('legs', { trip_id: tripId(), van_place_id: van, naar_place_id: tot,
          day_id: d.dagen[i].id, wegtype: 'asfalt', correctiefactor: 1 }));
        nieuw++;
      }
      if (!nieuw) meld('Geen nieuwe etappes gevonden. Zet bij Dagen eerst per dag een overnachting.');
      else { tekenAlles(); await berekenOntbrekend(); }
    });
    tekenAlles();
  }

  // ---------- kaart ----------
  const stijl = (l) => ({ color: KLEUREN[l.wegtype] || '#6B6656', weight: 4, opacity: .85,
    dashArray: l.wegtype === 'zand' || l.wegtype === '4x4' ? '2 8' : l.wegtype === 'grind' ? '10 6' : null });

  function popup(titel, regels, knopTekst, opKlik) {
    return maak('div', { class: 'popup' }, maak('strong', {}, titel), ...regels.filter(Boolean).map((r) => maak('div', {}, r)),
      maak('button', { type: 'button', class: 'knop licht', onclick: opKlik }, knopTekst));
  }

  function tekenKaart() {
    if (!kaart) return;
    laag.clearLayers();
    const punten = [];
    for (const l of d.legs) {
      const van = plaats(l.van_place_id), tot = naar(l);
      const lijn = l.geometrie ? decodeer(l.geometrie) : heeftLocatie(van) && heeftLocatie(tot) ? [[van.lat, van.lng], [tot.lat, tot.lng]] : null;
      if (!lijn) continue;
      L.polyline(lijn, l.geometrie ? stijl(l) : { color: '#C9A56E', weight: 3, dashArray: '4 6' })
        .bindPopup(popup(`${van?.naam ?? '?'} → ${tot?.naam ?? '?'}`, [etappeMeta(l)], 'Etappe bewerken', () => vraagEtappe(l))).addTo(laag);
    }
    for (const p of d.plaatsen.filter(heeftLocatie)) {
      punten.push([p.lat, p.lng]);
      L.marker([p.lat, p.lng], { title: p.naam, draggable: true,
        icon: L.divIcon({ className: 'pin', iconSize: [22, 22], iconAnchor: [11, 11] }) })
        .bindPopup(popup(p.naam, [[p.type, p.land].filter(Boolean).join(' · '), p.notitie], 'Plaats bewerken', () => vraagPlaats(p)))
        .on('dragend', (ev) => verplaats(p, ev.target.getLatLng())).addTo(laag);
    }
    if (eersteTekening && punten.length) { kaart.fitBounds(punten, { padding: [30, 30], maxZoom: 9 }); eersteTekening = false; }
  }

  // Marker verslepen: locatie opslaan en de routes van deze plaats opnieuw berekenen
  async function verplaats(p, ll) {
    await veilig(async () => {
      const velden = { lat: Number(ll.lat.toFixed(6)), lng: Number(ll.lng.toFixed(6)) };
      await wijzig('places', p.id, velden); Object.assign(p, velden);
      for (const l of d.legs.filter((x) => x.van_place_id === p.id || x.naar_place_id === p.id)) {
        try { await bereken(l); } catch (e) { meld('Route niet herberekend: ' + e.message, true); }
      }
    });
    tekenAlles();
  }

  // ---------- lijsten ----------
  const etappeMeta = (l) => [
    dagVan(l.day_id) && `Dag ${dagVan(l.day_id).dagnummer}`,
    l.afstand_km != null && `${l.afstand_km} km`,
    l.rijtijd_min != null && `rijtijd ± ${uren(gecorrigeerd(l))}` + (Number(l.correctiefactor) !== 1 ? ` (routeservice ${uren(l.rijtijd_min)}, factor ${l.correctiefactor})` : ''),
  ].filter(Boolean).join(' · ');

  function rijdagWaarschuwingen() {
    const max = Number(staat.reis.max_rijuren_per_dag ?? 4);
    const perDag = new Map();
    for (const l of d.legs) if (l.day_id && l.rijtijd_min != null) perDag.set(l.day_id, (perDag.get(l.day_id) || 0) + gecorrigeerd(l) / 60);
    const uit = [];
    for (const [dagId, u] of [...perDag].sort((a, b) => dagVan(a[0]).dagnummer - dagVan(b[0]).dagnummer)) {
      const nr = dagVan(dagId).dagnummer;
      if (u > max) uit.push(`Dag ${nr}: ± ${uren(u * 60)} rijden, meer dan je maximum van ${max} uur per dag.`);
      if (VERTREK_UUR + u > ZONSONDERGANG_UUR) uit.push(`Dag ${nr}: bij vertrek om 08:00 rijd je tot na zonsondergang (± 17:45). Rijd na donker liever niet: vertrek eerder of splits de dag.`);
    }
    return uit;
  }

  function renderLijsten() {
    const waarsch = rijdagWaarschuwingen();
    waarschuwingen.replaceChildren(...(waarsch.length ? [maak('div', { class: 'melding fout', role: 'alert' },
      maak('strong', {}, 'Let op bij deze rijdagen'), maak('ul', {}, waarsch.map((w) => maak('li', {}, w))))] : []));

    etappeKaart.replaceChildren(
      maak('h2', {}, 'Etappes'),
      d.legs.length ? maak('ul', { class: 'lijst' }, d.legs.map((l) => {
        const meta = etappeMeta(l);
        return maak('li', {}, maak('button', { type: 'button', class: 'activiteit', onclick: () => vraagEtappe(l) },
          maak('strong', {}, `${plaats(l.van_place_id)?.naam ?? '?'} → ${plaats(l.naar_place_id)?.naam ?? '?'}`),
          meta ? maak('span', { class: 'gedempt' }, meta) : maak('span', { class: 'gedempt' }, 'Nog geen afstand of rijtijd'),
          maak('span', { class: 'badges' },
            l.wegtype ? maak('span', { class: 'badge ' + (l.wegtype === 'asfalt' ? 'geboekt' : 'nog-boeken') }, WEGTYPEN[l.wegtype][0]) : null,
            l.grensovergang ? maak('span', { class: 'badge nog-boeken' }, 'Grensovergang') : null,
            l.brandstofkosten != null ? maak('span', { class: 'badge' }, 'Brandstof ' + geld(l.brandstofkosten)) : null)));
      })) : maak('p', { class: 'gedempt' }, 'Nog geen etappes.'),
      maak('div', { class: 'knoppen' },
        maak('button', { type: 'button', class: 'knop', onclick: maakUitOvernachtingen }, 'Etappes maken uit overnachtingen'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => vraagEtappe(null) }, '+ Etappe'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => veilig(berekenOntbrekend) }, 'Ontbrekende routes berekenen')));

    plaatsKaart.replaceChildren(
      maak('h2', {}, 'Plaatsen'),
      d.plaatsen.length ? maak('ul', { class: 'lijst' }, d.plaatsen.map((p) => maak('li', {},
        maak('button', { type: 'button', class: 'activiteit', onclick: () => vraagPlaats(p) },
          maak('strong', {}, p.naam),
          maak('span', { class: 'gedempt' }, [p.type, p.land].filter(Boolean).join(' · ')),
          heeftLocatie(p) ? null : maak('span', { class: 'badge nog-boeken' }, 'Zonder locatie'))))) : maak('p', { class: 'gedempt' }, 'Nog geen plaatsen.'),
      maak('button', { type: 'button', class: 'knop licht', onclick: () => vraagPlaats(null) }, '+ Plaats'));
  }

  function tekenAlles() { renderLijsten(); tekenKaart(); }

  // ---------- dialogen ----------
  function vraagPlaats(p, lat = null, lng = null) {
    plaatsDialoog({ ouder: el, tripId: tripId(), plaats: p, lat, lng,
      naOpslaan: async (opgeslagen) => {
        if (!p) d.plaatsen.push(opgeslagen);
        d.plaatsen.sort((a, b) => a.naam.localeCompare(b.naam));
        tekenAlles();
        // Locatie nieuw of gewijzigd: routes van deze plaats opnieuw berekenen
        if (heeftLocatie(opgeslagen)) {
          for (const l of d.legs.filter((x) => x.van_place_id === opgeslagen.id || x.naar_place_id === opgeslagen.id)) {
            try { await bereken(l); } catch (e) { meld('Route niet berekend: ' + e.message, true); }
          }
          tekenAlles();
        }
      },
      naVerwijderen: (weg) => {
        d.plaatsen = d.plaatsen.filter((x) => x.id !== weg.id);
        for (const l of d.legs) { if (l.van_place_id === weg.id) l.van_place_id = null; if (l.naar_place_id === weg.id) l.naar_place_id = null; }
        tekenAlles();
      } });
  }

  function vraagEtappe(leg) {
    const origineel = leg ? { van: leg.van_place_id, naar: leg.naar_place_id } : null;
    let geometrie = leg?.geometrie || null;
    const fout = maak('p', { class: 'melding fout verborgen', role: 'alert' });
    const toonFout = (t) => { fout.textContent = t; fout.classList.remove('verborgen'); };
    const plaatsOpties = () => [maak('option', { value: '' }, '— kies —'),
      ...d.plaatsen.map((p) => maak('option', { value: p.id }, p.naam))];
    const van = maak('select', { id: 'et-van', value: leg?.van_place_id || '' }, plaatsOpties());
    const tot = maak('select', { id: 'et-naar', value: leg?.naar_place_id || '' }, plaatsOpties());
    const dag = maak('select', { id: 'et-dag', value: leg?.day_id || '' }, maak('option', { value: '' }, '— geen dag —'),
      d.dagen.map((x) => maak('option', { value: x.id }, `Dag ${x.dagnummer}${x.datum ? ' · ' + dagTekst(x.datum) : ''}${x.titel ? ' · ' + x.titel : ''}`)));
    const weg = maak('select', { id: 'et-weg', value: leg?.wegtype || 'asfalt' },
      Object.entries(WEGTYPEN).map(([w, [naam]]) => maak('option', { value: w }, naam)));
    const factor = maak('input', { id: 'et-factor', type: 'number', step: '0.05', min: '0.5', max: '4', inputmode: 'decimal',
      value: leg?.correctiefactor ?? WEGTYPEN[leg?.wegtype || 'asfalt'][1] });
    weg.addEventListener('change', () => { factor.value = WEGTYPEN[weg.value][1]; });   // standaardfactor, daarna aan te passen
    const grens = maak('input', { id: 'et-grens', type: 'checkbox', checked: !!leg?.grensovergang });
    const afstand = maak('input', { id: 'et-km', type: 'number', step: '0.1', min: '0', inputmode: 'decimal', value: leg?.afstand_km ?? '' });
    const rijtijd = maak('input', { id: 'et-min', type: 'number', step: '1', min: '0', inputmode: 'numeric', value: leg?.rijtijd_min ?? '' });
    const brandstof = maak('input', { id: 'et-brandstof', type: 'number', step: '0.01', min: '0', inputmode: 'decimal', value: leg?.brandstofkosten ?? '' });

    const coords = () => ({ v: plaats(van.value), n: plaats(tot.value) });
    let dlg;
    async function opDialoogBereken() {
      const { v, n } = coords();
      if (!heeftLocatie(v) || !heeftLocatie(n)) return toonFout('Kies een van- en naar-plaats met een locatie.');
      try {
        const u = await berekenRoute(v, n);
        afstand.value = u.afstand_km; rijtijd.value = u.rijtijd_min; geometrie = u.geometrie;
        fout.classList.add('verborgen');
      } catch (e) { toonFout(e.message); }
    }

    const form = maak('form', { method: 'dialog', onsubmit: async (ev) => {
      ev.preventDefault();
      if (van.value && van.value === tot.value) return toonFout('Van en naar zijn dezelfde plaats.');
      const gewijzigd = !origineel || origineel.van !== (van.value || null) || origineel.naar !== (tot.value || null);
      const velden = { van_place_id: van.value || null, naar_place_id: tot.value || null, day_id: dag.value || null,
        wegtype: weg.value, correctiefactor: Number(factor.value) || 1, grensovergang: grens.checked,
        afstand_km: afstand.value === '' ? null : Number(afstand.value),
        rijtijd_min: rijtijd.value === '' ? null : Number(rijtijd.value),
        brandstofkosten: brandstof.value === '' ? null : Number(brandstof.value), geometrie };
      // Andere plaatsen gekozen: oude routelijn klopt niet meer, dus opnieuw berekenen als dat kan
      if (gewijzigd) {
        const { v, n } = coords();
        if (heeftLocatie(v) && heeftLocatie(n)) {
          try { Object.assign(velden, await berekenRoute(v, n)); } catch (e) { meld('Route niet berekend: ' + e.message, true); }
        } else { velden.geometrie = null; }
      }
      try {
        if (leg) { await wijzig('legs', leg.id, velden); Object.assign(leg, velden); }
        else d.legs.push(await voegToe('legs', { ...velden, trip_id: tripId() }));
        dlg.close(); tekenAlles();
      } catch (e) { toonFout(e.message); }
    } },
      maak('div', { class: 'rij' }, veld('et-van', 'Van', van), veld('et-naar', 'Naar', tot)),
      veld('et-dag', 'Dag', dag),
      maak('div', { class: 'rij' }, veld('et-weg', 'Wegtype', weg), veld('et-factor', 'Correctiefactor rijtijd', factor)),
      maak('p', { class: 'gedempt' }, 'Grind en zand rijden langzamer dan de routeservice denkt. Met de factor reken je de rijtijd om.'),
      maak('div', { class: 'vinkje' }, grens, maak('label', { for: 'et-grens' }, 'Grensovergang')),
      maak('div', { class: 'rij' }, veld('et-km', 'Afstand (km)', afstand), veld('et-min', 'Rijtijd routeservice (min)', rijtijd)),
      maak('button', { type: 'button', class: 'knop licht', onclick: opDialoogBereken }, 'Bereken via OpenRouteService'),
      veld('et-brandstof', 'Brandstofkosten (EUR)', brandstof), fout,
      maak('div', { class: 'knoppen' },
        maak('button', { type: 'submit', class: 'knop' }, 'Opslaan'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => dlg.close() }, 'Annuleren'),
        leg ? maak('button', { type: 'button', class: 'knop licht gevaar', onclick: async () => {
          if (!confirm('Deze etappe verwijderen?')) return;
          try { await verwijder('legs', leg.id); d.legs = d.legs.filter((x) => x.id !== leg.id); dlg.close(); tekenAlles(); }
          catch (e) { toonFout(e.message); }
        } }, 'Verwijderen') : null));
    dlg = opendialoog(el, leg ? 'Etappe bewerken' : 'Nieuwe etappe', form);
  }

  // ---------- Realtime ----------
  let timer;
  const verwerk = async () => {
    if (staat.pad !== 'route') return;
    const actief = document.activeElement;
    if (el.querySelector('dialog[open]') || (actief && el.contains(actief) && /^(INPUT|TEXTAREA|SELECT)$/.test(actief.tagName))) {
      timer = setTimeout(verwerk, 1000); return;
    }
    try { await laden(); } catch { return; }
    tekenAlles();
  };
  staat.opWijziging = () => { clearTimeout(timer); timer = setTimeout(verwerk, 300); };

  renderLijsten();
  try {
    L = await laadLeaflet();
    if (staat.pad !== 'route') return;
    kaart = L.map(kaartEl).setView([-22.5, 17], 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(kaart);
    laag = L.layerGroup().addTo(kaart);
    kaart.on('click', (ev) => {
      if (!kiesModus) return;
      zetKiesModus(false);
      vraagPlaats(null, Number(ev.latlng.lat.toFixed(6)), Number(ev.latlng.lng.toFixed(6)));
    });
    tekenKaart();
  } catch (e) {
    kaartEl.replaceChildren(maak('p', { class: 'melding fout' }, e.message));
  }
}
