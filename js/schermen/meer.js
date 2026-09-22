// Meer: reisinstellingen, leden en back-up
import { laadLeden, nodigUit, exporteerAlles, importeerAlles, bewaarReis } from '../db.js';
import { uitloggen } from '../auth.js';
import { maak } from '../util.js';
import { veld } from '../dialogen.js';

export async function toonMeer(el, staat) {
  const reis = staat.reis;
  const tripId = () => reis.id;

  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const instellingenKaart = maak('div', { class: 'kaart' });
  const ledenKaart = maak('div', { class: 'kaart' });
  const backupKaart = maak('div', { class: 'kaart' });
  el.replaceChildren(maak('h1', {}, 'Meer'), status, instellingenKaart, ledenKaart, backupKaart,
    maak('button', { type: 'button', class: 'knop licht', onclick: async () => { await uitloggen(); location.reload(); } }, 'Uitloggen'));

  function meld(tekst, fout = false) { status.textContent = tekst; status.className = 'melding' + (fout ? ' fout' : ''); }
  const veilig = async (actie) => { try { await actie(); } catch (e) { meld(e.message, true); } };

  // ---------- reisinstellingen ----------
  function renderInstellingen() {
    const naam = maak('input', { id: 'reis-naam', value: reis.naam });
    const start = maak('input', { id: 'reis-start', type: 'date', value: reis.startdatum || '' });
    const maxrij = maak('input', { id: 'reis-maxrij', type: 'number', min: '1', max: '14', step: '0.5', value: reis.max_rijuren_per_dag ?? 4 });
    instellingenKaart.replaceChildren(
      maak('h2', {}, 'Reisinstellingen'),
      maak('div', { class: 'rij' },
        veld('reis-naam', 'Naam', naam), veld('reis-start', 'Startdatum', start), veld('reis-maxrij', 'Max. rijuren per dag', maxrij)),
      maak('button', { type: 'button', class: 'knop', onclick: () => veilig(async () => {
        const velden = { naam: naam.value, startdatum: start.value || null, max_rijuren_per_dag: Number(maxrij.value) || 4 };
        await bewaarReis(tripId(), velden); Object.assign(reis, velden); meld('Opgeslagen.');
      }) }, 'Opslaan'));
  }

  // ---------- leden ----------
  async function renderLeden() {
    let leden;
    try { leden = await laadLeden(tripId()); } catch (e) { meld(e.message, true); return; }
    const email = maak('input', { id: 'led-email', type: 'email', autocomplete: 'off' });
    ledenKaart.replaceChildren(
      maak('h2', {}, 'Leden'),
      maak('ul', { class: 'lijst' }, leden.map((l) =>
        maak('li', {}, `${l.email} (${l.rol}${l.user_id ? '' : ', nog niet ingelogd'})`))),
      veld('led-email', 'E-mailadres om uit te nodigen', email),
      maak('button', { type: 'button', class: 'knop', onclick: () => veilig(async () => {
        await nodigUit(tripId(), email.value); email.value = '';
        meld('Uitgenodigd. Diegene kan nu inloggen met dit e-mailadres.'); await renderLeden();
      }) }, 'Uitnodigen'));
  }

  // ---------- back-up ----------
  function renderBackup() {
    const importVeld = maak('input', { id: 'imp-bestand', type: 'file', accept: 'application/json',
      onchange: async (ev) => {
        try {
          const f = ev.target.files[0]; if (!f) return;
          await importeerAlles(tripId(), JSON.parse(await f.text()));
          meld('Import gelukt.');
        } catch (e) { meld('Import mislukt: ' + e.message, true); }
      } });
    backupKaart.replaceChildren(
      maak('h2', {}, 'Back-up'),
      maak('button', { type: 'button', class: 'knop licht', onclick: async () => {
        try {
          const data = await exporteerAlles(tripId());
          const a = maak('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
            download: `reisplanner-${new Date().toISOString().slice(0, 10)}.json` });
          a.click(); URL.revokeObjectURL(a.href);
        } catch (e) { meld(e.message, true); }
      } }, 'Exporteren (JSON)'),
      veld('imp-bestand', 'Importeren', importVeld));
  }

  renderInstellingen();
  await renderLeden();
  renderBackup();
}
