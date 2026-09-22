// To-do: taken met deadline, toewijzing, categorie en optionele koppeling aan een dag
import { lijst, voegToe, wijzig, verwijder } from '../db.js';
import { maak, dagTekst } from '../util.js';
import { opendialoog, veld } from '../dialogen.js';

const TOEGEWEZEN = ['Eric', 'Ilse'];
const FILTERS = [['open', 'Open'], ['klaar', 'Klaar'], ['alle', 'Alle']];
const vandaag = () => new Date().toISOString().slice(0, 10);

export async function toonTodo(el, staat) {
  let d = { dagen: [], taken: [] };
  const ui = { filter: 'open' };
  const tripId = () => staat.reis.id;

  async function laden() {
    const [dagen, taken] = await Promise.all([lijst('days', tripId(), 'dagnummer'), lijst('tasks', tripId())]);
    d = { dagen, taken };
  }

  el.replaceChildren(maak('h1', {}, 'To-do'), maak('p', { class: 'gedempt' }, 'Laden…'));
  try { await laden(); } catch (e) {
    el.replaceChildren(maak('h1', {}, 'To-do'), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
    return;
  }
  if (staat.pad !== 'todo') return;

  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const lijstKaart = maak('div', { class: 'kaart' });
  el.replaceChildren(maak('h1', {}, 'To-do'), status, lijstKaart);

  function meld(tekst, fout = false) { status.textContent = tekst; status.className = 'melding' + (fout ? ' fout' : ''); }
  const veilig = async (actie) => { try { await actie(); } catch (e) { meld(e.message, true); } };

  const dagLabel = (dag) => `Dag ${dag.dagnummer}` + (dag.datum ? ' · ' + dagTekst(dag.datum) : '') + (dag.titel ? ' · ' + dag.titel : '');
  const dagVanId = (id) => { const dag = d.dagen.find((x) => x.id === id); return dag ? `Dag ${dag.dagnummer}` : null; };

  function takenGefilterd() {
    const zichtbaar = d.taken.filter((t) => ui.filter === 'alle' ? true : ui.filter === 'klaar' ? t.klaar : !t.klaar);
    return [...zichtbaar].sort((a, b) => (a.deadline || '9999-99-99').localeCompare(b.deadline || '9999-99-99'));
  }

  function taakRegel(taak) {
    const verlopen = !taak.klaar && taak.deadline && taak.deadline < vandaag();
    const meta = [taak.deadline && dagTekst(taak.deadline), taak.toegewezen_aan, taak.categorie, dagVanId(taak.day_id)]
      .filter(Boolean).join(' · ');
    const vinkId = 'taak-vink-' + taak.id;
    const vink = maak('input', { id: vinkId, type: 'checkbox', checked: taak.klaar, onchange: (ev) => veilig(async () => {
      await wijzig('tasks', taak.id, { klaar: ev.target.checked }); taak.klaar = ev.target.checked; render();
    }) });

    return maak('li', { class: 'taak-regel' },
      maak('div', { class: 'vinkje' }, vink, maak('label', { for: vinkId, class: 'sr-only' }, `${taak.titel} als klaar markeren`)),
      maak('button', { type: 'button', class: 'taak-titel', onclick: () => vraagTaak(taak) },
        maak('strong', { class: taak.klaar ? 'doorgestreept' : '' }, taak.titel),
        meta ? maak('span', { class: 'gedempt' }, meta) : null),
      verlopen ? maak('span', { class: 'badge nog-boeken' }, 'Verlopen') : null);
  }

  function render() {
    const chips = maak('div', { class: 'weekchips', role: 'group', 'aria-label': 'Filter taken' },
      FILTERS.map(([w, t]) => maak('button', { type: 'button', class: 'chip', 'aria-pressed': String(w === ui.filter),
        onclick: () => { ui.filter = w; render(); } }, t)));
    const gefilterd = takenGefilterd();
    const lijstEl = gefilterd.length ? maak('ul', { class: 'lijst' }, gefilterd.map(taakRegel))
      : maak('p', { class: 'gedempt' }, ui.filter === 'klaar' ? 'Nog geen taken afgerond.' : 'Geen open taken.');

    lijstKaart.replaceChildren(chips, lijstEl,
      maak('button', { type: 'button', class: 'knop licht', onclick: () => vraagTaak(null) }, '+ Taak toevoegen'));
  }

  function vraagTaak(taak) {
    const fout = maak('p', { class: 'melding fout verborgen', role: 'alert' });
    const toonFout = (t) => { fout.textContent = t; fout.classList.remove('verborgen'); };
    const titel = maak('input', { id: 'tk-titel', required: true, value: taak?.titel || '' });
    const deadline = maak('input', { id: 'tk-deadline', type: 'date', value: taak?.deadline || '' });
    const toegewezen = maak('select', { id: 'tk-toegewezen', value: taak?.toegewezen_aan || '' },
      maak('option', { value: '' }, '— niemand —'), TOEGEWEZEN.map((p) => maak('option', { value: p }, p)));
    const categorie = maak('input', { id: 'tk-categorie', value: taak?.categorie || '', placeholder: 'bijv. Visum/grens' });
    const dagSel = maak('select', { id: 'tk-dag', value: taak?.day_id || '' }, maak('option', { value: '' }, '— geen dag —'),
      d.dagen.map((x) => maak('option', { value: x.id }, dagLabel(x))));
    const klaar = maak('input', { id: 'tk-klaar', type: 'checkbox', checked: !!taak?.klaar });

    let dlg;
    const form = maak('form', { method: 'dialog', onsubmit: async (ev) => {
      ev.preventDefault();
      if (!titel.value.trim()) return toonFout('Vul een titel in.');
      const velden = { titel: titel.value.trim(), deadline: deadline.value || null, toegewezen_aan: toegewezen.value || null,
        categorie: categorie.value.trim() || null, day_id: dagSel.value || null, klaar: klaar.checked };
      try {
        if (taak) { await wijzig('tasks', taak.id, velden); Object.assign(taak, velden); }
        else d.taken.push(await voegToe('tasks', { ...velden, trip_id: tripId() }));
        dlg.close(); render();
      } catch (e) { toonFout(e.message); }
    } },
      veld('tk-titel', 'Titel', titel),
      maak('div', { class: 'rij' }, veld('tk-deadline', 'Deadline (optioneel)', deadline), veld('tk-toegewezen', 'Toegewezen aan', toegewezen)),
      maak('div', { class: 'rij' }, veld('tk-categorie', 'Categorie (optioneel)', categorie), veld('tk-dag', 'Gekoppelde dag (optioneel)', dagSel)),
      maak('div', { class: 'vinkje' }, klaar, maak('label', { for: 'tk-klaar' }, 'Klaar')), fout,
      maak('div', { class: 'knoppen' },
        maak('button', { type: 'submit', class: 'knop' }, 'Opslaan'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => dlg.close() }, 'Annuleren'),
        taak ? maak('button', { type: 'button', class: 'knop licht gevaar', onclick: async () => {
          if (!confirm('Deze taak verwijderen?')) return;
          try {
            await verwijder('tasks', taak.id); d.taken = d.taken.filter((x) => x.id !== taak.id);
            dlg.close(); render();
          } catch (e) { toonFout(e.message); }
        } }, 'Verwijderen') : null));
    dlg = opendialoog(el, taak ? 'Taak bewerken' : 'Nieuwe taak', form);
  }

  // ---------- Realtime ----------
  let timer;
  const verwerk = async () => {
    if (staat.pad !== 'todo') return;
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
