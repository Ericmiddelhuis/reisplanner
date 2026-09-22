// Gezondheid: gedeeld tekstveld voor vaccinaties, allergieën en medicatie per persoon
import { bewaarReis } from '../../db.js';
import { maak, terugHeader } from '../../util.js';

export async function toonGezondheid(el, staat) {
  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const tekst = maak('textarea', { id: 'gz-tekst', rows: '10',
    placeholder: 'Bijv.:\nEric: geen bijzonderheden.\nIlse: penicilline-allergie.\nMilo: pinda-allergie, EpiPen in de rugzak.\n\nMalariapreventie: welk middel, vanaf welke datum.\nVaccinaties: welke, wanneer.' },
    staat.reis.gezondheid || '');

  el.replaceChildren(...terugHeader('Gezondheid'), status,
    maak('div', { class: 'kaart' }, tekst,
      maak('button', { type: 'button', class: 'knop', onclick: async () => {
        try {
          await bewaarReis(staat.reis.id, { gezondheid: tekst.value.trim() || null });
          staat.reis.gezondheid = tekst.value.trim() || null;
          status.textContent = 'Opgeslagen.'; status.className = 'melding';
        } catch (e) { status.textContent = e.message; status.className = 'melding fout'; }
      } }, 'Opslaan')));
}
