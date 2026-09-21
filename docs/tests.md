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

## Stap 2 – Dagplanning

### Automatisch (Playwright, geslaagd; `tests/dagen.spec.js`)
- [x] Bij het eerste bezoek worden 28 dagen aangemaakt, met datums vanaf de startdatum; einddatum volgt de laatste dag.
- [x] Dag toevoegen aan het einde; dag verwijderen (ook halverwege: latere dagen schuiven op en krijgen nieuwe datums).
- [x] Titel bewerken; plaats aanmaken en kiezen als overnachting; boekingsstatus instellen en weer wissen.
- [x] Activiteit per dagdeel toevoegen, bewerken (ander dagdeel) en verwijderen; kosten en minimumleeftijd zichtbaar.
- [x] Telefoon: lijst, dan detail met terugknop. Laptop: lijst en details naast elkaar.

### Handmatig (echte Supabase, op Pages en telefoon)
- [ ] Eerste keer Dagen openen maakt precies 28 dagen (ook als Eric en Ilse tegelijk openen: geen dubbele dagen).
- [ ] Startdatum wijzigen bij Meer: datums bij Dagen lopen mee.
- [ ] Wijziging van Eric (titel, overnachting, activiteit) verschijnt zonder herladen bij Ilse.
- [ ] Tijdens typen wordt het scherm niet overschreven door een wijziging van de ander.
- [ ] Dag verwijderen op de telefoon en terug naar de lijst.
- [ ] Plaats aanmaken vanuit een activiteit en vanuit de overnachting.
