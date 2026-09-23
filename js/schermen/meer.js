// Meer: menu naar de overige onderdelen van de reis
import { uitloggen } from '../auth.js';
import { maak } from '../util.js';
import { toonInstellingen } from './meer/instellingen.js';
import { toonBoekingen } from './meer/boekingen.js';
import { toonPaklijst } from './meer/paklijst.js';
import { toonLinks } from './meer/links.js';
import { toonDocumenten } from './meer/documenten.js';
import { toonGezondheid } from './meer/gezondheid.js';
import { toonReisdagboek } from './meer/reisdagboek.js';
import { toonNoodinfo } from './meer/noodinfo.js';
import { toonPrint } from './meer/print.js';
import { toonLeden } from './meer/leden.js';
import { toonBackup } from './meer/backup.js';

const ITEMS = [
  ['instellingen', 'Reisinstellingen'],
  ['boekingen', 'Boekingen'],
  ['paklijst', 'Paklijst'],
  ['links', 'Links'],
  ['documenten', 'Documenten'],
  ['gezondheid', 'Gezondheid'],
  ['reisdagboek', 'Reisdagboek'],
  ['noodinfo', 'Noodinfo'],
  ['print', 'Printversie'],
  ['leden', 'Leden'],
  ['backup', 'Back-up'],
];

const SUBSCHERMEN = { instellingen: toonInstellingen, boekingen: toonBoekingen, paklijst: toonPaklijst, links: toonLinks,
  documenten: toonDocumenten, gezondheid: toonGezondheid, reisdagboek: toonReisdagboek, noodinfo: toonNoodinfo,
  print: toonPrint, leden: toonLeden, backup: toonBackup };

export async function toonMeer(el, staat, pad = 'meer') {
  const sub = pad.split('/')[1];
  if (sub && SUBSCHERMEN[sub]) return SUBSCHERMEN[sub](el, staat);

  el.replaceChildren(maak('h1', {}, 'Meer'),
    maak('ul', { class: 'lijst menu' }, ITEMS.map(([pad2, titel]) =>
      maak('li', {}, maak('a', { class: 'menu-item', href: `#/meer/${pad2}` }, titel)))),
    maak('button', { type: 'button', class: 'knop licht', onclick: async () => { await uitloggen(); location.reload(); } }, 'Uitloggen'));
}
