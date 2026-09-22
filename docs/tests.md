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
- [x] Eerste keer Dagen openen maakt precies 28 dagen (ook als Eric en Ilse tegelijk openen: geen dubbele dagen).
- [x] Startdatum wijzigen bij Meer: datums bij Dagen lopen mee.
- [x] Wijziging van Eric (titel, overnachting, activiteit) verschijnt zonder herladen bij Ilse.
- [x] Tijdens typen wordt het scherm niet overschreven door een wijziging van de ander.
- [x] Dag verwijderen op de telefoon en terug naar de lijst.
- [x] Plaats aanmaken vanuit een activiteit en vanuit de overnachting.

## Stap 3 – Route met kaart

Eenmalig eerst `supabase/stap3.sql` uitvoeren in de Supabase SQL-editor (kolom `legs.geometrie`).

### Automatisch (Playwright, geslaagd; `tests/route.spec.js`)
- [x] Routelijn (encoded polyline) wordt goed gedecodeerd.
- [x] Kaart toont een pin per plaats met locatie; plaatsen zonder locatie worden gemarkeerd.
- [x] "Etappes maken uit overnachtingen" maakt etappes, berekent afstand/rijtijd/routelijn en slaat ze op.
- [x] Wegtype zet de standaard correctiefactor; gecorrigeerde rijtijd wordt getoond; grensovergang wordt gemarkeerd.
- [x] Waarschuwing bij meer rijuren dan het maximum, en bij rijden na zonsondergang; geen waarschuwing als het past.
- [x] Plaats zoeken via OpenStreetMap vult naam, land en coördinaten in; plaats op de kaart kiezen vult coördinaten voor.
- [x] Telefoon: geen horizontaal scrollen.

### Handmatig (echte Supabase en OpenRouteService)
- [x] `stap3.sql` foutloos uitgevoerd.
- [x] Kaart laadt op Pages en op de telefoon, met OpenStreetMap-tegels en attributie.
- [x] Plaatsen zoeken (bijv. Sesriem, Etosha, Kasane) geeft bruikbare resultaten.
- [x] Bij Dagen overnachtingen kiezen, dan bij Route "Etappes maken uit overnachtingen": afstanden en routelijnen verschijnen.
- [x] Routes staan er na herladen nog (uit de database, niet opnieuw opgevraagd).
- [x] Marker verslepen slaat de nieuwe plek op en berekent de routes opnieuw.
- [x] Max. rijuren per dag aanpassen bij Meer verandert de waarschuwingen.
- [x] Wijziging van Eric (plaats/etappe) verschijnt zonder herladen bij Ilse.

## Stap 4 – Budgetplanner

Eenmalig eerst `supabase/stap4.sql` uitvoeren in de Supabase SQL-editor (tabel `budgetten`).

### Automatisch (Playwright, geslaagd; `tests/budget.spec.js`)
- [x] Zonder totaalbudget of uitgaven: geen balk, wel een duidelijke melding.
- [x] Uitgave toevoegen telt mee in de budgetbalk en bij de juiste categorie.
- [x] Uitgave in NAD/BWP wordt correct naar EUR omgerekend en zo meegeteld.
- [x] Categorie omschakelen tussen handmatig begroot bedrag en afgeleid uit de uitgaven, in beide richtingen.
- [x] Valutaschakelaar (EUR/NAD/BWP) toont bedragen omgerekend.
- [x] Wisselkoers aanpassen werkt door in de weergave.
- [x] Totaalbudget instellen toont het vrije bedrag; waarschuwing bij overschrijding.
- [x] Uitgave bewerken en verwijderen.
- [x] Geen letterlijke "null" op het scherm (regressietest voor een gevonden weergavefout).
- [x] Telefoon: geen horizontaal scrollen.

### Handmatig (echte Supabase)
- [ ] `stap4.sql` foutloos uitgevoerd.
- [ ] Totaalbudget instellen bij Budget; balk en "vrij"-bedrag kloppen.
- [ ] Een paar uitgaven toevoegen in verschillende valuta en categorieën.
- [ ] Een categorie op handmatig zetten, een bedrag invullen, en weer terug naar afgeleid.
- [ ] Valutaschakelaar en wisselkoersen aanpassen; bedragen kloppen in NAD en BWP.
- [ ] Wijziging van Eric (uitgave, begroting) verschijnt zonder herladen bij Ilse.

## Stap 4, correctie (naar aanleiding van handmatig testen)

Eenmalig `supabase/stap4b.sql` uitvoeren in de Supabase SQL-editor (kolom `activities.categorie`).

1. Kosten van een activiteit (Dagen) telden niet mee bij Budget. Opgelost: een activiteit met kosten heeft nu ook
   een categorie; die kosten tellen als "gepland" mee in de budgetbalk en bij de betreffende categorie. Ze blijven
   beheerd via Dagen en staan niet als losse regel bij Uitgaven.
2. "Betaald door" (Eric/Ilse) is verwijderd uit de uitgave-dialoog en de uitgavenlijst: geen onderscheid meer wie betaalde.

### Automatisch (Playwright, geslaagd)
- [x] Activiteit met kosten en categorie telt mee in de budgetbalk en de juiste categoriekaart (`tests/budget.spec.js`).
- [x] Geen "betaald door"-veld meer bij een uitgave (`tests/budget.spec.js`).
- [x] Activiteit-dialoog slaat de gekozen categorie op (`tests/dagen.spec.js`).

### Handmatig
- [ ] `stap4b.sql` foutloos uitgevoerd.
- [ ] Activiteit met kosten en een categorie toevoegen bij Dagen; bedrag verschijnt bij Budget.
