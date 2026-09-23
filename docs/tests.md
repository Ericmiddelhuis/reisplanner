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
- [x] `stap4.sql` foutloos uitgevoerd.
- [x] Totaalbudget instellen bij Budget; balk en "vrij"-bedrag kloppen.
- [x] Een paar uitgaven toevoegen in verschillende valuta en categorieën.
- [x] Een categorie op handmatig zetten, een bedrag invullen, en weer terug naar afgeleid.
- [x] Valutaschakelaar en wisselkoersen aanpassen; bedragen kloppen in NAD en BWP.
- [x] Wijziging van Eric (uitgave, begroting) verschijnt zonder herladen bij Ilse.

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
- [x] `stap4b.sql` foutloos uitgevoerd.
- [x] Activiteit met kosten en een categorie toevoegen bij Dagen; bedrag verschijnt bij Budget.

## Stap 4, correctie 2: brandstofkosten uit Route

Geen nieuwe migratie nodig (`legs.brandstofkosten` bestond al).

Brandstofkosten bij een etappe tellen nu mee in de budgetbalk en altijd bij de categorie "4x4-huurauto & brandstof"
(geen keuze nodig: brandstof hoort daar altijd bij, anders dan bij activiteiten).

### Automatisch (Playwright, geslaagd)
- [x] Brandstofkosten van een etappe tellen mee in de budgetbalk en bij "4x4-huurauto & brandstof" (`tests/budget.spec.js`).

### Handmatig
- [x] Brandstofkosten invullen bij een etappe (Route); bedrag verschijnt bij Budget onder 4x4-huurauto & brandstof.

## Stap 5 – To-do-lijst

`meer.js` is herschreven naar dezelfde opzet als de andere schermen (geen inhoudelijke wijziging aan
reisinstellingen/leden/back-up, wel gecontroleerd met een regressietest).

### Automatisch (Playwright, geslaagd; `tests/meer.spec.js`)
- [x] Reisinstellingen nog steeds bruikbaar (regressie na het herschrijven van het scherm).
- [x] Standaardfilter toont alleen open taken; Klaar en Alle werken.
- [x] Taak toevoegen met deadline, toewijzing, categorie en gekoppelde dag.
- [x] Taak afvinken via het selectievakje, zonder de bewerk-dialoog te openen.
- [x] Verlopen taak (deadline in het verleden, niet klaar) krijgt een badge; zonder deadline geen badge.
- [x] Taak bewerken en verwijderen.
- [x] Telefoon: geen horizontaal scrollen.

### Handmatig (echte Supabase)
- [x] De vier standaardtaken uit `seed.sql` (visum, grensvergunning, malaria, paspoorten) zijn zichtbaar (inmiddels bij het eigen tabblad To-do, zie de correctie hieronder).
- [x] Taak toevoegen, toewijzen aan Eric of Ilse, en afvinken.
- [x] Wijziging van Eric (nieuwe taak, afvinken) verschijnt zonder herladen bij Ilse.
- [x] Reisinstellingen, leden uitnodigen en export/import werken nog steeds na het herschrijven van het scherm.

## Stap 5, correctie: To-do als eigen tabblad

Op verzoek is To-do losgetrokken van Meer en een eigen tabblad geworden (zes tabbladen in plaats van vijf).
`js/schermen/todo.js` bevat nu de to-do-logica; `js/schermen/meer.js` bevat weer alleen reisinstellingen, leden en back-up.

### Automatisch (Playwright, geslaagd)
- [x] To-do is een eigen tabblad met eigen route (`tests/todo.spec.js`, verplaatst uit `tests/meer.spec.js`).
- [x] Navigatie telt zes tabbladen, inclusief To-do, op telefoon en laptop (`tests/rook.spec.js`).
- [x] Meer bevat geen to-do meer; reisinstellingen werken nog (`tests/meer.spec.js`).

## Stap 6 – Links

