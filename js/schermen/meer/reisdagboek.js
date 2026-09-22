// Reisdagboek: per dag een vrij tekstveld, apart van de planningsnotitie bij Dagen
import { lijst, wijzig } from '../../db.js';
import { maak, dagTekst, terugHeader } from '../../util.js';

export async function toonReisdagboek(el, staat) {
  let dagen = [];
  const tripId = () => staat.reis.id;

  el.replaceChildren(...terugHeader('Reisdagboek'), maak('p', { class: 'gedempt' }, 'Laden…'));
  try { dagen = await lijst('days', tripId(), 'dagnummer'); } catch (e) {
    el.replaceChildren(...terugHeader('Reisdagboek'), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
    return;
  }
  if (staat.pad !== 'meer/reisdagboek') return;

  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const lijstEl = maak('div', {});
  el.replaceChildren(...terugHeader('Reisdagboek'), status,
    dagen.length ? lijstEl : maak('p', { class: 'gedempt' }, 'Nog geen dagen. Maak eerst dagen aan bij Dagen.'));

  function render() {
    lijstEl.replaceChildren(...dagen.map((dag) => {
      const tekst = maak('textarea', { id: 'db-' + dag.id, rows: '3', placeholder: 'Wat gebeurde er deze dag?',
        onchange: async (ev) => {
          try {
            await wijzig('days', dag.id, { dagboek: ev.target.value.trim() || null }); dag.dagboek = ev.target.value.trim() || null;
            status.textContent = 'Opgeslagen.'; status.className = 'melding';
          } catch (e) { status.textContent = e.message; status.className = 'melding fout'; }
        } }, dag.dagboek || '');
      return maak('div', { class: 'kaart' },
        maak('h2', {}, `Dag ${dag.dagnummer}` + (dag.datum ? ' · ' + dagTekst(dag.datum) : '') + (dag.titel ? ' · ' + dag.titel : '')),
        maak('label', { for: 'db-' + dag.id, class: 'sr-only' }, `Dagboek voor dag ${dag.dagnummer}`),
        tekst);
    }));
  }
  let timer;
  const verwerk = async () => {
    if (staat.pad !== 'meer/reisdagboek') return;
    const actief = document.activeElement;
    if (actief && lijstEl.contains(actief) && actief.tagName === 'TEXTAREA') { timer = setTimeout(verwerk, 1000); return; }
    try { dagen = await lijst('days', tripId(), 'dagnummer'); } catch { return; }
    render();
  };
  staat.opWijziging = () => { clearTimeout(timer); timer = setTimeout(verwerk, 300); };

  render();
}
