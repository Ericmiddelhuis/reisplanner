// Noodinfo: gedeeld tekstveld met alarmnummers, ambassade en verzekeraar. Vanaf stap 8 ook offline beschikbaar.
import { bewaarReis } from '../../db.js';
import { maak, terugHeader } from '../../util.js';

export async function toonNoodinfo(el, staat) {
  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const tekst = maak('textarea', { id: 'ni-tekst', rows: '10',
    placeholder: 'Bijv.:\nAlarmnummer Namibië: …\nAlarmnummer Botswana: …\nNederlandse ambassade Windhoek: …\nVerzekeraar alarmcentrale: …\nContactpersoon thuis (ICE): …' },
    staat.reis.noodinfo || '');

  el.replaceChildren(...terugHeader('Noodinfo'), status,
    maak('p', { class: 'melding fout' }, 'Vul deze gegevens zelf in en controleer ze vlak vóór vertrek: nummers en adressen kunnen wijzigen.'),
    maak('div', { class: 'kaart' }, tekst,
      maak('button', { type: 'button', class: 'knop', onclick: async () => {
        try {
          await bewaarReis(staat.reis.id, { noodinfo: tekst.value.trim() || null });
          staat.reis.noodinfo = tekst.value.trim() || null;
          status.textContent = 'Opgeslagen.'; status.className = 'melding';
        } catch (e) { status.textContent = e.message; status.className = 'melding fout'; }
      } }, 'Opslaan')));
}
