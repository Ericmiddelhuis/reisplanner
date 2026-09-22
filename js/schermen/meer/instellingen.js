// Reisinstellingen: naam, startdatum, max. rijuren per dag
import { bewaarReis } from '../../db.js';
import { maak, terugHeader } from '../../util.js';
import { veld } from '../../dialogen.js';

export async function toonInstellingen(el, staat) {
  const reis = staat.reis;
  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const naam = maak('input', { id: 'reis-naam', value: reis.naam });
  const start = maak('input', { id: 'reis-start', type: 'date', value: reis.startdatum || '' });
  const maxrij = maak('input', { id: 'reis-maxrij', type: 'number', min: '1', max: '14', step: '0.5', value: reis.max_rijuren_per_dag ?? 4 });

  function meld(tekst, fout = false) { status.textContent = tekst; status.className = 'melding' + (fout ? ' fout' : ''); }

  el.replaceChildren(...terugHeader('Reisinstellingen'), status,
    maak('div', { class: 'kaart' },
      maak('div', { class: 'rij' },
        veld('reis-naam', 'Naam', naam), veld('reis-start', 'Startdatum', start), veld('reis-maxrij', 'Max. rijuren per dag', maxrij)),
      maak('button', { type: 'button', class: 'knop', onclick: async () => {
        try {
          const velden = { naam: naam.value, startdatum: start.value || null, max_rijuren_per_dag: Number(maxrij.value) || 4 };
          await bewaarReis(reis.id, velden); Object.assign(reis, velden); meld('Opgeslagen.');
        } catch (e) { meld(e.message, true); }
      } }, 'Opslaan')));
}
