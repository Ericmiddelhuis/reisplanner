// Links: nuttige URL's, optioneel gekoppeld aan een dag, plaats of taak
import { lijst, voegToe, wijzig, verwijder } from '../../db.js';
import { maak, dagTekst, terugHeader } from '../../util.js';
import { opendialoog, veld } from '../../dialogen.js';

export async function toonLinks(el, staat) {
  let d = { links: [], dagen: [], plaatsen: [], taken: [] };
  const tripId = () => staat.reis.id;

  async function laden() {
    const [links, dagen, plaatsen, taken] = await Promise.all([
      lijst('links', tripId()), lijst('days', tripId(), 'dagnummer'), lijst('places', tripId(), 'naam'), lijst('tasks', tripId())]);
    d = { links, dagen, plaatsen, taken };
  }

  el.replaceChildren(...terugHeader('Links'), maak('p', { class: 'gedempt' }, 'Laden…'));
  try { await laden(); } catch (e) {
    el.replaceChildren(...terugHeader('Links'), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
    return;
  }
  if (staat.pad !== 'meer/links') return;

  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const kaart = maak('div', { class: 'kaart' });
  el.replaceChildren(...terugHeader('Links'), status, kaart);

  const dagLabel = (dag) => `Dag ${dag.dagnummer}` + (dag.datum ? ' · ' + dagTekst(dag.datum) : '') + (dag.titel ? ' · ' + dag.titel : '');
  const gekoppeldAan = (link) => {
    const dag = d.dagen.find((x) => x.id === link.day_id);
    const plaats = d.plaatsen.find((x) => x.id === link.place_id);
    const taak = d.taken.find((x) => x.id === link.task_id);
    return [dag && `Dag ${dag.dagnummer}`, plaats?.naam, taak?.titel].filter(Boolean).join(' · ');
  };

  function render() {
    const gesorteerd = [...d.links].sort((a, b) =>
      (a.categorie || '').localeCompare(b.categorie || '') || (a.titel || a.url).localeCompare(b.titel || b.url));
    kaart.replaceChildren(
      gesorteerd.length ? maak('ul', { class: 'lijst' }, gesorteerd.map((link) => {
        const meta = [link.categorie, gekoppeldAan(link)].filter(Boolean).join(' · ');
        return maak('li', { class: 'link-regel' },
          maak('a', { class: 'link-titel', href: link.url, target: '_blank', rel: 'noopener noreferrer' },
            maak('strong', {}, link.titel || link.url),
            meta ? maak('span', { class: 'gedempt' }, meta) : null),
          maak('button', { type: 'button', class: 'knop licht', onclick: () => vraagLink(link) }, 'Bewerken'));
      })) : maak('p', { class: 'gedempt' }, 'Nog geen links.'),
      maak('button', { type: 'button', class: 'knop licht', onclick: () => vraagLink(null) }, '+ Link toevoegen'));
  }

  function vraagLink(link) {
    const fout = maak('p', { class: 'melding fout verborgen', role: 'alert' });
    const toonFout = (t) => { fout.textContent = t; fout.classList.remove('verborgen'); };
    const url = maak('input', { id: 'lk-url', type: 'text', required: true, placeholder: 'https://…', value: link?.url || '' });
    const titel = maak('input', { id: 'lk-titel', value: link?.titel || '' });
    const categorie = maak('input', { id: 'lk-categorie', value: link?.categorie || '', placeholder: 'bijv. Inspiratie' });
    const dagSel = maak('select', { id: 'lk-dag', value: link?.day_id || '' }, maak('option', { value: '' }, '— geen dag —'),
      d.dagen.map((x) => maak('option', { value: x.id }, dagLabel(x))));
    const plaatsSel = maak('select', { id: 'lk-plaats', value: link?.place_id || '' }, maak('option', { value: '' }, '— geen plaats —'),
      d.plaatsen.map((p) => maak('option', { value: p.id }, p.naam)));
    const taakSel = maak('select', { id: 'lk-taak', value: link?.task_id || '' }, maak('option', { value: '' }, '— geen taak —'),
      d.taken.map((t) => maak('option', { value: t.id }, t.titel)));

    let dlg;
    const form = maak('form', { method: 'dialog', onsubmit: async (ev) => {
      ev.preventDefault();
      let href = url.value.trim();
      if (!href) return toonFout('Vul een URL in.');
      if (!/^https?:\/\//i.test(href)) href = 'https://' + href;
      const velden = { url: href, titel: titel.value.trim() || null, categorie: categorie.value.trim() || null,
        day_id: dagSel.value || null, place_id: plaatsSel.value || null, task_id: taakSel.value || null };
      try {
        if (link) { await wijzig('links', link.id, velden); Object.assign(link, velden); }
        else d.links.push(await voegToe('links', { ...velden, trip_id: tripId() }));
        dlg.close(); render();
      } catch (e) { toonFout(e.message); }
    } },
      veld('lk-url', 'URL', url),
      veld('lk-titel', 'Titel (optioneel)', titel),
      veld('lk-categorie', 'Categorie (optioneel)', categorie),
      maak('div', { class: 'rij' }, veld('lk-dag', 'Koppel aan dag', dagSel), veld('lk-plaats', 'Koppel aan plaats', plaatsSel)),
      veld('lk-taak', 'Koppel aan taak', taakSel), fout,
      maak('div', { class: 'knoppen' },
        maak('button', { type: 'submit', class: 'knop' }, 'Opslaan'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => dlg.close() }, 'Annuleren'),
        link ? maak('button', { type: 'button', class: 'knop licht gevaar', onclick: async () => {
          if (!confirm('Deze link verwijderen?')) return;
          try { await verwijder('links', link.id); d.links = d.links.filter((x) => x.id !== link.id); dlg.close(); render(); }
          catch (e) { toonFout(e.message); }
        } }, 'Verwijderen') : null));
    dlg = opendialoog(el, link ? 'Link bewerken' : 'Nieuwe link', form);
  }

  let timer;
  const verwerk = async () => {
    if (staat.pad !== 'meer/links') return;
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
