// Boekingen: vluchten, huurauto, verblijf, activiteiten en parken, met status en kosten.
// Overnachtingen (type verblijf) worden automatisch aangemaakt vanuit Dagen; hier vul je de rest aan.
import { lijst, voegToe, wijzig, verwijder } from '../../db.js';
import { maak, dagTekst, geld, terugHeader } from '../../util.js';
import { opendialoog, veld } from '../../dialogen.js';

export const BOEKING_TYPEN = [['vlucht', 'Vlucht'], ['auto', 'Auto'], ['verblijf', 'Verblijf'],
  ['activiteit', 'Activiteit'], ['park', 'Park']];
export const BOEKING_STATUSSEN = ['idee', 'nog boeken', 'geboekt', 'betaald'];
const FILTERS = [['alle', 'Alle'], ['idee', 'Idee'], ['nog boeken', 'Nog boeken'], ['geboekt', 'Geboekt'], ['betaald', 'Betaald']];

export async function toonBoekingen(el, staat) {
  let d = { boekingen: [], dagen: [] };
  const ui = { filter: 'alle' };
  const tripId = () => staat.reis.id;

  async function laden() {
    const [boekingen, dagen] = await Promise.all([lijst('bookings', tripId()), lijst('days', tripId(), 'dagnummer')]);
    d = { boekingen, dagen };
  }

  el.replaceChildren(...terugHeader('Boekingen'), maak('p', { class: 'gedempt' }, 'Laden…'));
  try { await laden(); } catch (e) {
    el.replaceChildren(...terugHeader('Boekingen'), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
    return;
  }
  if (staat.pad !== 'meer/boekingen') return;

  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const kaart = maak('div', { class: 'kaart' });
  el.replaceChildren(...terugHeader('Boekingen'), status, kaart);

  const dagLabel = (dag) => `Dag ${dag.dagnummer}` + (dag.datum ? ' · ' + dagTekst(dag.datum) : '') + (dag.titel ? ' · ' + dag.titel : '');
  const dagVan = (id) => d.dagen.find((x) => x.id === id);
  const typeNaam = (type) => BOEKING_TYPEN.find(([w]) => w === type)?.[1] || type;

  function gefilterd() {
    const zichtbaar = ui.filter === 'alle' ? d.boekingen : d.boekingen.filter((b) => b.status === ui.filter);
    return [...zichtbaar].sort((a, b) => {
      const da = dagVan(a.day_id)?.dagnummer ?? -1, db_ = dagVan(b.day_id)?.dagnummer ?? -1;
      return da - db_ || a.titel.localeCompare(b.titel);
    });
  }

  function render() {
    const chips = maak('div', { class: 'weekchips', role: 'group', 'aria-label': 'Filter boekingen' },
      FILTERS.map(([w, t]) => maak('button', { type: 'button', class: 'chip', 'aria-pressed': String(w === ui.filter),
        onclick: () => { ui.filter = w; render(); } }, t)));
    const rijen = gefilterd();
    const lijstEl = rijen.length ? maak('ul', { class: 'lijst' }, rijen.map((b) => {
      const dag = dagVan(b.day_id);
      const meta = [typeNaam(b.type), dag && `Dag ${dag.dagnummer}`, b.kosten != null && geld(b.kosten),
        b.bevestigingsnr && 'bevestiging: ' + b.bevestigingsnr, b.annuleringsdatum && 'annuleren vóór ' + dagTekst(b.annuleringsdatum)]
        .filter(Boolean).join(' · ');
      return maak('li', {}, maak('button', { type: 'button', class: 'activiteit', onclick: () => vraagBoeking(b) },
        maak('strong', {}, b.titel),
        meta ? maak('span', { class: 'gedempt' }, meta) : null,
        maak('span', { class: 'badge ' + b.status.replace(' ', '-') }, b.status)));
    })) : maak('p', { class: 'gedempt' }, 'Nog geen boekingen.');

    kaart.replaceChildren(chips, lijstEl,
      maak('button', { type: 'button', class: 'knop licht', onclick: () => vraagBoeking(null) }, '+ Boeking toevoegen'));
  }

  function vraagBoeking(boeking) {
    const fout = maak('p', { class: 'melding fout verborgen', role: 'alert' });
    const toonFout = (t) => { fout.textContent = t; fout.classList.remove('verborgen'); };
    const type = maak('select', { id: 'bk-type', value: boeking?.type || 'vlucht' },
      BOEKING_TYPEN.map(([w, t]) => maak('option', { value: w }, t)));
    const titel = maak('input', { id: 'bk-titel', required: true, value: boeking?.titel || '' });
    const statusSel = maak('select', { id: 'bk-status', value: boeking?.status || 'idee' },
      BOEKING_STATUSSEN.map((s) => maak('option', { value: s }, s[0].toUpperCase() + s.slice(1))));
    const dagSel = maak('select', { id: 'bk-dag', value: boeking?.day_id || '' }, maak('option', { value: '' }, '— geen dag —'),
      d.dagen.map((x) => maak('option', { value: x.id }, dagLabel(x))));
    const kosten = maak('input', { id: 'bk-kosten', type: 'number', min: '0', step: '0.01', inputmode: 'decimal', value: boeking?.kosten ?? '' });
    const bevestiging = maak('input', { id: 'bk-bevestiging', value: boeking?.bevestigingsnr || '' });
    const annulering = maak('input', { id: 'bk-annulering', type: 'date', value: boeking?.annuleringsdatum || '' });

    let dlg;
    const form = maak('form', { method: 'dialog', onsubmit: async (ev) => {
      ev.preventDefault();
      const velden = { type: type.value, titel: titel.value.trim(), status: statusSel.value, day_id: dagSel.value || null,
        kosten: kosten.value === '' ? null : Number(kosten.value), bevestigingsnr: bevestiging.value.trim() || null,
        annuleringsdatum: annulering.value || null };
      try {
        if (boeking) { await wijzig('bookings', boeking.id, velden); Object.assign(boeking, velden); }
        else d.boekingen.push(await voegToe('bookings', { ...velden, trip_id: tripId() }));
        dlg.close(); render();
      } catch (e) { toonFout(e.message); }
    } },
      maak('div', { class: 'rij' }, veld('bk-type', 'Type', type), veld('bk-status', 'Status', statusSel)),
      veld('bk-titel', 'Titel', titel),
      maak('div', { class: 'rij' }, veld('bk-dag', 'Gekoppelde dag (optioneel)', dagSel), veld('bk-kosten', 'Kosten (EUR)', kosten)),
      maak('div', { class: 'rij' }, veld('bk-bevestiging', 'Bevestigingsnummer (optioneel)', bevestiging),
        veld('bk-annulering', 'Gratis annuleren tot (optioneel)', annulering)),
      fout,
      maak('div', { class: 'knoppen' },
        maak('button', { type: 'submit', class: 'knop' }, 'Opslaan'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => dlg.close() }, 'Annuleren'),
        boeking ? maak('button', { type: 'button', class: 'knop licht gevaar', onclick: async () => {
          if (!confirm('Deze boeking verwijderen?')) return;
          try {
            await verwijder('bookings', boeking.id); d.boekingen = d.boekingen.filter((x) => x.id !== boeking.id);
            dlg.close(); render();
          } catch (e) { toonFout(e.message); }
        } }, 'Verwijderen') : null));
    dlg = opendialoog(el, boeking ? 'Boeking bewerken' : 'Nieuwe boeking', form);
  }

  let timer;
  const verwerk = async () => {
    if (staat.pad !== 'meer/boekingen') return;
    const actief = document.activeElement;
    if (el.querySelector('dialog[open]') || (actief && el.contains(actief) && /^(INPUT|TEXTAREA|SELECT)$/.test(actief.tagName))) {
      timer = setTimeout(verwerk, 1000); return;
    }
    try { await laden(); } catch { return; }
    render();
  };
  staat.opWijziging = () => { clearTimeout(timer); timer = setTimeout(verwerk, 300); };

  render();
}