Geen nieuwe migratie nodig: de tabel `links` en de RLS-policy daarvoor bestonden al sinds stap 1.
Links staan als kaart bij **Meer** (niet als eigen tabblad, zie het bijgewerkte "Schermen"-overzicht in `CLAUDE.md`).

Tijdens het bouwen is ook een sluimerende testbrosheid opgelost: `tests/nepdb.js` gebruikte één gedeeld
`REIS`-object voor alle testbestanden. Een wijziging in het ene bestand kon zo per ongeluk doorlekken naar een
andere test die daarna toevallig in dezelfde worker draaide. `nepSupabase()` zet `REIS` nu bij elke aanroep terug
naar de standaardwaarden; de losse `beforeEach`-resets in `dagen.spec.js`, `route.spec.js` en `budget.spec.js`
waren daardoor overbodig en zijn verwijderd.

### Automatisch (Playwright, geslaagd; `tests/links.spec.js`)
- [x] Link toevoegen; een URL zonder `https://` ervoor krijgt dat automatisch.
- [x] Zonder titel wordt de URL zelf getoond.
- [x] Link koppelen aan een dag, plaats en taak tegelijk.
- [x] Link bewerken en verwijderen.
- [x] Een URL van alleen spaties geeft de eigen foutmelding (een echt lege URL vangt het `required`-attribuut al af).
- [x] Telefoon: geen horizontaal scrollen, ook met een lange titel.

### Handmatig (echte Supabase)
- [x] Link toevoegen en openen (opent in een nieuw tabblad).
- [x] Link koppelen aan een dag/plaats/taak en controleren dat de koppeling klopt.
- [x] Wijziging van Eric verschijnt zonder herladen bij Ilse.

## Stap 7 – Boekingen, Paklijst, Documenten, Gezondheid, Reisdagboek, Noodinfo

Eenmalig eerst `supabase/stap7.sql` uitvoeren in de Supabase SQL-editor (twee tekstvelden op `trips`;
Boekingen/Paklijst/Documenten gebruiken tabellen die al sinds stap 1 bestaan).

**Grotere wijziging:** "Meer" is nu een echt menu in plaats van één lange pagina. Elk onderdeel (ook de eerder
gebouwde Reisinstellingen, Links, Leden, Back-up) is een eigen pagina onder `#/meer/...` met een terugknop. Dat was
nodig omdat deze stap zes onderdelen toevoegt; alles op één pagina was niet meer bruikbaar.

**Onderweg gevonden en gerepareerd, geen onderdeel van de gevraagde stap:**
- Wijzigingen aan Links van de ander verschenen niet vanzelf: de tabel `links` ontbrak in de Realtime-lijst in `app.js`
  sinds stap 6. Nu toegevoegd, samen met `packing_items` en `documents`.
- Export/import (stap 1) nam de tabel `budgetten` niet mee sinds stap 4. Toegevoegd aan de lijst in `db.js`.

### Automatisch (Playwright, geslaagd)
- [x] Menu toont alle onderdelen als echte links; navigeren en terug werkt (`tests/meer.spec.js`).
- [x] Reisinstellingen en leden uitnodigen werken nog na het verplaatsen (regressie, `tests/meer.spec.js`).
- [x] Boekingen: toevoegen, filteren op status, een automatisch aangemaakte overnachting aanvullen, verwijderen (`tests/boekingen.spec.js`).
- [x] Paklijst: toevoegen met groep/voor wie, afvinken, filteren, bewerken, verwijderen (`tests/paklijst.spec.js`).
- [x] Documenten: toevoegen zonder documentnummerveld, badge bij verlopen en bij bijna verlopen (binnen 6 maanden), geen badge als er nog ruim geldigheid is (`tests/documenten.spec.js`).
- [x] Gezondheid en Noodinfo: tekst opslaan en na herladen nog aanwezig; veiligheidsmelding bij Noodinfo zichtbaar (`tests/gezondheid.spec.js`, `tests/noodinfo.spec.js`).
- [x] Reisdagboek: elke dag heeft een eigen, onafhankelijk tekstveld (`tests/reisdagboek.spec.js`).
- [x] Dagboek bij Dagen is een apart veld van de planningsnotitie (`tests/dagen.spec.js`).
- [x] Boekingskosten tellen mee bij Budget, verdeeld naar betaald/gepland op basis van hun eigen status (`tests/budget.spec.js`).
- [x] Telefoon: geen horizontaal scrollen, op alle nieuwe schermen.

