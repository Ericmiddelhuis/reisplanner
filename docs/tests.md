# Testchecklist

Automatische rooktests: `npm test` (Playwright; nabootsing van Supabase, dus geen echte login nodig).

## Stap 1 – Skelet

Afvinken na handmatig testen met de echte Supabase en (waar genoemd) op GitHub Pages.

### Automatisch (Playwright, geslaagd)
- [x] App laadt; zonder sessie verschijnt het inlogscherm.
- [x] Overzicht toont reisnaam, countdown en notitie.
- [x] Navigatie tussen de vijf onderdelen werkt op telefoonbreedte (onderbalk) en laptopbreedte (zijbalk).

### Handmatig
- [x] `schema.sql` en `policies.sql` lopen foutloos in de Supabase SQL-editor.
- [x] Inloggen met magic link werkt lokaal (`python3 -m http.server 8000`).
- [x] Inloggen met magic link werkt op GitHub Pages.
- [x] Uitloggen werkt.
- [x] Na eerste login: reis aanmaken lukt.
- [x] Ilse uitnodigen via Meer; zij kan inloggen en ziet dezelfde reis.
- [x] Notitie van Eric verschijnt zonder herladen bij Ilse (Realtime).
- [x] Export geeft een JSON-bestand; import van dat bestand werkt.
- [x] Een niet-lid (ander e-mailadres) ziet geen reis en krijgt de "Nieuwe reis"-pagina.
- [x] Layout op een echte telefoon en op laptop gecontroleerd.
