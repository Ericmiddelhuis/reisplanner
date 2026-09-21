import { laadLeden, nodigUit, exporteerAlles, importeerAlles, bewaarReis } from '../db.js';
import { uitloggen } from '../auth.js';
import { html } from '../util.js';

export async function toonMeer(el, staat) {
  const reis = staat.reis;
  el.innerHTML = html`
    <h1>Meer</h1>
    <div class="kaart">
      <h2>Reisinstellingen</h2>
      <div class="rij">
        <div><label for="naam">Naam</label><input id="naam"></div>
        <div><label for="start">Startdatum</label><input id="start" type="date"></div>
      </div>
      <button class="knop" id="bewaar" type="button">Opslaan</button>
    </div>
    <div class="kaart">
      <h2>Leden</h2>
      <ul class="lijst" id="leden"></ul>
      <label for="uitnodig">E-mailadres om uit te nodigen</label>
      <input id="uitnodig" type="email" autocomplete="off">
      <button class="knop" id="nodig" type="button">Uitnodigen</button>
    </div>
    <div class="kaart">
      <h2>Back-up</h2>
      <button class="knop licht" id="export" type="button">Exporteren (JSON)</button>
      <label for="import" style="margin-top:12px">Importeren</label>
      <input id="import" type="file" accept="application/json">
    </div>
    <p id="status" class="melding verborgen" role="status"></p>
    <button class="knop licht" id="uit" type="button">Uitloggen</button>`;
  const $ = (s) => el.querySelector(s);
  const meld = (t, fout) => { const s = $('#status'); s.textContent = t; s.className = 'melding' + (fout ? ' fout' : ''); };

  $('#naam').value = reis.naam;
  $('#start').value = reis.startdatum || '';
  $('#bewaar').onclick = async () => {
    try { await bewaarReis(reis.id, { naam: $('#naam').value, startdatum: $('#start').value || null });
      meld('Opgeslagen.'); } catch (e) { meld(e.message, true); }
  };

  const vulLeden = async () => {
    const leden = await laadLeden(reis.id);
    $('#leden').innerHTML = '';
    for (const l of leden) {
      const li = document.createElement('li');
      li.textContent = `${l.email} (${l.rol}${l.user_id ? '' : ', nog niet ingelogd'})`;
      $('#leden').append(li);
    }
  };
  vulLeden().catch((e) => meld(e.message, true));
  $('#nodig').onclick = async () => {
    try { await nodigUit(reis.id, $('#uitnodig').value); $('#uitnodig').value = ''; await vulLeden();
      meld('Uitgenodigd. Diegene kan nu inloggen met dit e-mailadres.'); } catch (e) { meld(e.message, true); }
  };

  $('#export').onclick = async () => {
    try {
      const data = await exporteerAlles(reis.id);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `reisplanner-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { meld(e.message, true); }
  };
  $('#import').onchange = async (ev) => {
    try {
      const f = ev.target.files[0]; if (!f) return;
      await importeerAlles(reis.id, JSON.parse(await f.text()));
      meld('Import gelukt.');
    } catch (e) { meld('Import mislukt: ' + e.message, true); }
  };
  $('#uit').onclick = async () => { await uitloggen(); location.reload(); };
}