### Handmatig (echte Supabase)
- [x] `stap7.sql` foutloos uitgevoerd.
- [x] Boeking toevoegen, en de automatisch aangemaakte overnachtingsboekingen aanvullen met kosten/bevestiging.
- [x] Paklijst gebruiken voor de hele reis.
- [x] Een document per persoon toevoegen (geen nummers!) en de verval-badges controleren met echte datums.
- [x] Gezondheid en Noodinfo invullen; Noodinfo vóór vertrek zelf controleren op actuele nummers.
- [x] Reisdagboek bijhouden tijdens/na (een deel van) de reis.
- [x] Wijziging van Eric bij elk nieuw onderdeel verschijnt zonder herladen bij Ilse.

## Stap 8 – Offline (PWA), printversie, prestaties, eindtest

Geen nieuwe Supabase-migratie: deze stap voegt alleen frontend-bestanden toe (`manifest.json`, `sw.js`, `icons/`,
`css/print.css`, `js/offline.js`) en een offline-cache in `js/db.js`.

**Offline, hoe het werkt:**
- `sw.js` cachet de app-schil (HTML/CSS/JS) zodat de app zelf ook zonder bereik opent. Reisdata (Supabase),
  routes (OpenRouteService/Nominatim) en kaarttegels worden nooit door de service worker gecachet: die moeten
  actueel zijn.
- Elke geslaagde ophaling van dagen/boekingen/taken/enz. wordt apart in localStorage bewaard (`js/db.js`). Lukt een
  ophaling niet (geen netwerk), dan valt het scherm terug op die laatste versie, met een balkje "Offline — laatst
  opgehaald op ...". Een echte serverfout (bijv. geen toegang meer) wordt nooit verborgen achter oude cache.
- Werkt pas nadat de app minstens één keer online is geopend op dat toestel.
- Kaarten (Route) hebben altijd internet nodig voor de tegels; de etappelijst met afstand/rijtijd werkt wel offline.

**Gevonden en opgelost tijdens het bouwen:**
- Supabase-js probeert bij een netwerkfout intern een paar keer opnieuw (~7,5 seconden) voor het de fout teruggeeft.
  Voor onderweg is dat te traag: er is een eigen tijdslimiet van 6 seconden toegevoegd, waarna de app alvast de
  cache gebruikt.
- Een geregistreerde service worker onderschepte in de Playwright-tests de nagemaakte netwerkverzoeken. Opgelost
  met een `navigator.webdriver`-check in `app.js`: in geautomatiseerd geteste browsers registreert de service
  worker zich niet; bij Eric en Ilse (geen webdriver) gebeurt dat gewoon wel (zie `tests/pwa.spec.js`).

**Printversie:** Meer → Printversie (`#/meer/print`) toont dagplanning, boekingen, gezondheid en noodinfo samengevat
op één pagina, met een "Printen"-knop. `css/print.css` verbergt bij het printen de navigatie en knoppen.

**Prestaties:** preconnect toegevoegd voor cdn.jsdelivr.net (naast de al bestaande voor Google Fonts); Leaflet werd
al lazy geladen (alleen bij bezoek aan Route, sinds stap 3); de service worker maakt herhaalde bezoeken vrijwel
direct laden.

