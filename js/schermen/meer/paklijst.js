// Paklijst: items per groep, voor wie, en of het al is ingepakt
import { lijst, voegToe, wijzig, verwijder } from '../../db.js';
import { maak, terugHeader } from '../../util.js';
import { opendialoog, veld } from '../../dialogen.js';

export const VOOR_WIE = ['Eric', 'Ilse', 'Milo', 'Iedereen'];
const FILTERS = [['open', 'Nog inpakken'], ['ingepakt', 'Ingepakt'], ['alle', 'Alle']];

export async function toonPaklijst(el, staat) {
  let items = [];
  const ui = { filter: 'open' };
  const tripId = () => staat.reis.id;

  el.replaceChildren(...terugHeader('Paklijst'), maak('p', { class: 'gedempt' }, 'Laden…'));
  try { items = await lijst('packing_items', tripId()); } catch (e) {
    el.replaceChildren(...terugHeader('Paklijst'), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
    return;
  }
  if (staat.pad !== 'meer/paklijst') return;

  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const kaart = maak('div', { class: 'kaart' });
  el.replaceChildren(...terugHeader('Paklijst'), status, kaart);
  const veilig = async (actie) => { try { await actie(); } catch (e) { status.textContent = e.message; status.className = 'melding fout'; } };

  function gefilterd() {
    const zichtbaar = items.filter((x) => ui.filter === 'alle' ? true : ui.filter === 'ingepakt' ? x.ingepakt : !x.ingepakt);
    return [...zichtbaar].sort((a, b) => (a.groep || '').localeCompare(b.groep || '') || a.titel.localeCompare(b.titel));
  }

  function itemRegel(item) {
    const meta = [item.groep, item.voor_wie].filter(Boolean).join(' · ');
    const vinkId = 'pak-vink-' + item.id;
    const vink = maak('input', { id: vinkId, type: 'checkbox', checked: item.ingepakt, onchange: (ev) => veilig(async () => {
      await wijzig('packing_items', item.id, { ingepakt: ev.target.checked }); item.ingepakt = ev.target.checked; render();
    }) });
    return maak('li', { class: 'taak-regel' },
      maak('div', { class: 'vinkje' }, vink, maak('label', { for: vinkId, class: 'sr-only' }, `${item.titel} als ingepakt markeren`)),
      maak('button', { type: 'button', class: 'taak-titel', onclick: () => vraagItem(item) },
        maak('strong', { class: item.ingepakt ? 'doorgestreept' : '' }, item.titel),
        meta ? maak('span', { class: 'gedempt' }, meta) : null));
  }

  function render() {
    const chips = maak('div', { class: 'weekchips', role: 'group', 'aria-label': 'Filter paklijst' },
      FILTERS.map(([w, t]) => maak('button', { type: 'button', class: 'chip', 'aria-pressed': String(w === ui.filter),
        onclick: () => { ui.filter = w; render(); } }, t)));
    const gefiltered = gefilterd();
    const lijstEl = gefiltered.length ? maak('ul', { class: 'lijst' }, gefiltered.map(itemRegel))
      : maak('p', { class: 'gedempt' }, ui.filter === 'ingepakt' ? 'Nog niets ingepakt.' : 'Niets meer in te pakken.');
    kaart.replaceChildren(chips, lijstEl,
      maak('button', { type: 'button', class: 'knop licht', onclick: () => vraagItem(null) }, '+ Item toevoegen'));
  }

  function vraagItem(item) {
    const fout = maak('p', { class: 'melding fout verborgen', role: 'alert' });
    const toonFout = (t) => { fout.textContent = t; fout.classList.remove('verborgen'); };
    const titel = maak('input', { id: 'pk-titel', required: true, value: item?.titel || '' });
    const groep = maak('input', { id: 'pk-groep', value: item?.groep || '', placeholder: 'bijv. Kleding' });
    const voorWie = maak('select', { id: 'pk-wie', value: item?.voor_wie || '' }, maak('option', { value: '' }, '— iedereen —'),
      VOOR_WIE.map((w) => maak('option', { value: w }, w)));
    const ingepakt = maak('input', { id: 'pk-ingepakt', type: 'checkbox', checked: !!item?.ingepakt });

    let dlg;
    const form = maak('form', { method: 'dialog', onsubmit: async (ev) => {
      ev.preventDefault();
      const velden = { titel: titel.value.trim(), groep: groep.value.trim() || null, voor_wie: voorWie.value || null,
        ingepakt: ingepakt.checked };
      try {
        if (item) { await wijzig('packing_items', item.id, velden); Object.assign(item, velden); }
        else items.push(await voegToe('packing_items', { ...velden, trip_id: tripId() }));
        dlg.close(); render();
      } catch (e) { toonFout(e.message); }
    } },
      veld('pk-titel', 'Titel', titel),
      maak('div', { class: 'rij' }, veld('pk-groep', 'Groep (optioneel)', groep), veld('pk-wie', 'Voor wie', voorWie)),
      maak('div', { class: 'vinkje' }, ingepakt, maak('label', { for: 'pk-ingepakt' }, 'Ingepakt')), fout,
      maak('div', { class: 'knoppen' },
        maak('button', { type: 'submit', class: 'knop' }, 'Opslaan'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => dlg.close() }, 'Annuleren'),
        item ? maak('button', { type: 'button', class: 'knop licht gevaar', onclick: async () => {
          if (!confirm('Dit item verwijderen?')) return;
          try { await verwijder('packing_items', item.id); items = items.filter((x) => x.id !== item.id); dlg.close(); render(); }
          catch (e) { toonFout(e.message); }
        } }, 'Verwijderen') : null));
    dlg = opendialoog(el, item ? 'Item bewerken' : 'Nieuw item', form);
  }

  let timer;
  const verwerk = async () => {
    if (staat.pad !== 'meer/paklijst') return;
    const actief = document.activeElement;
    if (el.querySelector('dialog[open]') || (actief && el.contains(actief) && /^(INPUT|TEXTAREA|SELECT)$/.test(actief.tagName))) {
      timer = setTimeout(verwerk, 1000); return;
    }
    try { items = await lijst('packing_items', tripId()); } catch { return; }
    render();
  };
  staat.opWijziging = () => { clearTimeout(timer); timer = setTimeout(verwerk, 300); };

  render();
}
