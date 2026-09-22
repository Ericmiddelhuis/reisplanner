// Dagplanning: week-chips, daglijst en dagdetails (overnachting, activiteiten per dagdeel)
import { lijst, voegToe, voegMeerToe, wijzig, verwijder, bewaarReis } from '../db.js';
import { maak, dagTekst, datumVoor, geld } from '../util.js';
import { opendialoog as opendlg, veld, plaatsDialoog } from '../dialogen.js';
import { CATEGORIEEN } from '../categorieen.js';

const AANTAL_DAGEN = 28;
const DAGDELEN = [['ochtend', 'Ochtend'], ['middag', 'Middag'], ['avond', 'Avond']];
const STATUSSEN = ['idee', 'nog boeken', 'geboekt', 'betaald'];

export async function toonDagen(el, staat) {
  let d = { dagen: [], plaatsen: [], activiteiten: [], boekingen: [] };
  const ui = { week: 0, dagId: null, detail: false };   // detail: alleen relevant op telefoon
  const tripId = () => staat.reis.id;
  const laptop = () => matchMedia('(min-width: 900px)').matches;

  // ---------- data ----------
  async function laden() {
    const [dagen, plaatsen, activiteiten, boekingen] = await Promise.all([
      lijst('days', tripId(), 'dagnummer'), lijst('places', tripId(), 'naam'),
      lijst('activities', tripId()), lijst('bookings', tripId())]);
    d = { dagen, plaatsen, activiteiten, boekingen };
  }

  // Bij het eerste bezoek de 28 dagen aanmaken (upsert: veilig als Ilse tegelijk opent)
  async function genereer() {
    const rijen = Array.from({ length: AANTAL_DAGEN }, (_, i) => ({
      trip_id: tripId(), dagnummer: i + 1, datum: datumVoor(staat.reis.startdatum, i + 1) }));
    await voegMeerToe('days', rijen, { onConflict: 'trip_id,dagnummer', ignoreDuplicates: true });
  }

  // Datums volgen de startdatum van de reis; einddatum volgt de laatste dag
  async function synchroniseer() {
    for (const dag of d.dagen) {
      const verwacht = datumVoor(staat.reis.startdatum, dag.dagnummer);
      if (dag.datum !== verwacht) { await wijzig('days', dag.id, { datum: verwacht }); dag.datum = verwacht; }
    }
    const laatste = d.dagen.at(-1)?.datum ?? null;
    if (laatste && staat.reis.einddatum !== laatste) await bewaarReis(tripId(), { einddatum: laatste });
  }

  const plaatsNaam = (id) => d.plaatsen.find((p) => p.id === id)?.naam || '';
  const verblijfBoeking = (dag) => d.boekingen.find((b) => b.day_id === dag.id && b.type === 'verblijf');
  const dagenVanWeek = () => d.dagen.filter((x) => Math.floor((x.dagnummer - 1) / 7) === ui.week);

  // ---------- opzet ----------
  el.replaceChildren(maak('h1', {}, 'Dagen'), maak('p', { class: 'gedempt' }, 'Laden…'));
  try {
    await laden();
    if (!d.dagen.length) { await genereer(); await laden(); }
    await synchroniseer();
  } catch (e) {
    el.replaceChildren(maak('h1', {}, 'Dagen'), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
    return;
  }
  if (staat.pad !== 'dagen') return;   // ondertussen naar een ander scherm gegaan

  // Standaard de week van vandaag tonen als de reis al bezig is
  if (staat.reis.startdatum) {
    const n = Math.floor((Date.now() - new Date(staat.reis.startdatum + 'T00:00:00')) / 864e5);
    if (n >= 0 && n < d.dagen.length) ui.week = Math.floor(n / 7);
  }

  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const lijstKolom = maak('section', { id: 'daglijstkolom', 'aria-label': 'Dagen' });
  const detailKolom = maak('section', { id: 'dagdetail', 'aria-label': 'Dagdetails' });
  const layout = maak('div', { class: 'dagen-layout' }, lijstKolom, detailKolom);
  el.replaceChildren(maak('h1', {}, 'Dagen'), status, layout);

  function meld(tekst, fout = false) {
    status.textContent = tekst;
    status.className = 'melding' + (fout ? ' fout' : '');
  }
  async function veilig(actie) {
    try { await actie(); meld('Opgeslagen.'); } catch (e) { meld('Opslaan mislukt: ' + e.message, true); }
  }

  function render() {
    if (!d.dagen.some((x) => x.id === ui.dagId)) ui.dagId = null;
    if (!ui.dagId && laptop()) ui.dagId = dagenVanWeek()[0]?.id ?? null;
    layout.classList.toggle('detail-open', ui.detail && !!ui.dagId);
    renderLijst();
    renderDetail();
  }

  // ---------- lijst ----------
  function badge(statusTekst) {
    return maak('span', { class: 'badge ' + statusTekst.replace(' ', '-') }, statusTekst);
  }

  function renderLijst() {
    const weken = Math.max(1, Math.ceil(d.dagen.length / 7));
    if (ui.week >= weken) ui.week = weken - 1;
    const chips = maak('div', { class: 'weekchips', role: 'group', 'aria-label': 'Kies een week' },
      Array.from({ length: weken }, (_, w) => maak('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(w === ui.week),
        onclick: () => { ui.week = w; ui.dagId = null; ui.detail = false; render(); },
      }, `Week ${w + 1}`)));

    const items = dagenVanWeek().map((dag) => {
      const verblijf = verblijfBoeking(dag);
      const plaats = plaatsNaam(dag.overnachting_place_id);
      return maak('li', {}, maak('button', {
        type: 'button', class: 'dag', 'aria-current': dag.id === ui.dagId ? 'true' : null,
        onclick: () => { ui.dagId = dag.id; ui.detail = true; render(); },
      },
        maak('span', { class: 'dag-nr' }, String(dag.dagnummer)),
        maak('span', { class: 'dag-tekst' },
          maak('strong', { class: dag.titel ? '' : 'gedempt' }, dag.titel || 'Nog geen titel'),
          maak('span', { class: 'gedempt' }, [dagTekst(dag.datum), plaats && 'slaap: ' + plaats].filter(Boolean).join(' · '))),
        verblijf ? badge(verblijf.status) : null));
    });

    lijstKolom.replaceChildren(chips, maak('ul', { class: 'daglijst' }, items),
      maak('button', { type: 'button', class: 'knop licht', onclick: voegDagToe }, '+ Dag toevoegen aan het einde'));
  }

  // ---------- detail ----------
  function plaatsKeuze(id, label, waarde, opGekozen) {
    const nieuwOptie = maak('option', { value: '__nieuw__' }, '+ Nieuwe plaats…');
    const select = maak('select', { id },
      maak('option', { value: '' }, '— geen —'),
      d.plaatsen.map((p) => maak('option', { value: p.id }, p.naam + (p.land ? ` (${p.land})` : ''))),
      nieuwOptie);
    select.value = waarde || '';
    select.addEventListener('change', () => {
      if (select.value !== '__nieuw__') return opGekozen(select.value || null);
      select.value = waarde || '';       // terugzetten tot de nieuwe plaats is opgeslagen
      vraagPlaats((p) => {
        select.insertBefore(maak('option', { value: p.id }, p.naam + (p.land ? ` (${p.land})` : '')), nieuwOptie);
        select.value = p.id; waarde = p.id;
        opGekozen(p.id);
      });
    });
    return maak('div', {}, maak('label', { for: id }, label), select);
  }

  async function bewaarDag(dag, velden) {
    Object.assign(dag, velden);
    await veilig(() => wijzig('days', dag.id, velden));
    renderLijst();
  }

  async function zetOvernachting(dag, plaatsId) {
    await bewaarDag(dag, { overnachting_place_id: plaatsId });
    const b = verblijfBoeking(dag);
    if (b) {
      const titel = ('Overnachting ' + plaatsNaam(plaatsId)).trim();
      await veilig(() => wijzig('bookings', b.id, { titel })); b.titel = titel;
    }
    renderDetail();
  }

  async function zetStatus(dag, nieuw) {
    const b = verblijfBoeking(dag);
    await veilig(async () => {
      if (!nieuw) {
        if (b) { await verwijder('bookings', b.id); d.boekingen = d.boekingen.filter((x) => x.id !== b.id); }
      } else if (b) {
        await wijzig('bookings', b.id, { status: nieuw }); b.status = nieuw;
      } else {
        d.boekingen.push(await voegToe('bookings', { trip_id: tripId(), type: 'verblijf', status: nieuw,
          titel: ('Overnachting ' + plaatsNaam(dag.overnachting_place_id)).trim(), day_id: dag.id }));
      }
    });
    renderLijst();
  }

  function activiteitRegel(dag, a) {
    const plaats = plaatsNaam(a.place_id);
    const meta = [a.tijd && a.tijd.slice(0, 5), plaats, a.kosten != null && geld(a.kosten), a.kosten != null && a.categorie]
      .filter(Boolean).join(' · ');
    return maak('li', {}, maak('button', { type: 'button', class: 'activiteit',
      onclick: () => vraagActiviteit(dag, a) },
      maak('strong', {}, a.titel),
      meta ? maak('span', { class: 'gedempt' }, meta) : null,
      a.minimumleeftijd_kind != null ? maak('span', { class: 'badge nog-boeken' }, `Vanaf ${a.minimumleeftijd_kind} jaar`) : null,
      a.notitie ? maak('span', { class: 'gedempt' }, a.notitie) : null));
  }

  function renderDetail() {
    const dag = d.dagen.find((x) => x.id === ui.dagId);
    if (!dag) {
      detailKolom.replaceChildren(maak('div', { class: 'kaart' }, maak('p', { class: 'gedempt' }, 'Kies een dag.')));
      return;
    }
    const verblijf = verblijfBoeking(dag);
    const dagdelen = DAGDELEN.map(([sleutel, naam]) => {
      const acts = d.activiteiten.filter((a) => a.day_id === dag.id && a.dagdeel === sleutel)
        .sort((a, b) => (a.tijd || '99').localeCompare(b.tijd || '99'));
      return maak('div', { class: 'kaart' },
        maak('h3', {}, naam),
        acts.length ? maak('ul', { class: 'lijst' }, acts.map((a) => activiteitRegel(dag, a)))
          : maak('p', { class: 'gedempt' }, 'Nog niets gepland.'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => vraagActiviteit(dag, null, sleutel) },
          '+ Activiteit'));
    });

    detailKolom.replaceChildren(
      maak('button', { type: 'button', class: 'knop licht terug', onclick: () => { ui.detail = false; render(); } }, '← Alle dagen'),
      maak('div', { class: 'kaart' },
        maak('h2', {}, `Dag ${dag.dagnummer}` + (dag.datum ? ` · ${dagTekst(dag.datum)}` : '')),
        maak('label', { for: 'dag-titel' }, 'Titel'),
        maak('input', { id: 'dag-titel', value: dag.titel || '', placeholder: 'bijv. Windhoek → Sossusvlei',
          onchange: (ev) => bewaarDag(dag, { titel: ev.target.value.trim() || null }) }),
        plaatsKeuze('dag-slaap', 'Overnachting', dag.overnachting_place_id, (id) => zetOvernachting(dag, id)),
        maak('label', { for: 'dag-status', style: 'margin-top:12px' }, 'Boekingsstatus overnachting'),
        maak('select', { id: 'dag-status', value: verblijf?.status || '', onchange: (ev) => zetStatus(dag, ev.target.value) },
          maak('option', { value: '' }, 'Geen boeking'),
          STATUSSEN.map((s) => maak('option', { value: s }, s[0].toUpperCase() + s.slice(1)))),
        maak('label', { for: 'dag-notitie' }, 'Notitie'),
        maak('textarea', { id: 'dag-notitie', rows: '3', onchange: (ev) => bewaarDag(dag, { notitie: ev.target.value.trim() || null }) },
          dag.notitie || ''),
        maak('label', { for: 'dag-dagboek', style: 'margin-top:12px' }, 'Dagboek'),
        maak('textarea', { id: 'dag-dagboek', rows: '3', placeholder: 'Wat gebeurde er deze dag? (los van de planningsnotitie hierboven)',
          onchange: (ev) => bewaarDag(dag, { dagboek: ev.target.value.trim() || null }) }, dag.dagboek || '')),
      ...dagdelen,
      maak('button', { type: 'button', class: 'knop licht gevaar', onclick: () => verwijderDag(dag) }, 'Deze dag verwijderen'));
  }

  // ---------- dagen toevoegen en verwijderen ----------
  async function voegDagToe() {
    await veilig(async () => {
      const nr = (d.dagen.at(-1)?.dagnummer ?? 0) + 1;
      const dag = await voegToe('days', { trip_id: tripId(), dagnummer: nr, datum: datumVoor(staat.reis.startdatum, nr) });
      d.dagen.push(dag);
      ui.week = Math.floor((nr - 1) / 7); ui.dagId = dag.id; ui.detail = true;
      await synchroniseer();
    });
    render();
  }

  async function verwijderDag(dag) {
    if (!confirm(`Dag ${dag.dagnummer} verwijderen? De activiteiten van deze dag worden ook verwijderd.`)) return;
    await veilig(async () => {
      for (const b of d.boekingen.filter((x) => x.day_id === dag.id && x.type === 'verblijf')) await verwijder('bookings', b.id);
      await verwijder('days', dag.id);
      const rest = d.dagen.filter((x) => x.id !== dag.id);
      // Latere dagen schuiven op (oplopend, zodat dagnummer uniek blijft)
      for (const x of rest.filter((x) => x.dagnummer > dag.dagnummer)) {
        x.dagnummer -= 1; x.datum = datumVoor(staat.reis.startdatum, x.dagnummer);
        await wijzig('days', x.id, { dagnummer: x.dagnummer, datum: x.datum });
      }
      d.dagen = rest;
      d.activiteiten = d.activiteiten.filter((a) => a.day_id !== dag.id);
      d.boekingen = d.boekingen.filter((b) => b.day_id !== dag.id || b.type !== 'verblijf');
      ui.dagId = null; ui.detail = false;
      await synchroniseer();
    });
    render();
  }

  // ---------- dialogen ----------
  const opendialoog = (titel, formulier) => opendlg(el, titel, formulier);

  function vraagPlaats(naDoor) {
    plaatsDialoog({ ouder: el, tripId: tripId(), naOpslaan: (p) => {
      d.plaatsen.push(p); d.plaatsen.sort((x, y) => x.naam.localeCompare(y.naam));
      naDoor(p);
    } });
  }

  function vraagActiviteit(dag, activiteit, dagdeel = 'ochtend') {
    let plaatsId = activiteit?.place_id || null;
    const fout = maak('p', { class: 'melding fout verborgen', role: 'alert' });
    const titel = maak('input', { id: 'ac-titel', required: true, value: activiteit?.titel || '' });
    const deel = maak('select', { id: 'ac-deel', value: activiteit?.dagdeel || dagdeel },
      DAGDELEN.map(([w, t]) => maak('option', { value: w }, t)));
    const tijd = maak('input', { id: 'ac-tijd', type: 'time', value: activiteit?.tijd?.slice(0, 5) || '' });
    const kosten = maak('input', { id: 'ac-kosten', type: 'number', min: '0', step: '0.01', inputmode: 'decimal',
      value: activiteit?.kosten ?? '' });
    const categorie = maak('select', { id: 'ac-categorie', value: activiteit?.categorie || '' },
      maak('option', { value: '' }, '— geen —'), CATEGORIEEN.map((c) => maak('option', { value: c }, c)));
    const leeftijd = maak('input', { id: 'ac-leeftijd', type: 'number', min: '0', max: '18', inputmode: 'numeric',
      value: activiteit?.minimumleeftijd_kind ?? '' });
    const notitie = maak('textarea', { id: 'ac-notitie', rows: '2' }, activiteit?.notitie || '');
    let dlg;
    const form = maak('form', { method: 'dialog', onsubmit: async (ev) => {
      ev.preventDefault();
      const velden = { titel: titel.value.trim(), dagdeel: deel.value, tijd: tijd.value || null, place_id: plaatsId,
        kosten: kosten.value === '' ? null : Number(kosten.value), categorie: categorie.value || null,
        minimumleeftijd_kind: leeftijd.value === '' ? null : Number(leeftijd.value),
        notitie: notitie.value.trim() || null };
      try {
        if (activiteit) { await wijzig('activities', activiteit.id, velden); Object.assign(activiteit, velden); }
        else d.activiteiten.push(await voegToe('activities', { ...velden, trip_id: tripId(), day_id: dag.id }));
        dlg.close(); renderDetail(); renderLijst();
      } catch (e) { fout.textContent = e.message; fout.classList.remove('verborgen'); }
    } },
      veld('ac-titel', 'Titel', titel),
      maak('div', { class: 'rij' }, veld('ac-deel', 'Dagdeel', deel), veld('ac-tijd', 'Tijd (optioneel)', tijd)),
      plaatsKeuze('ac-plaats', 'Plaats', plaatsId, (id) => { plaatsId = id; }),
      maak('div', { class: 'rij' }, veld('ac-kosten', 'Kosten (EUR)', kosten), veld('ac-categorie', 'Categorie (voor Budget)', categorie)),
      maak('p', { class: 'gedempt' }, 'Kosten met een categorie tellen als geplande uitgave mee bij Budget.'),
      veld('ac-leeftijd', 'Minimumleeftijd kind (jaar)', leeftijd),
      veld('ac-notitie', 'Notitie', notitie), fout,
      maak('div', { class: 'knoppen' },
        maak('button', { type: 'submit', class: 'knop' }, 'Opslaan'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => dlg.close() }, 'Annuleren'),
        activiteit ? maak('button', { type: 'button', class: 'knop licht gevaar', onclick: async () => {
          if (!confirm('Deze activiteit verwijderen?')) return;
          try {
            await verwijder('activities', activiteit.id);
            d.activiteiten = d.activiteiten.filter((x) => x.id !== activiteit.id);
            dlg.close(); renderDetail(); renderLijst();
          } catch (e) { fout.textContent = e.message; fout.classList.remove('verborgen'); }
        } }, 'Verwijderen') : null));
    dlg = opendialoog(activiteit ? 'Activiteit bewerken' : 'Nieuwe activiteit', form);
  }

  // ---------- Realtime: wijzigingen van de ander verwerken ----------
  let timer;
  const verwerk = async () => {
    if (staat.pad !== 'dagen') return;
    const actief = document.activeElement;
    const bezig = el.querySelector('dialog[open]') ||
      (detailKolom.contains(actief) && /^(INPUT|TEXTAREA|SELECT)$/.test(actief.tagName));
    if (bezig) { timer = setTimeout(verwerk, 1000); return; }   // niet storen tijdens typen
    try { await laden(); } catch { return; }
    render();
  };
  staat.opWijziging = () => { clearTimeout(timer); timer = setTimeout(verwerk, 300); };

  render();
}