### Automatisch (Playwright, geslaagd)
- [x] Manifest, thema-kleur en iconen staan in de pagina en zijn opvraagbaar (`tests/pwa.spec.js`).
- [x] `sw.js` bestaat en cachet nooit de reisdata- of kaart-API's (`tests/pwa.spec.js`).
- [x] Service worker registreert zich in een echte (niet-webdriver) browser (`tests/pwa.spec.js`).
- [x] Eerder geladen dagen blijven zichtbaar zonder netwerk, met een offline-melding; de melding verdwijnt weer
      zodra het lukt (`tests/offline.spec.js`).
- [x] Een echte serverfout wordt getoond, nooit verborgen achter verouderde cache (`tests/offline.spec.js`).
- [x] Printversie toont dagplanning, boekingen, gezondheid en noodinfo; de printknop werkt (`tests/print.spec.js`).
- [x] Telefoon: geen horizontaal scrollen op de printversie.

### Handmatig — eindtest op de telefoon van Eric én die van Ilse

Dit is de laatste stap: loop dit op **beide telefoons** na, met de echte Supabase-omgeving.

**Installeren als app**
- [x] Site openen in Safari (iPhone) of Chrome (Android), "Zet op beginscherm" / "App installeren" gebruiken.
- [x] Icoon en naam zien er goed uit op het beginscherm.
- [x] Geopend vanaf het beginscherm voelt als een app (geen adresbalk).

**Offline**
- [x] App eenmaal volledig doorlopen met internet (Dagen, Route, Budget, To-do, Meer-onderdelen geopend).
- [x] Vliegtuigstand aan; app sluiten en opnieuw openen: Dagen, Boekingen en Noodinfo tonen nog de laatste data,
      met het offline-balkje.
- [x] Vliegtuigstand uit: balkje verdwijnt, nieuwe wijzigingen slaan weer op.

**Printversie**
- [x] Meer → Printversie → Printen (of naar pdf); de uitdraai is leesbaar, zonder navigatie/knoppen.

**Algehele eindtest (regressie van alle stappen, op beide telefoons)**
- [x] Inloggen met magic link; Overzicht toont countdown en notitie.
- [x] Dagen: navigeren, activiteit toevoegen, overnachting kiezen.
- [x] Route: kaart laadt, etappe bekijken.
- [x] Budget: uitgave toevoegen, categorieën kloppen.
- [x] To-do: taak toevoegen en afvinken.
- [x] Meer: elk onderdeel opent en werkt (Boekingen, Paklijst, Links, Documenten, Gezondheid, Reisdagboek, Noodinfo).
- [x] Een wijziging op de ene telefoon verschijnt zonder herladen op de andere (Realtime).
- [x] Layout en tekst zijn goed leesbaar op beide schermformaten.

## Stap 8, correctie: inloggen met wachtwoord in plaats van magic link

Reden: een link uit Mail opent nooit de geïnstalleerde PWA op het beginscherm, en op iPhone kan die zelfs een
andere opslag gebruiken dan de browser. Daardoor moest je na de installatie steeds opnieuw inloggen. Met een
wachtwoord log je rechtstreeks in de app zelf in, zonder omweg via Mail.

Geen Supabase-instellingen nodig: wachtwoord-inloggen zit al bij dezelfde "Email"-provider als de magic link.

**Voor Eric en Ilse:** jullie bestaande accounts hebben nog geen wachtwoord. Ga naar het inlogscherm, gebruik
"Nog geen wachtwoord, of vergeten?" met je eigen e-mailadres, en stel via de mail die je krijgt eenmalig een
wachtwoord in. Daarna gewoon inloggen met e-mail + wachtwoord, ook op de geïnstalleerde app.

