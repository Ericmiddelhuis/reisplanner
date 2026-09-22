// Tagged template die niets extra's doet; alleen voor leesbaarheid en editor-highlighting
export const html = (delen, ...waarden) => delen.reduce((s, d, i) => s + d + (waarden[i] ?? ''), '');

// Bouwt een DOM-element. Tekst gaat via textContent-achtige nodes, dus veilig voor gebruikersinvoer.
// Eigenschappen: 'onclick' e.d. worden event-listeners; 'class' wordt className; null/false wordt overgeslagen.
export function maak(tag, eigenschappen = {}, ...kinderen) {
  const e = document.createElement(tag);
  let waarde;
  for (const [k, v] of Object.entries(eigenschappen)) {
    if (k === 'value') waarde = v;              // pas na de kinderen zetten (nodig voor <select>)
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...kinderen.flat().filter((x) => x != null && x !== false));
  if (waarde !== undefined) e.value = waarde ?? '';
  return e;
}

// "za 10 jul"
export function dagTekst(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Datum van dag n, gerekend vanaf de startdatum (UTC om zomertijd-problemen te vermijden)
export function datumVoor(startdatum, dagnummer) {
  if (!startdatum) return null;
  const [j, m, d] = startdatum.split('-').map(Number);
  return new Date(Date.UTC(j, m - 1, d + dagnummer - 1)).toISOString().slice(0, 10);
}

export const geldIn = (n, valuta = 'EUR') => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: valuta }).format(n);
export const geld = (n) => geldIn(n, 'EUR');
