// Meer: reisinstellingen, to-do, leden en back-up
import { laadLeden, nodigUit, exporteerAlles, importeerAlles, bewaarReis, lijst, voegToe, wijzig, verwijder } from '../db.js';
import { uitloggen } from '../auth.js';
import { maak, dagTekst } from '../util.js';
import { opendialoog, veld } from '../dialogen.js';

const TOEGEWEZEN = ['Eric', 'Ilse'];
const FILTERS = [['open', 'Open'], ['klaar', 'Klaar'], ['alle', 'Alle']];
const vandaag = () => new Date().toISOString().slice(0, 10);

export async function toonMeer(el, staat) {
  const reis = staat.reis;
  const tripId = () => reis.id;
  let dagen = [], taken = [];
  const ui = { filter: 'open' };

  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const instellingenKaart = maak('div', { class: 'kaart' });
  const todoKaart = maak('div', { class: 'kaart' });
  const ledenKaart = maak('div', { class: 'kaart' });
  const backupKaart = maak('div', { class: 'kaart' });
  el.replaceChildren(maak('h1', {}, 'Meer'), status, instellingenKaart, todoKaart, ledenKaart, backupKaart,
    maak('button', { type: 'button', class: 'knop licht', onclick: async () => { await uitloggen(); location.reload(); } }, 'Uitloggen'));

  function meld(tekst, fout = false) { status.textContent = tekst; status.className = 'melding' + (fout ? ' fout' : ''); }
  const veilig = async (actie) => { try { await actie(); } catch (e) { meld(e.message, true); } };

  // ---------- reisinstellingen ----------
  function renderInstellingen() {
    const naam = maak('input', { id: 'reis-naam', value: reis.naam });
    const start = maak('input', { id: 'reis-start', type: 'date', value: reis.startdatum || '' });
    const maxrij = maak('input', { id: 'reis-maxrij', type: 'number', min: '1', max: '14', step: '0.5', value: reis.max_rijuren_per_dag ?? 4 });
    instellingenKaart.replaceChildren(
      maak('h2', {}, 'Reisinstellingen'),
      maak('div', { class: 'rij' },
        veld('reis-naam', 'Naam', naam), veld('reis-start', 'Startdatum', start), veld('reis-maxrij', 'Max. rijuren per dag', maxrij)),
      maak('button', { type: 'button', class: 'knop', onclick: () => veilig(async () => {
        const velden = { naam: naam.value, startdatum: start.value || null, max_rijuren_per_dag: Number(maxrij.value) || 4 };
        await bewaarReis(tripId(), velden); Object.assign(reis, velden); meld('Opgeslagen.');
      }) }, 'Opslaan'));
  }

  // ---------- to-do ----------
  const dagLabel = (dag) => `Dag ${dag.dagnummer}` + (dag.datum ? ' · ' + dagTekst(dag.datum) : '') + (dag.titel ? ' · ' + dag.titel : '');
  const dagVanId = (id) => { const dag = dagen.find((x) => x.id === id); return dag ? `Dag ${dag.dagnummer}` : null; };

  async function ladenTaken() {
    const [d, t] = await Promise.all([lijst('days', tripId(), 'dagnummer'), lijst('tasks', tripId())]);
    dagen = d; taken = t;
  }

  function takenGefilterd() {
    const zichtbaar = taken.filter((t) => ui.filter === 'alle' ? true : ui.filter === 'klaar' ? t.klaar : !t.klaar);
    return [...zichtbaar].sort((a, b) => (a.deadline || '9999-99-99').localeCompare(b.deadline || '9999-99-99'));
  }

  function taakRegel(taak) {
    const verlopen = !taak.klaar && taak.deadline && taak.deadline < vandaag();
    const meta = [taak.deadline && dagTekst(taak.deadline), taak.toegewezen_aan, taak.categorie, dagVanId(taak.day_id)]
      .filter(Boolean).join(' · ');
    const vinkId = 'taak-vink-' + taak.id;
    const vink = maak('input', { id: vinkId, type: 'checkbox', checked: taak.klaar, onchange: (ev) => veilig(async () => {
      await wijzig('tasks', taak.id, { klaar: ev.target.checked }); taak.klaar = ev.target.checked; renderTodo();
    }) });

    return maak('li', { class: 'taak-regel' },
      maak('div', { class: 'vinkje' }, vink, maak('label', { for: vinkId, class: 'sr-only' }, `${taak.titel} als klaar markeren`)),
      maak('button', { type: 'button', class: 'taak-titel', onclick: () => vraagTaak(taak) },
        maak('strong', { class: taak.klaar ? 'doorgestreept' : '' }, taak.titel),
        meta ? maak('span', { class: 'gedempt' }, meta) : null),
      verlopen ? maak('span', { class: 'badge nog-boeken' }, 'Verlopen') : null);
  }

  function renderTodo() {
    const chips = maak('div', { class: 'weekchips', role: 'group', 'aria-label': 'Filter taken' },
      FILTERS.map(([w, t]) => maak('button', { type: 'button', class: 'chip', 'aria-pressed': String(w === ui.filter),
        onclick: () => { ui.filter = w; renderTodo(); } }, t)));
    const gefilterd = takenGefilterd();
    const lijstEl = gefilterd.length ? maak('ul', { class: 'lijst' }, gefilterd.map(taakRegel))
      : maak('p', { class: 'gedempt' }, ui.filter === 'klaar' ? 'Nog geen taken afgerond.' : 'Geen open taken.');

    todoKaart.replaceChildren(maak('h2', {}, 'To-do'), chips, lijstEl,
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
      dagen.map((x) => maak('option', { value: x.id }, dagLabel(x))));
    const klaar = maak('input', { id: 'tk-klaar', type: 'checkbox', checked: !!taak?.klaar });

    let dlg;
    const form = maak('form', { method: 'dialog', onsubmit: async (ev) => {
      ev.preventDefault();
      if (!titel.value.trim()) return toonFout('Vul een titel in.');
      const velden = { titel: titel.value.trim(), deadline: deadline.value || null, toegewezen_aan: toegewezen.value || null,
        categorie: categorie.value.trim() || null, day_id: dagSel.value || null, klaar: klaar.checked };
      try {
        if (taak) { await wijzig('tasks', taak.id, velden); Object.assign(taak, velden); }
        else taken.push(await voegToe('tasks', { ...velden, trip_id: tripId() }));
        dlg.close(); renderTodo();
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
            await verwijder('tasks', taak.id); taken = taken.filter((x) => x.id !== taak.id);
            dlg.close(); renderTodo();
          } catch (e) { toonFout(e.message); }
        } }, 'Verwijderen') : null));
    dlg = opendialoog(el, taak ? 'Taak bewerken' : 'Nieuwe taak', form);
  }

  // ---------- leden ----------
  async function renderLeden() {
    let leden;
    try { leden = await laadLeden(tripId()); } catch (e) { meld(e.message, true); return; }
    const email = maak('input', { id: 'led-email', type: 'email', autocomplete: 'off' });
    ledenKaart.replaceChildren(
      maak('h2', {}, 'Leden'),
      maak('ul', { class: 'lijst' }, leden.map((l) =>
        maak('li', {}, `${l.email} (${l.rol}${l.user_id ? '' : ', nog niet ingelogd'})`))),
      veld('led-email', 'E-mailadres om uit te nodigen', email),
      maak('button', { type: 'button', class: 'knop', onclick: () => veilig(async () => {
        await nodigUit(tripId(), email.value); email.value = '';
        meld('Uitgenodigd. Diegene kan nu inloggen met dit e-mailadres.'); await renderLeden();
      }) }, 'Uitnodigen'));
  }

  // ---------- back-up ----------
  function renderBackup() {
    const importVeld = maak('input', { id: 'imp-bestand', type: 'file', accept: 'application/json',
      onchange: async (ev) => {
        try {
          const f = ev.target.files[0]; if (!f) return;
          await importeerAlles(tripId(), JSON.parse(await f.text()));
          meld('Import gelukt.');
        } catch (e) { meld('Import mislukt: ' + e.message, true); }
      } });
    backupKaart.replaceChildren(
      maak('h2', {}, 'Back-up'),
      maak('button', { type: 'button', class: 'knop licht', onclick: async () => {
        try {
          const data = await exporteerAlles(tripId());
          const a = maak('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
            download: `reisplanner-${new Date().toISOString().slice(0, 10)}.json` });
          a.click(); URL.revokeObjectURL(a.href);
        } catch (e) { meld(e.message, true); }
      } }, 'Exporteren (JSON)'),
      veld('imp-bestand', 'Importeren', importVeld));
  }

  // ---------- Realtime ----------
  let timer;
  const verwerk = async () => {
    if (staat.pad !== 'meer') return;
    const actief = document.activeElement;
    if (el.querySelector('dialog[open]') || (actief && el.contains(actief) && /^(INPUT|TEXTAREA|SELECT)$/.test(actief.tagName))) {
      timer = setTimeout(verwerk, 1000); return;
    }
    try { await ladenTaken(); } catch { return; }
    renderTodo();
  };
  staat.opWijziging = () => { clearTimeout(timer); timer = setTimeout(verwerk, 300); };

  renderInstellingen();
  try { await ladenTaken(); renderTodo(); } catch (e) {
    todoKaart.replaceChildren(maak('h2', {}, 'To-do'), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
  }
  await renderLeden();
  renderBackup();
}
