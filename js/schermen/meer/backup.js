// Back-up: alle reisdata exporteren naar JSON en weer importeren
import { exporteerAlles, importeerAlles } from '../../db.js';
import { maak, terugHeader } from '../../util.js';
import { veld } from '../../dialogen.js';

export async function toonBackup(el, staat) {
  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  function meld(tekst, fout = false) { status.textContent = tekst; status.className = 'melding' + (fout ? ' fout' : ''); }

  const importVeld = maak('input', { id: 'imp-bestand', type: 'file', accept: 'application/json', onchange: async (ev) => {
    try {
      const f = ev.target.files[0]; if (!f) return;
      await importeerAlles(staat.reis.id, JSON.parse(await f.text()));
      meld('Import gelukt.');
    } catch (e) { meld('Import mislukt: ' + e.message, true); }
  } });

  el.replaceChildren(...terugHeader('Back-up'), status,
    maak('div', { class: 'kaart' },
      maak('button', { type: 'button', class: 'knop licht', onclick: async () => {
        try {
          const data = await exporteerAlles(staat.reis.id);
          const a = maak('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
            download: `reisplanner-${new Date().toISOString().slice(0, 10)}.json` });
          a.click(); URL.revokeObjectURL(a.href);
        } catch (e) { meld(e.message, true); }
      } }, 'Exporteren (JSON)'),
      veld('imp-bestand', 'Importeren', importVeld)));
}
