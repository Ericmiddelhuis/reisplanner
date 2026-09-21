// Plaatsen zoeken (Nominatim/OpenStreetMap) en routes berekenen (OpenRouteService)
import { ORS_KEY } from './config.js';

export async function zoekPlaats(vraag) {
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
    q: vraag, format: 'jsonv2', limit: '6', countrycodes: 'na,bw', 'accept-language': 'nl', addressdetails: '1' });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Zoeken mislukt (${r.status})`);
  return (await r.json()).map((x) => ({
    naam: x.display_name, kort: x.name || x.display_name.split(',')[0],
    lat: Number(x.lat), lng: Number(x.lon), land: (x.address?.country_code || '').toUpperCase(),
  }));
}

// Rijroute tussen twee punten ({lat, lng}); geeft ruwe afstand/rijtijd en de routelijn terug
export async function berekenRoute(van, naar) {
  const r = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
    method: 'POST',
    headers: { Authorization: ORS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates: [[van.lng, van.lat], [naar.lng, naar.lat]] }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.routes?.length) throw new Error(j.error?.message || `Route berekenen mislukt (${r.status})`);
  const route = j.routes[0];
  return {
    afstand_km: Math.round(route.summary.distance / 100) / 10,
    rijtijd_min: Math.round(route.summary.duration / 60),
    geometrie: route.geometry,
  };
}

// Encoded polyline (precisie 5) omzetten naar [[lat, lng], ...]
export function decodeer(tekst) {
  const punten = [];
  let i = 0, lat = 0, lng = 0;
  while (i < tekst.length) {
    for (const veld of ['lat', 'lng']) {
      let schuif = 0, resultaat = 0, b;
      do { b = tekst.charCodeAt(i++) - 63; resultaat |= (b & 31) << schuif; schuif += 5; } while (b >= 32);
      const delta = resultaat & 1 ? ~(resultaat >> 1) : resultaat >> 1;
      if (veld === 'lat') lat += delta; else lng += delta;
    }
    punten.push([lat / 1e5, lng / 1e5]);
  }
  return punten;
}
