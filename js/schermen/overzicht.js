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
      <button class="knop licht verborgen" id="bewerk-notitie" type="button">Bewerken</button>
      <label for="notitie" id="notitie-label" style="margin-top:12px">Nieuwe notitie</label>
      <textarea id="notitie" rows="3"></textarea>
      <button class="knop" id="bewaar-notitie" type="button">Opslaan</button>
      <p class="gedempt" id="notitie-status" role="status"></p>
    </div>`;
  el.querySelector('#reisnaam').textContent = reis.naam;
  el.querySelector('#countdown').textContent = d !== null && d > 0 ? d : '';
  el.querySelector('#countdown-tekst').textContent = tekst;

  const tekstEl = el.querySelector('#notitie-tekst');
  const veld = el.querySelector('#notitie');
  const label = el.querySelector('#notitie-label');
  const bewerkKnop = el.querySelector('#bewerk-notitie');

  // Het veld staat standaard leeg: alleen de opgeslagen notitie erboven toont wat er nu staat.
  // Pas als je op "Bewerken" klikt, komt de huidige tekst in het veld, klaar om aan te passen.
  function renderNotitie() {
    tekstEl.textContent = reis.notitie || 'Nog geen notitie.';
    bewerkKnop.classList.toggle('verborgen', !reis.notitie);
  }
  renderNotitie();

  bewerkKnop.addEventListener('click', () => {
    veld.value = reis.notitie || '';
    label.textContent = 'Notitie bewerken';
    veld.focus();
  });

  el.querySelector('#bewaar-notitie').addEventListener('click', async () => {
    const status = el.querySelector('#notitie-status');
    const nieuweWaarde = veld.value.trim() || null;
    try {
      await bewaarReis(reis.id, { notitie: nieuweWaarde });
      reis.notitie = nieuweWaarde;   // meteen lokaal bijwerken, niet wachten op de Realtime-echo
      veld.value = '';
      label.textContent = 'Nieuwe notitie';
      renderNotitie();
      status.textContent = 'Opgeslagen.';
    } catch (e) { status.textContent = 'Opslaan mislukt: ' + e.message; }
  });
}

// Realtime: de notitie van de ander verschijnt zonder herladen. Het invoerveld wordt met rust
// gelaten (blijft leeg, of blijft staan wat je zelf aan het typen was) — alleen de weergave erboven
// en de "Bewerken"-knop volgen de laatste stand.
export function bijReisWijziging(el, reis) {
  const tekst = el.querySelector('#notitie-tekst');
  if (tekst) tekst.textContent = reis.notitie || 'Nog geen notitie.';
  const bewerkKnop = el.querySelector('#bewerk-notitie');
  if (bewerkKnop) bewerkKnop.classList.toggle('verborgen', !reis.notitie);
}
