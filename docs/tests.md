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
- [ ] De vier standaardtaken uit `seed.sql` (visum, grensvergunning, malaria, paspoorten) zijn zichtbaar bij Meer.
- [ ] Taak toevoegen, toewijzen aan Eric of Ilse, en afvinken.
- [ ] Wijziging van Eric (nieuwe taak, afvinken) verschijnt zonder herladen bij Ilse.
- [ ] Reisinstellingen, leden uitnodigen en export/import werken nog steeds na het herschrijven van het scherm.

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
