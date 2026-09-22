// Leden: wie hoort bij deze reis, en uitnodigen via e-mail
import { laadLeden, nodigUit } from '../../db.js';
import { maak, terugHeader } from '../../util.js';
import { veld } from '../../dialogen.js';

export async function toonLeden(el, staat) {
  const status = maak('p', { class: 'melding verborgen', role: 'status' });
  const lijstEl = maak('ul', { class: 'lijst' });
  const email = maak('input', { id: 'led-email', type: 'email', autocomplete: 'off' });
  el.replaceChildren(...terugHeader('Leden'), status,
    maak('div', { class: 'kaart' }, lijstEl, veld('led-email', 'E-mailadres om uit te nodigen', email),
      maak('button', { type: 'button', class: 'knop', onclick: async () => {
        try {
          await nodigUit(staat.reis.id, email.value); email.value = '';
          status.textContent = 'Uitgenodigd. Diegene kan nu inloggen met dit e-mailadres.'; status.className = 'melding';
          await vulLeden();
        } catch (e) { status.textContent = e.message; status.className = 'melding fout'; }
      } }, 'Uitnodigen')));

  async function vulLeden() {
    try {
      const leden = await laadLeden(staat.reis.id);
      lijstEl.replaceChildren(...leden.map((l) => maak('li', {}, `${l.email} (${l.rol}${l.user_id ? '' : ', nog niet ingelogd'})`)));
    } catch (e) { status.textContent = e.message; status.className = 'melding fout'; }
  }
  await vulLeden();
}
