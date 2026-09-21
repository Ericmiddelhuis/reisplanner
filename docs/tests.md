# Testchecklist

Automatische rooktests: `npm test` (Playwright; nabootsing van Supabase, dus geen echte login nodig).

## Stap 1 – Skelet

Afvinken na handmatig testen met de echte Supabase en (waar genoemd) op GitHub Pages.

### Automatisch (Playwright, geslaagd)
- [x] App laadt; zonder sessie verschijnt het inlogscherm.
- [x] Overzicht toont reisnaam, countdown en notitie.
- [x] Navigatie tussen de vijf onderdelen werkt op telefoonbreedte (onderbalk) en laptopbreedte (zijbalk).

### Handmatig
- [ ] `schema.sql` en `policies.sql` lopen foutloos in de Supabase SQL-editor.
- [ ] Inloggen met magic link werkt lokaal (`python3 -m http.server 8000`).
- [ ] Inloggen met magic link werkt op GitHub Pages.
- [ ] Uitloggen werkt.
- [ ] Na eerste login: reis aanmaken lukt.
- [ ] Ilse uitnodigen via Meer; zij kan inloggen en ziet dezelfde reis.
- [ ] Notitie van Eric verschijnt zonder herladen bij Ilse (Realtime).
- [ ] Export geeft een JSON-bestand; import van dat bestand werkt.
- [ ] Een niet-lid (ander e-mailadres) ziet geen reis en krijgt de "Nieuwe reis"-pagina.
- [ ] Layout op een echte telefoon en op laptop gecontroleerd.
