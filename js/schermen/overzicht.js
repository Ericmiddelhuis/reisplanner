// Overzicht: countdown en gedeelde notities (los van elkaar, elk met een datumstempel)
import { lijst, voegToe, wijzig, verwijder } from '../db.js';
import { maak, dagTijd } from '../util.js';
import { opendialoog, veld } from '../dialogen.js';

function dagenTot(datum) {
  if (!datum) return null;
  const nu = new Date(); nu.setHours(0, 0, 0, 0);
  return Math.round((new Date(datum + 'T00:00:00') - nu) / 86400000);
}

export async function toonOverzicht(el, staat) {
  const reis = staat.reis;
  const tripId = () => reis.id;
  let notities = [];

  el.replaceChildren(maak('h1', {}, reis.naam), maak('p', { class: 'gedempt' }, 'Laden…'));
  try { notities = await lijst('notities', tripId()); } catch (e) {
    el.replaceChildren(maak('h1', {}, reis.naam), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
    return;
  }
  if (staat.pad !== 'overzicht') return;

  const d = dagenTot(reis.startdatum);
  const countdownTekst = d === null ? 'Startdatum nog niet ingesteld'
    : d > 0 ? `nog ${d} ${d === 1 ? 'dag' : 'dagen'} tot vertrek`
    : d === 0 ? 'Vandaag vertrekken jullie!' : 'De reis is begonnen';

  const notitiesKaart = maak('div', { class: 'kaart' });
  el.replaceChildren(
    maak('h1', {}, reis.naam),
    maak('div', { class: 'kaart' },
      maak('div', { class: 'countdown', id: 'countdown' }, d !== null && d > 0 ? String(d) : ''),
      maak('p', { class: 'gedempt' }, countdownTekst)),
    maak('h2', {}, 'Notities'), notitiesKaart);

  async function laden() { notities = await lijst('notities', tripId()); }

  function render() {
    const gesorteerd = [...notities].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    notitiesKaart.replaceChildren(
      gesorteerd.length ? maak('ul', { class: 'lijst' }, gesorteerd.map((n) => maak('li', {},
        maak('button', { type: 'button', class: 'activiteit', onclick: () => vraagNotitie(n) },
          maak('strong', {}, n.tekst),
          maak('span', { class: 'gedempt' }, dagTijd(n.created_at))))))
        : maak('p', { class: 'gedempt' }, 'Nog geen notities.'),
      maak('button', { type: 'button', class: 'knop licht', onclick: () => vraagNotitie(null) }, '+ Notitie toevoegen'));
  }

  function vraagNotitie(notitie) {
    const fout = maak('p', { class: 'melding fout verborgen', role: 'alert' });
    const toonFout = (t) => { fout.textContent = t; fout.classList.remove('verborgen'); };
    const tekst = maak('textarea', { id: 'nt-tekst', rows: '3', required: true }, notitie?.tekst || '');

    let dlg;
    const form = maak('form', { method: 'dialog', onsubmit: async (ev) => {
      ev.preventDefault();
      const waarde = tekst.value.trim();
      if (!waarde) return toonFout('Vul een notitie in.');
      try {
        if (notitie) { await wijzig('notities', notitie.id, { tekst: waarde }); notitie.tekst = waarde; }
        else notities.push(await voegToe('notities', { trip_id: tripId(), tekst: waarde }));
        dlg.close(); render();
      } catch (e) { toonFout(e.message); }
    } },
      veld('nt-tekst', 'Notitie', tekst), fout,
      maak('div', { class: 'knoppen' },
        maak('button', { type: 'submit', class: 'knop' }, 'Opslaan'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => dlg.close() }, 'Annuleren'),
        notitie ? maak('button', { type: 'button', class: 'knop licht gevaar', onclick: async () => {
          if (!confirm('Deze notitie verwijderen?')) return;
          try {
            await verwijder('notities', notitie.id); notities = notities.filter((x) => x.id !== notitie.id);
            dlg.close(); render();
          } catch (e) { toonFout(e.message); }
        } }, 'Verwijderen') : null));
    dlg = opendialoog(el, notitie ? 'Notitie bewerken' : 'Nieuwe notitie', form);
  }

  // Realtime: nieuwe of gewijzigde notities van de ander verschijnen vanzelf
  let timer;
  const verwerk = async () => {
    if (staat.pad !== 'overzicht') return;
    if (el.querySelector('dialog[open]')) { timer = setTimeout(verwerk, 1000); return; }
    try { await laden(); } catch { return; }
    render();
  };
  staat.opWijziging = () => { clearTimeout(timer); timer = setTimeout(verwerk, 300); };

  render();
}
