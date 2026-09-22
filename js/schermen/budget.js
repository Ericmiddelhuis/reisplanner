// Budget: totaalbudget, budgetbalk, begroting per categorie (handmatig of afgeleid), valutaschakelaar, uitgaven
import { lijst, voegToe, wijzig, verwijder, bewaarReis } from '../db.js';
import { maak, dagTekst, geldIn } from '../util.js';
import { opendialoog, veld } from '../dialogen.js';
import { CATEGORIEEN } from '../categorieen.js';

const VALUTAS = ['EUR', 'NAD', 'BWP'];
const STATUSSEN = ['gepland', 'betaald'];
const BRANDSTOF_CATEGORIE = '4x4-huurauto & brandstof';   // brandstofkosten (Route) horen altijd bij deze categorie

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function toonBudget(el, staat) {
  let d = { expenses: [], budgetten: [], dagen: [], activiteiten: [], etappes: [] };
  const ui = { valuta: 'EUR' };
  const tripId = () => staat.reis.id;

  // Koersen: hoeveel EUR is 1 eenheid van de valuta (zie Meer/instellingen hierboven op deze pagina)
  const koers = (v) => Number(staat.reis.koersen?.[v] ?? (v === 'EUR' ? 1 : 0)) || (v === 'EUR' ? 1 : 0);
  const naarEur = (bedrag, valuta) => bedrag * koers(valuta);
  const vanEur = (bedragEur, valuta) => (koers(valuta) ? bedragEur / koers(valuta) : 0);
  const disp = (bedragEur) => geldIn(vanEur(bedragEur, ui.valuta), ui.valuta);
  const eurVan = (e) => e.bedrag_eur ?? naarEur(Number(e.bedrag), e.valuta);

  async function laden() {
    const [expenses, budgetten, dagen, activiteiten, etappes] = await Promise.all([
      lijst('expenses', tripId()), lijst('budgetten', tripId()), lijst('days', tripId(), 'dagnummer'),
      lijst('activities', tripId()), lijst('legs', tripId())]);
    d = { expenses, budgetten, dagen, activiteiten, etappes };
  }

  el.replaceChildren(maak('h1', {}, 'Budget'), maak('p', { class: 'gedempt' }, 'Laden…'));
  try { await laden(); } catch (e) {
    el.replaceChildren(maak('h1', {}, 'Budget'), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
    return;
  }
  if (staat.pad !== 'budget') return;

  // ---------- opzet ----------
  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const totaalKaart = maak('div', { class: 'kaart' });
  const balkKaart = maak('div', { class: 'kaart' });
  const categorieLijst = maak('div', { id: 'categorieen' });
  const uitgavenKaart = maak('div', { class: 'kaart', id: 'uitgaven' });
  el.replaceChildren(maak('h1', {}, 'Budget'), status, totaalKaart, balkKaart, categorieLijst, uitgavenKaart);

  function meld(tekst, fout = false) { status.textContent = tekst; status.className = 'melding' + (fout ? ' fout' : ''); }
  const veilig = async (actie) => { try { await actie(); } catch (e) { meld(e.message, true); } };

  // Activiteiten (Dagen) en brandstofkosten (Route) hebben geen betaald/gepland-status en geen eigen valuta:
  // kosten in EUR, tellen als gepland mee. Activiteit-categorie is vrij te kiezen; brandstof hoort altijd bij
  // "4x4-huurauto & brandstof".
  const activiteitenMetKosten = (cat) => d.activiteiten.filter((a) => a.kosten != null && (cat === undefined || a.categorie === cat));
  const etappesMetBrandstof = (cat) => cat !== undefined && cat !== BRANDSTOF_CATEGORIE ? [] : d.etappes.filter((l) => l.brandstofkosten != null);

  function totalen() {
    let betaald = 0, gepland = 0;
    for (const e of d.expenses) { const eur = eurVan(e); if (e.status === 'betaald') betaald += eur; else gepland += eur; }
    for (const a of activiteitenMetKosten()) gepland += Number(a.kosten);
    for (const l of etappesMetBrandstof()) gepland += Number(l.brandstofkosten);
    return { betaald, gepland };
  }

  function categorieTotalen(cat) {
    let betaald = 0, gepland = 0;
    for (const e of d.expenses.filter((x) => x.categorie === cat)) {
      const eur = eurVan(e); if (e.status === 'betaald') betaald += eur; else gepland += eur;
    }
    for (const a of activiteitenMetKosten(cat)) gepland += Number(a.kosten);
    for (const l of etappesMetBrandstof(cat)) gepland += Number(l.brandstofkosten);
    return { betaald, gepland, totaal: betaald + gepland };
  }

  const dagLabel = (dag) => `Dag ${dag.dagnummer}` + (dag.datum ? ' · ' + dagTekst(dag.datum) : '') + (dag.titel ? ' · ' + dag.titel : '');
  const dagVanId = (id) => { const dag = d.dagen.find((x) => x.id === id); return dag ? `Dag ${dag.dagnummer}` : null; };

  // ---------- totaalbudget, valutaschakelaar, wisselkoersen ----------
  function renderTotaal() {
    const bedrag = maak('input', { id: 'tb-bedrag', type: 'number', min: '0', step: '0.01', inputmode: 'decimal',
      value: staat.reis.totaalbudget ?? '', onchange: (ev) => veilig(async () => {
        const v = ev.target.value === '' ? null : Number(ev.target.value);
        await bewaarReis(tripId(), { totaalbudget: v }); staat.reis.totaalbudget = v;
        meld('Opgeslagen.'); renderBalk();
      }) });
    const chips = maak('div', { class: 'weekchips', role: 'group', 'aria-label': 'Weergavevaluta' },
      VALUTAS.map((v) => maak('button', { type: 'button', class: 'chip', 'aria-pressed': String(v === ui.valuta),
        onclick: () => { ui.valuta = v; renderTotaal(); renderBalk(); renderCategorieen(); renderUitgaven(); } }, v)));
    const nad = maak('input', { id: 'wk-nad', type: 'number', min: '0', step: '0.001', inputmode: 'decimal', value: koers('NAD') });
    const bwp = maak('input', { id: 'wk-bwp', type: 'number', min: '0', step: '0.001', inputmode: 'decimal', value: koers('BWP') });

    totaalKaart.replaceChildren(
      maak('h2', {}, 'Totaalbudget'),
      veld('tb-bedrag', 'Totaalbudget (EUR)', bedrag),
      maak('label', {}, 'Weergavevaluta'), chips,
      maak('label', { style: 'margin-top:12px' }, 'Wisselkoersen (EUR per eenheid)'),
      maak('div', { class: 'rij' },
        veld('wk-nad', '1 NAD = … EUR', nad), veld('wk-bwp', '1 BWP = … EUR', bwp),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => veilig(async () => {
          const koersen = { ...staat.reis.koersen, EUR: 1, NAD: Number(nad.value) || koers('NAD'), BWP: Number(bwp.value) || koers('BWP') };
          await bewaarReis(tripId(), { koersen }); staat.reis.koersen = koersen;
          meld('Koersen opgeslagen.'); renderBalk(); renderCategorieen(); renderUitgaven();
        }) }, 'Koersen opslaan')));
  }

  // ---------- budgetbalk ----------
  function renderBalk() {
    const { betaald, gepland } = totalen();
    const totaalEur = staat.reis.totaalbudget != null ? Number(staat.reis.totaalbudget) : null;
    const basis = totaalEur > 0 ? totaalEur : (betaald + gepland > 0 ? betaald + gepland : null);
    if (!basis) {
      balkKaart.replaceChildren(maak('h2', {}, 'Overzicht'), maak('p', { class: 'gedempt' }, 'Nog geen totaalbudget of uitgaven ingevoerd.'));
      return;
    }
    const pctBetaald = Math.min(100, (betaald / basis) * 100);
    const pctGepland = Math.min(100 - pctBetaald, (gepland / basis) * 100);
    const overschot = totaalEur != null ? betaald + gepland - totaalEur : 0;
    const vrij = totaalEur != null ? Math.max(0, totaalEur - betaald - gepland) : null;

    // replaceChildren() zet een los null-argument om in de letterlijke tekst "null", dus filteren vóór het aanroepen
    balkKaart.replaceChildren(...[
      maak('h2', {}, 'Overzicht'),
      maak('div', { class: 'budgetbalk', role: 'img', 'aria-label': `Betaald ${disp(betaald)}, gepland ${disp(gepland)}` },
        maak('span', { class: 'balk-betaald', style: `width:${pctBetaald}%` }),
        maak('span', { class: 'balk-gepland', style: `width:${pctGepland}%` })),
      maak('ul', { class: 'legenda' },
        maak('li', {}, maak('span', { class: 'stip betaald' }), `Betaald: ${disp(betaald)}`),
        maak('li', {}, maak('span', { class: 'stip gepland' }), `Gepland: ${disp(gepland)}`),
        vrij != null ? maak('li', {}, maak('span', { class: 'stip vrij' }), `Vrij: ${disp(vrij)}`) : null),
      overschot > 0 ? maak('p', { class: 'melding fout', role: 'alert' }, `Let op: dit gaat ${disp(overschot)} over het totaalbudget.`) : null,
    ].filter((x) => x != null));
  }

  // ---------- begroting per categorie ----------
  function categorieKaart(cat) {
    const rij = d.budgetten.find((b) => b.categorie === cat);
    const handmatig = !!rij && rij.bedrag != null;
    const { betaald, gepland, totaal: afgeleid } = categorieTotalen(cat);
    const begrootEur = handmatig ? Number(rij.bedrag) : afgeleid;
    const id = 'cat-' + slug(cat);

    const vinkje = maak('input', { id: id + '-vink', type: 'checkbox', checked: handmatig, onchange: (ev) => veilig(async () => {
      if (ev.target.checked) {
        if (rij) { await wijzig('budgetten', rij.id, { bedrag: afgeleid }); rij.bedrag = afgeleid; }
        else d.budgetten.push(await voegToe('budgetten', { trip_id: tripId(), categorie: cat, bedrag: afgeleid }));
      } else if (rij) {
        await wijzig('budgetten', rij.id, { bedrag: null }); rij.bedrag = null;
      }
      renderCategorieen();
    }) });

    let begrootWeergave;
    if (handmatig) {
      const invoer = maak('input', { id: id + '-bedrag', type: 'number', min: '0', step: '0.01', inputmode: 'decimal',
        value: rij.bedrag, onchange: (ev) => veilig(async () => {
          const v = ev.target.value === '' ? 0 : Number(ev.target.value);
          await wijzig('budgetten', rij.id, { bedrag: v }); rij.bedrag = v; renderCategorieen();
        }) });
      begrootWeergave = veld(id + '-bedrag', 'Begroot bedrag (EUR)', invoer);
    } else {
      begrootWeergave = maak('p', { class: 'gedempt' }, `Afgeleid uit geplande en betaalde uitgaven: ${disp(afgeleid)}`);
    }

    const pct = begrootEur > 0 ? Math.min(100, (betaald / begrootEur) * 100) : 0;
    const over = begrootEur > 0 && betaald + gepland > begrootEur;
    const uitActiviteiten = activiteitenMetKosten(cat).reduce((s, a) => s + Number(a.kosten), 0);
    const uitBrandstof = etappesMetBrandstof(cat).reduce((s, l) => s + Number(l.brandstofkosten), 0);
    const waarvan = [
      uitActiviteiten > 0 ? `Waarvan ${disp(uitActiviteiten)} aan activiteiten uit Dagen.` : null,
      uitBrandstof > 0 ? `Waarvan ${disp(uitBrandstof)} aan brandstof uit Route.` : null,
    ].filter((x) => x != null);

    return maak('div', { class: 'kaart' },
      maak('h3', {}, cat),
      maak('div', { class: 'vinkje' }, vinkje, maak('label', { for: id + '-vink' }, 'Handmatig begroot bedrag')),
      begrootWeergave,
      maak('div', { class: 'mini-balk' }, maak('span', { class: 'mini-vul' + (over ? ' over' : ''), style: `width:${pct}%` })),
      maak('p', { class: 'gedempt' }, `Betaald ${disp(betaald)} van ${disp(begrootEur)}` + (over ? ' — over budget' : '')),
      waarvan.map((t) => maak('p', { class: 'gedempt' }, t)));
  }

  function renderCategorieen() {
    categorieLijst.replaceChildren(maak('h2', {}, 'Per categorie'), ...CATEGORIEEN.map(categorieKaart));
  }

  // ---------- uitgaven ----------
  function renderUitgaven() {
    const gesorteerd = [...d.expenses].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    uitgavenKaart.replaceChildren(
      maak('h2', {}, 'Uitgaven'),
      gesorteerd.length ? maak('ul', { class: 'lijst' }, gesorteerd.map((e) => maak('li', {},
        maak('button', { type: 'button', class: 'activiteit', onclick: () => vraagUitgave(e) },
          maak('strong', {}, e.omschrijving || e.categorie || 'Uitgave'),
          maak('span', { class: 'gedempt' }, [e.categorie, dagVanId(e.day_id)].filter(Boolean).join(' · ')),
          maak('span', {}, geldIn(Number(e.bedrag), e.valuta) + (e.valuta !== ui.valuta ? ` (${disp(eurVan(e))})` : '')),
          maak('span', { class: 'badge ' + (e.status === 'betaald' ? 'betaald' : 'nog-boeken') }, e.status)))))
        : maak('p', { class: 'gedempt' }, 'Nog geen uitgaven.'),
      maak('button', { type: 'button', class: 'knop licht', onclick: () => vraagUitgave(null) }, '+ Uitgave toevoegen'));
  }

  function vraagUitgave(expense) {
    const fout = maak('p', { class: 'melding fout verborgen', role: 'alert' });
    const toonFout = (t) => { fout.textContent = t; fout.classList.remove('verborgen'); };
    const omschrijving = maak('input', { id: 'ug-omschrijving', value: expense?.omschrijving || '' });
    const bedrag = maak('input', { id: 'ug-bedrag', type: 'number', min: '0', step: '0.01', required: true, inputmode: 'decimal', value: expense?.bedrag ?? '' });
    const valuta = maak('select', { id: 'ug-valuta', value: expense?.valuta || ui.valuta }, VALUTAS.map((v) => maak('option', { value: v }, v)));
    const categorie = maak('select', { id: 'ug-categorie', value: expense?.categorie || '' }, maak('option', { value: '' }, '— geen —'),
      CATEGORIEEN.map((c) => maak('option', { value: c }, c)));
    const statusSel = maak('select', { id: 'ug-status', value: expense?.status || 'gepland' },
      STATUSSEN.map((s) => maak('option', { value: s }, s[0].toUpperCase() + s.slice(1))));
    const dagSel = maak('select', { id: 'ug-dag', value: expense?.day_id || '' }, maak('option', { value: '' }, '— geen dag —'),
      d.dagen.map((x) => maak('option', { value: x.id }, dagLabel(x))));

    let dlg;
    const form = maak('form', { method: 'dialog', onsubmit: async (ev) => {
      ev.preventDefault();
      const bedragNum = Number(bedrag.value);
      if (!bedragNum || bedragNum <= 0) return toonFout('Vul een bedrag groter dan 0 in.');
      const velden = { omschrijving: omschrijving.value.trim() || null, bedrag: bedragNum, valuta: valuta.value,
        bedrag_eur: naarEur(bedragNum, valuta.value), categorie: categorie.value || null, status: statusSel.value,
        day_id: dagSel.value || null };
      try {
        if (expense) { await wijzig('expenses', expense.id, velden); Object.assign(expense, velden); }
        else d.expenses.push(await voegToe('expenses', { ...velden, trip_id: tripId() }));
        dlg.close(); renderBalk(); renderCategorieen(); renderUitgaven();
      } catch (e) { toonFout(e.message); }
    } },
      veld('ug-omschrijving', 'Omschrijving (optioneel)', omschrijving),
      maak('div', { class: 'rij' }, veld('ug-bedrag', 'Bedrag', bedrag), veld('ug-valuta', 'Valuta', valuta)),
      veld('ug-categorie', 'Categorie', categorie),
      veld('ug-status', 'Status', statusSel),
      veld('ug-dag', 'Gekoppelde dag (optioneel)', dagSel), fout,
      maak('div', { class: 'knoppen' },
        maak('button', { type: 'submit', class: 'knop' }, 'Opslaan'),
        maak('button', { type: 'button', class: 'knop licht', onclick: () => dlg.close() }, 'Annuleren'),
        expense ? maak('button', { type: 'button', class: 'knop licht gevaar', onclick: async () => {
          if (!confirm('Deze uitgave verwijderen?')) return;
          try {
            await verwijder('expenses', expense.id); d.expenses = d.expenses.filter((x) => x.id !== expense.id);
            dlg.close(); renderBalk(); renderCategorieen(); renderUitgaven();
          } catch (e) { toonFout(e.message); }
        } }, 'Verwijderen') : null));
    dlg = opendialoog(el, expense ? 'Uitgave bewerken' : 'Nieuwe uitgave', form);
  }

  // ---------- Realtime ----------
  let timer;
  const verwerk = async () => {
    if (staat.pad !== 'budget') return;
    const actief = document.activeElement;
    if (el.querySelector('dialog[open]') || (actief && el.contains(actief) && /^(INPUT|TEXTAREA|SELECT)$/.test(actief.tagName))) {
      timer = setTimeout(verwerk, 1000); return;
    }
    try { await laden(); } catch { return; }
    renderBalk(); renderCategorieen(); renderUitgaven();
  };
  staat.opWijziging = () => { clearTimeout(timer); timer = setTimeout(verwerk, 300); };

  renderTotaal(); renderBalk(); renderCategorieen(); renderUitgaven();
}
