// Startpunt: sessie controleren, reis laden, schermen tonen
import { huidigeSessie, login, stuurWachtwoordLink, nieuwWachtwoord, claimUitnodigingen } from './auth.js';
import { laadReizen, maakReis, volgReis, volgTabellen } from './db.js';
import { ROUTES, startRouter } from './router.js';
import { iconen } from './icons.js';
import { toonOverzicht } from './schermen/overzicht.js';
import { toonDagen } from './schermen/dagen.js';
import { toonRoute } from './schermen/route.js';
import { toonBudget } from './schermen/budget.js';
import { toonTodo } from './schermen/todo.js';
import { toonMeer } from './schermen/meer.js';

const SCHERMEN = { overzicht: toonOverzicht, dagen: toonDagen, route: toonRoute, budget: toonBudget, todo: toonTodo, meer: toonMeer };
const staat = { reis: null, pad: 'overzicht', opWijziging: null };
const root = document.getElementById('root');

// Meteen bij het laden vastleggen, vóórdat Supabase de link verwerkt en de hash opschoont:
// een link uit stuurWachtwoordLink() komt hier terug met "type=recovery" in de hash.
const HERSTEL_MODUS = location.hash.includes('type=recovery');

function toonLogin() {
  root.innerHTML = `
    <main class="login">
      <h1>Reisplanner Namibië &amp; Botswana</h1>
      <form id="loginform">
        <label for="email">E-mailadres</label>
        <input id="email" type="email" required autocomplete="email">
        <label for="wachtwoord">Wachtwoord</label>
        <input id="wachtwoord" type="password" required autocomplete="current-password">
        <button class="knop" type="submit">Inloggen</button>
      </form>
      <p id="melding" class="melding verborgen" role="status"></p>
      <div class="kaart" style="margin-top:24px">
        <h2>Nog geen wachtwoord, of vergeten?</h2>
        <p class="gedempt">Vul je e-mailadres in; je krijgt een link om een (nieuw) wachtwoord in te stellen.</p>
        <form id="resetform">
          <label for="reset-email">E-mailadres</label>
          <input id="reset-email" type="email" required autocomplete="email">
          <button class="knop licht" type="submit">Stuur link</button>
        </form>
        <p id="reset-melding" class="melding verborgen" role="status"></p>
      </div>
    </main>`;
  const melding = root.querySelector('#melding');
  root.querySelector('#loginform').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await login(root.querySelector('#email').value, root.querySelector('#wachtwoord').value);
      location.reload();
    } catch (err) { melding.textContent = err.message; melding.className = 'melding fout'; }
  });
  const resetMelding = root.querySelector('#reset-melding');
  root.querySelector('#resetform').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await stuurWachtwoordLink(root.querySelector('#reset-email').value);
      resetMelding.textContent = 'Mail verstuurd. Open de link op dit apparaat om een wachtwoord in te stellen.';
      resetMelding.className = 'melding';
    } catch (err) { resetMelding.textContent = err.message; resetMelding.className = 'melding fout'; }
  });
}

// Landingsplek van de link uit stuurWachtwoordLink(): hier kies je het (nieuwe) wachtwoord
function toonNieuwWachtwoord() {
  root.innerHTML = `
    <main class="login">
      <h1>Nieuw wachtwoord</h1>
      <form id="wachtwoordform">
        <label for="ww1">Nieuw wachtwoord (minstens 8 tekens)</label>
        <input id="ww1" type="password" required minlength="8" autocomplete="new-password">
        <label for="ww2">Herhaal het wachtwoord</label>
        <input id="ww2" type="password" required minlength="8" autocomplete="new-password">
        <button class="knop" type="submit">Wachtwoord instellen</button>
      </form>
      <p id="melding" class="melding fout verborgen" role="alert"></p>
    </main>`;
  const melding = root.querySelector('#melding');
  root.querySelector('#wachtwoordform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ww1 = root.querySelector('#ww1').value, ww2 = root.querySelector('#ww2').value;
    if (ww1 !== ww2) { melding.textContent = 'De wachtwoorden komen niet overeen.'; melding.classList.remove('verborgen'); return; }
    try {
      await nieuwWachtwoord(ww1);
      location.hash = '';
      location.reload();
    } catch (err) { melding.textContent = err.message; melding.classList.remove('verborgen'); }
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
  if (HERSTEL_MODUS) return toonNieuwWachtwoord();
  const sessie = await huidigeSessie();
  if (!sessie) return toonLogin();
  await claimUitnodigingen();
  let reizen;
  try { reizen = await laadReizen(); } catch (e) { root.textContent = 'Laden mislukt: ' + e.message; return; }
  if (!reizen.length) return toonEersteReis();
  staat.reis = reizen[0];
  bouwApp();
  volgReis(staat.reis.id, (nieuw) => { staat.reis = nieuw; });
  volgTabellen(['days', 'places', 'activities', 'bookings', 'legs', 'expenses', 'budgetten', 'tasks',
    'links', 'packing_items', 'documents', 'notities'], () => staat.opWijziging?.());
  startRouter(toonScherm);
}

start();

// PWA: de app-schil cachen zodat de app ook zonder bereik opent (zie sw.js). Faalt dit onopvallend
// (bijv. oude browser), dan werkt de app gewoon door zonder die offline-ondersteuning.
// navigator.webdriver check: in geautomatiseerde tests (Playwright) registreren we de service worker niet,
// anders vangt die de nagemaakte netwerkverzoeken in de tests weg vóórdat de test ze kan onderscheppen.
if ('serviceWorker' in navigator && !navigator.webdriver) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
