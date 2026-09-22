// Startpunt: sessie controleren, reis laden, schermen tonen
import { huidigeSessie, stuurMagicLink, claimUitnodigingen } from './auth.js';
import { laadReizen, maakReis, volgReis, volgTabellen } from './db.js';
import { ROUTES, startRouter } from './router.js';
import { iconen } from './icons.js';
import { toonOverzicht, bijReisWijziging } from './schermen/overzicht.js';
import { toonDagen } from './schermen/dagen.js';
import { toonRoute } from './schermen/route.js';
import { toonBudget } from './schermen/budget.js';
import { toonTodo } from './schermen/todo.js';
import { toonMeer } from './schermen/meer.js';

const SCHERMEN = { overzicht: toonOverzicht, dagen: toonDagen, route: toonRoute, budget: toonBudget, todo: toonTodo, meer: toonMeer };
const staat = { reis: null, pad: 'overzicht', opWijziging: null };
const root = document.getElementById('root');

function toonLogin() {
  root.innerHTML = `
    <main class="login">
      <h1>Reisplanner Namibië &amp; Botswana</h1>
      <p class="gedempt">Vul je e-mailadres in. Je krijgt een inloglink toegestuurd.</p>
      <form id="loginform">
        <label for="email">E-mailadres</label>
        <input id="email" type="email" required autocomplete="email">
        <button class="knop" type="submit">Stuur inloglink</button>
      </form>
      <p id="melding" class="melding verborgen" role="status"></p>
    </main>`;
  const melding = root.querySelector('#melding');
  root.querySelector('#loginform').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await stuurMagicLink(root.querySelector('#email').value);
      melding.textContent = 'Link verstuurd. Open de mail op dit apparaat en klik op de link.';
      melding.className = 'melding';
    } catch (err) { melding.textContent = err.message; melding.className = 'melding fout'; }
  });
}

function toonEersteReis() {
  root.innerHTML = `
    <main class="login">
      <h1>Nieuwe reis</h1>
      <p class="gedempt">Je hebt nog geen reis. Maak er een aan; daarna nodig je de ander uit via Meer.</p>
      <form id="reisform">
        <label for="naam">Naam van de reis</label>
        <input id="naam" required value="Namibië & Botswana 2027">
        <label for="start">Startdatum (mag later)</label>
        <input id="start" type="date">
        <button class="knop" type="submit">Reis aanmaken</button>
      </form>
      <p id="melding" class="melding fout verborgen"></p>
    </main>`;
  root.querySelector('#reisform').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await maakReis(root.querySelector('#naam').value, root.querySelector('#start').value);
      location.reload();
    } catch (err) {
      const m = root.querySelector('#melding'); m.textContent = err.message; m.classList.remove('verborgen');
    }
  });
}

function bouwApp() {
  root.innerHTML = `
    <div id="app">
      <nav id="navigatie" aria-label="Hoofdmenu">
        <div class="merk">Reisplanner</div>
        ${ROUTES.map((r) => `<a href="#/${r.pad}" data-pad="${r.pad}">${iconen[r.pad]}<span>${r.titel}</span></a>`).join('')}
      </nav>
      <main id="hoofd"></main>
    </div>`;
}

function toonScherm(pad) {
  staat.pad = pad;
  staat.opWijziging = null;   // het vorige scherm luistert niet meer mee
  const top = pad.split('/')[0];   // 'meer/boekingen' hoort bij het tabblad 'meer'
  for (const a of root.querySelectorAll('#navigatie a')) {
    if (a.dataset.pad === top) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  SCHERMEN[top](root.querySelector('#hoofd'), staat, pad);
}

async function start() {
  const sessie = await huidigeSessie();
  if (!sessie) return toonLogin();
  await claimUitnodigingen();
  let reizen;
  try { reizen = await laadReizen(); } catch (e) { root.textContent = 'Laden mislukt: ' + e.message; return; }
  if (!reizen.length) return toonEersteReis();
  staat.reis = reizen[0];
  bouwApp();
  volgReis(staat.reis.id, (nieuw) => {
    staat.reis = nieuw;
    if (staat.pad === 'overzicht') bijReisWijziging(root.querySelector('#hoofd'), nieuw);
  });
  volgTabellen(['days', 'places', 'activities', 'bookings', 'legs', 'expenses', 'budgetten', 'tasks',
    'links', 'packing_items', 'documents'], () => staat.opWijziging?.());
  startRouter(toonScherm);
}

start();
