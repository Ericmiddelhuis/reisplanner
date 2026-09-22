// Eenvoudige hash-router: #/overzicht, #/dagen, ...
export const ROUTES = [
  { pad: 'overzicht', titel: 'Overzicht' },
  { pad: 'dagen', titel: 'Dagen' },
  { pad: 'route', titel: 'Route' },
  { pad: 'budget', titel: 'Budget' },
  { pad: 'todo', titel: 'To-do' },
  { pad: 'meer', titel: 'Meer' },
];

export function huidigePad() {
  const p = location.hash.replace(/^#\/?/, '');
  return ROUTES.some((r) => r.pad === p) ? p : 'overzicht';
}

export function startRouter(bijWijziging) {
  addEventListener('hashchange', () => bijWijziging(huidigePad()));
  bijWijziging(huidigePad());
}
