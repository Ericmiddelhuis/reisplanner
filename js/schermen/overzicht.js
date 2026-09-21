import { bewaarReis } from '../db.js';
import { html } from '../util.js';

function dagenTot(datum) {
  if (!datum) return null;
  const nu = new Date(); nu.setHours(0, 0, 0, 0);
  return Math.round((new Date(datum + 'T00:00:00') - nu) / 86400000);
}

export function toonOverzicht(el, staat) {
  const reis = staat.reis;
  const d = dagenTot(reis.startdatum);
  const tekst = d === null ? 'Startdatum nog niet ingesteld'
    : d > 0 ? `nog ${d} ${d === 1 ? 'dag' : 'dagen'} tot vertrek`
    : d === 0 ? 'Vandaag vertrekken jullie!' : 'De reis is begonnen';
  el.innerHTML = html`
    <h1 id="reisnaam"></h1>
    <div class="kaart">
      <div class="countdown" id="countdown"></div>
      <p class="gedempt" id="countdown-tekst"></p>
    </div>
    <div class="kaart">
      <h2>Gedeelde notitie</h2>
      <p id="notitie-tekst"></p>
      <label for="notitie">Nieuwe notitie</label>
      <textarea id="notitie" rows="3"></textarea>
      <button class="knop" id="bewaar-notitie" type="button">Opslaan</button>
      <p class="gedempt" id="notitie-status" role="status"></p>
    </div>`;
  el.querySelector('#reisnaam').textContent = reis.naam;
  el.querySelector('#countdown').textContent = d !== null && d > 0 ? d : '';
  el.querySelector('#countdown-tekst').textContent = tekst;
  el.querySelector('#notitie').value = reis.notitie || '';
  el.querySelector('#notitie-tekst').textContent = reis.notitie || 'Nog geen notitie.';
  el.querySelector('#bewaar-notitie').addEventListener('click', async () => {
    const status = el.querySelector('#notitie-status');
    try {
      await bewaarReis(reis.id, { notitie: el.querySelector('#notitie').value });
      status.textContent = 'Opgeslagen.';
    } catch (e) { status.textContent = 'Opslaan mislukt: ' + e.message; }
  });
}

// Realtime: de notitie van de ander verschijnt zonder herladen
export function bijReisWijziging(el, reis) {
  const tekst = el.querySelector('#notitie-tekst');
  if (tekst) tekst.textContent = reis.notitie || 'Nog geen notitie.';
  const veld = el.querySelector('#notitie');
  if (veld && document.activeElement !== veld) veld.value = reis.notitie || '';
}
