// Service worker: cachet de app-schil (HTML/CSS/JS) zodat de app ook zonder bereik opent.
// Reisdata (Supabase), routes (OpenRouteService/Nominatim) en kaarttegels gaan altijd naar het netwerk:
// die moeten actueel zijn en worden apart offline beschikbaar gehouden via localStorage (zie db.js).
const CACHE = 'reisplanner-shell-v1';   // ophogen bij een grote release om oude caches te vervangen

// Alleen bestanden van dit domein vooraf cachen. Cross-origin bestanden (lettertypen, Leaflet, Supabase-js)
// hebben geen garantie op CORS-headers, waardoor cache.addAll() in zijn geheel zou kunnen mislukken; die
// worden hieronder in de fetch-handler op de achtergrond gecachet zodra ze een keer succesvol zijn opgehaald.
const SCHIL = [
  './', './index.html', './manifest.json',
  './css/tokens.css', './css/basis.css', './css/componenten.css', './css/print.css',
  './js/app.js', './js/auth.js', './js/categorieen.js', './js/config.js', './js/db.js', './js/dialogen.js',
  './js/icons.js', './js/offline.js', './js/ors.js', './js/router.js', './js/util.js',
  './js/schermen/overzicht.js', './js/schermen/dagen.js', './js/schermen/route.js', './js/schermen/budget.js',
  './js/schermen/todo.js', './js/schermen/meer.js',
  './js/schermen/meer/instellingen.js', './js/schermen/meer/boekingen.js', './js/schermen/meer/paklijst.js',
  './js/schermen/meer/links.js', './js/schermen/meer/documenten.js', './js/schermen/meer/gezondheid.js',
  './js/schermen/meer/reisdagboek.js', './js/schermen/meer/noodinfo.js', './js/schermen/meer/print.js',
  './js/schermen/meer/leden.js', './js/schermen/meer/backup.js',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SCHIL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Deze hosts leveren live data of kaarttegels: nooit cachen, altijd naar het netwerk
const GEEN_CACHE = ['supabase.co', 'openrouteservice.org', 'nominatim.openstreetmap.org', 'tile.openstreetmap.org'];

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (GEEN_CACHE.some((host) => url.hostname.includes(host))) return;   // laat het normale netwerkverzoek doorgaan

  event.respondWith(
    caches.match(event.request).then((cache) => {
      const netwerk = fetch(event.request).then((respons) => {
        if (respons.ok) caches.open(CACHE).then((c) => c.put(event.request, respons.clone()));
        return respons;
      }).catch(() => cache);   // geen netwerk: val terug op wat er (eventueel) in de cache staat
      return cache || netwerk;   // cache-first voor snelheid; ondertussen op de achtergrond verversen
    })
  );
});
