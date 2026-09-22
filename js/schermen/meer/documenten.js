// Documenten: alleen type, vervaldatum, status en notitie. Nooit een documentnummer opslaan (privacy).
import { lijst, voegToe, wijzig, verwijder } from '../../db.js';
import { maak, dagTekst, terugHeader } from '../../util.js';
import { opendialoog, veld } from '../../dialogen.js';

export const PERSONEN = ['Eric', 'Ilse', 'Kind'];
export const DOCUMENT_TYPEN = [['paspoort', 'Paspoort'], ['visum', 'Visum'], ['rijbewijs', 'Rijbewijs'], ['verzekering', 'Verzekering']];
// Namibië (en veel andere landen) eisen vaak een paspoort dat bij aankomst nog minstens 6 maanden geldig is
const BINNENKORT_DAGEN = 183;
const vandaag = () => new Date().toISOString().slice(0, 10);
const dagenTot = (datum) => Math.round((new Date(datum + 'T00:00:00') - new Date(vandaag() + 'T00:00:00')) / 86400000);

export async function toonDocumenten(el, staat) {
  let documenten = [];
  const tripId = () => staat.reis.id;

  el.replaceChildren(...terugHeader('Documenten'), maak('p', { class: 'gedempt' }, 'Laden…'));
  try { documenten = await lijst('documents', tripId()); } catch (e) {
    el.replaceChildren(...terugHeader('Documenten'), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
    return;
  }
  if (staat.pad !== 'meer/documenten') return;

  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const kaart = maak('div', { class: 'kaart' });
  el.replaceChildren(...terugHeader('Documenten'), status, kaart);

  const typeNaam = (type) => DOCUMENT_TYPEN.find(([w]) => w === type)?.[1] || type;

  function render() {
    const gesorteerd = [...documenten].sort((a, b) => (a.persoon || '').localeCompare(b.persoon || '') || (a.type || '').localeCompare(b.type || ''));
    const lijstEl = gesorteerd.length ? maak('ul', { class: 'lijst' }, gesorteerd.map((doc) => {
      const meta = [typeNaam(doc.type), doc.vervaldatum && 'geldig tot ' + dagTekst(doc.vervaldatum), doc.status].filter(Boolean).join(' · ');
      let badge = null;
      if (doc.vervaldatum) {
        const dagen = dagenTot(doc.vervaldatum);
        if (dagen < 0) badge = maak('span', { class: 'badge nog-boeken' }, 'Verlopen');
        else if (dagen <= BINNENKORT_DAGEN) badge = maak('span', { class: 'badge nog-boeken' }, 'Verloopt binnenkort');
      }
      return maak('li', {}, maak('button', { type: 'button', class: 'activiteit', onclick: () => vraagDocument(doc) },
        maak('strong', {}, doc.persoon || 'Onbekend'),
        meta ? maak('span', { class: 'gedempt' }, meta) : null,
        doc.notitie ? maak('span', { class: 'gedempt' }, doc.notitie) : null,
        badge));
    })) : maak('p', { class: 'gedempt' }, 'Nog geen documenten.');
    kaart.replaceChildren(lijstEl,
      maak('button', { type: 'button', class: 'knop licht', onclick: () => vraagDocument(null) }, '+ Document toevoegen'));
  }

  function vraagDocument(doc) {
    const fout = maak('p', { class: 'melding fout verborgen', role: 'alert' });
    const toonFout = (t) => { fout.textContent = t; fout.classList.remove('verborgen'); };
    const persoon = maak('select', { id: 'dc-persoon', value: doc?.persoon || '' }, maak('option', { value: '' }, '— kies —'),
      PERSONEN.map((p) => maak('option', { value: p }, p)));
    const type = maak('select', { id: 'dc-type', value: doc?.type || '' }, maak('option', { value: '' }, '— kies —'),
      DOCUMENT_TYPEN.map(([w, t]) => maak('option', { value: w }, t)));
    const vervaldatum = maak('input', { id: 'dc-vervaldatum', type: 'date', value: doc?.vervaldatum || '' });
    const statusVeld = maak('input', { id: 'dc-status', value: doc?.status || '', placeholder: 'bijv. in bezit, e-visum aangevraagd' });
    const notitie = maak('textarea', { id: 'dc-notitie', rows: '2' }, doc?.notitie || '');

    let dlg;
    const form = maak('form', { method: 'dialog', onsubmit: async (ev) => {
      ev.preventDefault();
      const velden = { persoon: persoon.value || null, type: type.value || null, vervaldatum: vervaldatum.value || null,
        status: statusVeld.value.trim() || null, notitie: notitie.value.trim() || null };
      try {
        if (doc) { await wijzig('documents', doc.id, velden); Object.assign(doc, velden); }
        else documenten.push(await voegToe('documents', { ...velden, trip_id: tripId() }));
        dlg.close(); render();
      } catch (e) { toonFout(e.message); }
    } },
      maak('div', { class: 'rij' }, veld('dc-persoon', 'Persoon', persoon), veld('dc-type', 'Type', type)),
      veld('dc-vervaldatum', 'Vervaldatum (optioneel)', vervaldatum),
      veld('dc-status', 'Status (optioneel)', statusVeld),
      veld('dc-notitie', 'Notitie (optioneel)', notitie),
      maak('p', { class: 'gedempt' }, 'Nooit een documentnummer invullen: alleen type, vervaldatum en status.'), fout,
      maak('div', { class: 'knoppen' },
        maak('button', { type: 'submit', class: 'knop' }, 'Opslaan'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => dlg.close() }, 'Annuleren'),
        doc ? maak('button', { type: 'button', class: 'knop licht gevaar', onclick: async () => {
          if (!confirm('Dit document verwijderen?')) return;
          try { await verwijder('documents', doc.id); documenten = documenten.filter((x) => x.id !== doc.id); dlg.close(); render(); }
          catch (e) { toonFout(e.message); }
        } }, 'Verwijderen') : null));
    dlg = opendialoog(el, doc ? 'Document bewerken' : 'Nieuw document', form);
  }

  let timer;
  const verwerk = async () => {
    if (staat.pad !== 'meer/documenten') return;
    const actief = document.activeElement;
    if (el.querySelector('dialog[open]') || (actief && el.contains(actief) && /^(INPUT|TEXTAREA|SELECT)$/.test(actief.tagName))) {
      timer = setTimeout(verwerk, 1000); return;
    }
    try { documenten = await lijst('documents', tripId()); } catch { return; }
    render();
  };
  staat.opWijziging = () => { clearTimeout(timer); timer = setTimeout(verwerk, 300); };

  render();
}
