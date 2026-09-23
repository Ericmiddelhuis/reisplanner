// Printversie: dagplanning, boekingen, gezondheid en noodinfo op één pagina — een papieren back-up
// voor onderweg, voor het geval een telefoon leeg is of er geen bereik is.
import { lijst } from '../../db.js';
import { maak, dagTekst, geld, terugHeader } from '../../util.js';

export async function toonPrint(el, staat) {
  const tripId = () => staat.reis.id;
  el.replaceChildren(...terugHeader('Printversie'), maak('p', { class: 'gedempt' }, 'Laden…'));

  let dagen = [], activiteiten = [], boekingen = [];
  try {
    [dagen, activiteiten, boekingen] = await Promise.all([
      lijst('days', tripId(), 'dagnummer'), lijst('activities', tripId()), lijst('bookings', tripId())]);
  } catch (e) {
    el.replaceChildren(...terugHeader('Printversie'), maak('p', { class: 'melding fout' }, 'Laden mislukt: ' + e.message));
    return;
  }
  if (staat.pad !== 'meer/print') return;

  const dagLabel = (dag) => `Dag ${dag.dagnummer}` + (dag.datum ? ' · ' + dagTekst(dag.datum) : '') + (dag.titel ? ' · ' + dag.titel : '');
  const actVanDag = (dagId) => activiteiten.filter((a) => a.day_id === dagId)
    .sort((a, b) => (a.tijd || '99').localeCompare(b.tijd || '99'));

  const dagSectie = (dag) => {
    const acts = actVanDag(dag.id);
    return maak('section', { class: 'print-dag' },
      maak('h3', {}, dagLabel(dag)),
      dag.notitie ? maak('p', {}, dag.notitie) : null,
      acts.length ? maak('ul', {}, acts.map((a) => maak('li', {},
        [a.dagdeel, a.tijd?.slice(0, 5), a.titel, a.kosten != null ? geld(a.kosten) : null].filter(Boolean).join(' · '))))
        : null);
  };

  const boekingRegel = (b) => maak('li', {},
    [b.titel, b.type, b.status, b.kosten != null ? geld(b.kosten) : null, b.bevestigingsnr && 'bevestiging ' + b.bevestigingsnr]
      .filter(Boolean).join(' · '));

  const tekstBlok = (titel, tekst) => tekst ? maak('section', {},
    maak('h2', {}, titel), maak('p', { class: 'print-vrije-tekst' }, tekst)) : null;

  el.replaceChildren(
    maak('div', { class: 'niet-printen' }, ...terugHeader('Printversie'),
      maak('p', { class: 'gedempt' }, 'Deze pagina is bedoeld om te printen als papieren back-up: dagplanning, boekingen, gezondheid en noodinfo op één plek.'),
      maak('button', { type: 'button', class: 'knop', onclick: () => window.print() }, 'Printen')),
    maak('div', { class: 'print-inhoud' },
      maak('h1', {}, staat.reis.naam),
      staat.reis.startdatum ? maak('p', {}, `Startdatum: ${dagTekst(staat.reis.startdatum)}`) : null,
      maak('h2', {}, 'Dagplanning'),
      dagen.length ? dagen.map(dagSectie) : maak('p', {}, 'Nog geen dagen.'),
      maak('h2', {}, 'Boekingen'),
      boekingen.length ? maak('ul', {}, boekingen.map(boekingRegel)) : maak('p', {}, 'Geen boekingen.'),
      tekstBlok('Gezondheid', staat.reis.gezondheid),
      tekstBlok('Noodinfo', staat.reis.noodinfo)));
}
