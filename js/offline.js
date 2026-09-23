// Kleine banner die verschijnt zodra de browser offline is, of als getoonde data uit de lokale cache komt
// in plaats van vers van Supabase (zie db.js). Werkt los van welk scherm er open staat.
import { maak } from './util.js';

let balk;
function zorgVoorBalk() {
  if (balk) return balk;
  balk = maak('div', { id: 'offline-balk', class: 'offline-balk verborgen', role: 'status' });
  document.body.prepend(balk);
  return balk;
}

export function toonOfflineBalk(tekst) {
  const b = zorgVoorBalk();
  b.textContent = tekst;
  b.classList.remove('verborgen');
}

export function verbergOfflineBalk() {
  zorgVoorBalk().classList.add('verborgen');
}

addEventListener('offline', () => toonOfflineBalk('Geen verbinding — je ziet de laatst opgeslagen gegevens.'));
addEventListener('online', () => verbergOfflineBalk());
if (typeof navigator !== 'undefined' && navigator.onLine === false) {
  toonOfflineBalk('Geen verbinding — je ziet de laatst opgeslagen gegevens.');
}