### Automatisch (Playwright, geslaagd; `tests/auth.spec.js`)
- [x] Inlogscherm toont e-mail + wachtwoord, met een aparte sectie om een wachtwoord in te stellen/resetten.
- [x] Inloggen met een verkeerd wachtwoord toont de foutmelding van Supabase.
- [x] Een wachtwoordlink aanvragen toont een bevestiging.
- [x] Nieuw wachtwoord instellen via de link: wachtwoorden die niet overeenkomen geven een foutmelding; bij een
      geslaagde match ga je gewoon door naar de reis.
- [x] Telefoon: geen horizontaal scrollen op het inlogscherm.

### Handmatig (echte Supabase, op Pages en telefoon)
- [x] Eric stelt een wachtwoord in via "Nog geen wachtwoord, of vergeten?" en logt daarmee in.
- [x] Ilse doet hetzelfde.
- [x] Inloggen met wachtwoord werkt rechtstreeks in de geïnstalleerde app op het beginscherm (geen omweg via Mail meer).
- [x] Een verkeerd wachtwoord geeft een begrijpelijke foutmelding.
- [x] Wachtwoord vergeten opnieuw aanvragen werkt.

## Correctie: gedeelde notitie op Overzicht

Twee problemen tegelijk opgelost:
1. Een lege notitie opslaan (het veld leegmaken en op Opslaan drukken) leek niet te blijven staan: de lokale
   status werd na het opslaan niet bijgewerkt, dus tot de Realtime-echo binnenkwam leek de oude tekst terug te komen.
2. Nieuwe werkwijze op verzoek: het invoerveld staat voortaan standaard leeg. Opslaan toont de tekst erboven en
   leegt het veld weer. Een "Bewerken"-knop (zichtbaar zodra er een notitie is) laadt de huidige tekst terug in
   het veld om aan te passen; zonder die knop te gebruiken blijft de bestaande notitie met rust.

### Automatisch (Playwright, geslaagd; `tests/overzicht.spec.js`)
- [x] Nieuwe notitie opslaan leegt het veld en toont de tekst erboven; de "Bewerken"-knop verschijnt.
- [x] Bewerken laadt de huidige notitie in het veld; opslaan overschrijft en leegt het veld weer.
- [x] Notitie leegmaken en opslaan verwijdert hem echt (ook lokaal, zonder op Realtime te hoeven wachten) en blijft
      leeg na een nieuwe render.

### Handmatig
Niet meer van toepassing: dit tussenontwerp (één tekstveld, leegt na opslaan) is vlak hierna alweer vervangen
door de lijst-opzet hieronder, op verzoek. De handmatige test is daar gedaan, niet voor dit tussenontwerp.

## Correctie: notities worden een lijst in plaats van één tekstveld

Op verzoek: gedeelde notities op Overzicht zijn nu losse, bewaarde items (nieuwe tabel `notities`) in plaats van
één tekstveld op de reis. Nieuwe notities toevoegen laat bestaande gewoon staan; "Bewerken" past alleen die ene
notitie aan. Elke notitie toont een datum- en tijdstempel (`dagTijd` in `js/util.js`).

Eenmalig `supabase/stap9.sql` uitvoeren in de Supabase SQL-editor (nieuwe tabel `notities`, met RLS en Realtime).
Het oude tekstveld `trips.notitie` blijft ongebruikt in de database staan; niet verwijderd.

### Automatisch (Playwright, geslaagd; `tests/overzicht.spec.js`)
- [x] Nieuwe notitie toevoegen met datumstempel; bestaande notitie blijft staan.
- [x] Bewerken past alleen die ene notitie aan; de andere blijft ongewijzigd.
- [x] Notitie verwijderen.
- [x] Een lege notitie kan niet worden opgeslagen.

### Handmatig (echte Supabase)
- [x] `stap9.sql` foutloos uitgevoerd.
- [x] Notitie toevoegen, een tweede toevoegen; beide blijven staan met een datumstempel.
- [x] Een bestaande notitie bewerken via de knop erop.
- [x] Wijziging van Eric (nieuwe of bewerkte notitie) verschijnt zonder herladen bij Ilse.
