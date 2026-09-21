# Reisplanner Namibië & Botswana

Projectbrief voor Claude Code. Lees dit bestand aan het begin van elke sessie.

## Doel

Een gedeelde webapp waarmee Eric en Ilse samen een self-drive gezinsreis door Namibië en Botswana plannen en onderweg gebruiken. Voertaal van de app en van de communicatie is **Nederlands**.

Gebruikers: precies twee (Eric en Ilse), op laptop én telefoon, evenveel. Beiden mogen alles lezen en bewerken.

## Reisgegevens

- Bestemming: Namibië en Botswana, self-drive.
- Periode: zomer 2027 (juli/augustus), 4 weken = 28 dagen. Exacte datums nog niet bekend: startdatum instelbaar, de app rekent dagen en datums daaruit af.
- Reizigers: drie personen: Eric, Ilse en hun kind. Paklijst, documenten en activiteiten kunnen per persoon worden toegewezen.
- Totaalbudget: nog vast te stellen, instelbaar in de app.
- Let op: de Nederlandse zomer is daar het droge winterseizoen, met warme dagen en koude nachten (belangrijk voor paklijst en kampeerders).
- `supabase/seed.sql` maakt een voorbeeldreis "Namibië & Botswana 2027" aan met 28 lege dagen en de standaard-taken (visum Namibië, grensvergunning huurauto, malariapreventie, paspoorten controleren).

## Werkwijze (belangrijk)

- We bouwen **stap voor stap**. Werk alleen aan de stap die gevraagd wordt.
- Een stap is pas klaar als alle acceptatiecriteria aantoonbaar werken en de tests slagen.
- Stel vragen als een keuze onduidelijk is, in plaats van te gokken. Maximaal een paar vragen tegelijk.
- Houd het eenvoudig: geen framework, geen build-stap. Leesbare code met korte Nederlandse commentaarregels waar nuttig.
- Commit na elke afgeronde deelstap met een duidelijke Nederlandse commitboodschap.
- Werk de sectie "Status" onderaan dit bestand bij als een stap klaar is.

## Stack en beslissingen

- **Frontend:** plain HTML, CSS en JavaScript (ES modules), zonder build-stap.
- **Hosting:** GitHub Pages (statische bestanden uit de repo).
- **Data, login en synchronisatie:** Supabase (Postgres + Auth + Realtime), via `@supabase/supabase-js` uit een CDN.
  - Inloggen met e-mail via magic link (geen wachtwoorden).
  - Row Level Security op alle tabellen: alleen leden van een reis zien en wijzigen die reis.
  - De publishable/anon key mag in de frontend staan (RLS beschermt de data). Nooit de service_role key in de repo.
  - Configuratie (Supabase-URL en publishable key) in `js/config.js`.
- **Kaart:** Leaflet met OpenStreetMap-tegels (vanaf stap 3).
- **Afstanden en rijtijden:** OpenRouteService (vanaf stap 3). Resultaten opslaan in de database, niet steeds opnieuw opvragen.
- **Offline:** service worker / PWA (stap 8), maar houd er vanaf het begin rekening mee: onderweg is er vaak geen bereik.
- **Tests:** Playwright voor end-to-end rooktests (alleen als devDependency; de app zelf heeft geen npm nodig), plus een handmatige testchecklist per stap in `docs/tests.md`.

## Mappenstructuur (voorstel)

```
index.html
css/        (tokens.css, basis.css, componenten.css)
js/         (app.js, config.js, auth.js, db.js, router.js, schermen/*.js)
supabase/   (schema.sql, policies.sql, seed.sql)
docs/       (tests.md, beslissingen.md)
tests/      (Playwright-tests)
```

## Schermen (uit het goedgekeurde ontwerp)

Telefoon: onderste navigatiebalk met vijf tabbladen.

1. **Overzicht** – countdown tot vertrek, budgetbalk (betaald / gepland / vrij), tellers (dagen gepland, open taken, te boeken), eerstvolgende taken.
2. **Dagen** – tijdlijn per week (week-chips), per dag: dagnummer, datum, titel, plaats, overnachting met boekingsstatus, activiteiten per dagdeel (ochtend/middag/avond), gekoppelde links/taken/kosten, notitie.
3. **Route** – kaart met stops en etappes, lijst van etappes met afstand, rijtijd, wegtype en een waarschuwing bij lange rijdagen.
4. **Budget** – totaalbudget, per categorie begroot vs. betaald, valutaschakelaar EUR / NAD / BWP, uitgave toevoegen.
5. **Meer** – To-do & paklijst, Boekingen, Links, Documenten, Gezondheid, Reisdagboek, Noodinfo (offline).

Laptop: zijbalk links met dezelfde onderdelen; bij Dagen staan daglijst, kaart en dagdetails naast elkaar.

## Ontwerp (safari-sfeer)

```
--zand:        #F4EFE4  achtergrond
--kaart:       #FFFDF8  kaarten/panelen
--rand:        #E3DACA
--inkt:        #2B2A22  tekst
--gedempt:     #6B6656  secundaire tekst
--groen:       #3F5A3A  hoofdkleur, Eric
--groen-licht: #E4EADF
--oker:        #A8611E  accent, waarschuwingen, Ilse
--oker-licht:  #F6E7D2  (tekst daarop: #7A4210)
--gepland:     #C9A56E
```

Lettertypen: Fraunces (koppen, 600) en Work Sans (tekst 400/500/600) via Google Fonts, met systeemfont als terugval. Afgeronde kaarten (radius 16–20px), aanraakdoelen minimaal 44px, contrast minimaal 4,5:1, echte `<button>`/`<a>`/`<label>`-elementen. Geen emoji als iconen: eenvoudige inline SVG-lijniconen.

## Datamodel

Alles hangt aan een reis (`trip_id`), zodat de app later voor een volgende reis bruikbaar is. Alle tabellen krijgen `id uuid`, `created_at`, `updated_at` en `updated_by`.

| Tabel | Belangrijkste velden |
|---|---|
| trips | naam, startdatum, einddatum, basisvaluta (EUR), totaalbudget, max_rijuren_per_dag (standaard 4) |
| trip_members | trip_id, user_id (mag leeg zijn), email, rol. Uitnodigen gaat via e-mail: wie inlogt met dat adres, is lid |
| places | naam, land (NA/BW), type (stad, park, camping, lodge, grenspost, tankstation), lat, lng, notitie |
| days | datum, dagnummer, titel, overnachting_place_id, notitie, dagboek |
| activities | day_id, titel, dagdeel of tijd, place_id, kosten, minimumleeftijd kind, notitie |
| legs | van_place_id, naar_place_id, day_id, afstand_km, rijtijd_min, wegtype (asfalt/grind/zand, 4x4), grensovergang ja/nee, brandstofkosten |
| bookings | type (vlucht, auto, verblijf, activiteit, park), titel, bevestigingsnr, annuleringsdatum, status (idee, nog boeken, geboekt, betaald), day_id, kosten |
| expenses | bedrag, valuta (EUR/NAD/BWP), bedrag_eur, categorie, status (gepland/betaald), booking_id, day_id, betaald_door |
| tasks | titel, deadline, toegewezen_aan (Eric/Ilse), klaar, categorie, day_id/booking_id |
| links | url, titel, categorie, day_id/place_id/task_id |
| packing_items | titel, groep, voor wie, ingepakt |
| documents | persoon, type (paspoort, visum, rijbewijs, verzekering), nummer niet opslaan, vervaldatum, status, notitie |

Budgetcategorieën: Vluchten, 4x4-huurauto & brandstof, Lodges & campings, Parkgelden & safari's, Eten & boodschappen, Visum/grens & verzekering, Buffer.

## Specifiek voor Namibië en Botswana

- **Valuta:** EUR (basis), NAD (Namibische dollar, gekoppeld aan de rand) en BWP (Botswaanse pula). Koersen handmatig instelbaar; later eventueel automatisch.
- **Grindwegen:** veel etappes zijn grind of zand. Routeservices schatten rijtijden daar vaak te optimistisch. Gebruik per etappe een instelbare correctiefactor op basis van het wegtype en toon de gecorrigeerde rijtijd.
- **Lange rijdagen:** waarschuwing als een dag boven `max_rijuren_per_dag` uitkomt, en bij rijden na zonsondergang afraden.
- **Grensovergang:** etappes met grensovergang markeren; koppelen aan taken (grensvergunning huurauto, documenten).
- **Visum:** Nederlanders hebben voor Namibië een visum nodig (e-visum vooraf of visum bij aankomst). Opnemen in de standaard-takenlijst.
- **Offline:** noodinfo, dagplanning en boekingsgegevens moeten onderweg zonder bereik beschikbaar zijn.
- **Kind:** veel activiteiten en lodges hanteren een minimumleeftijd; veld in activities en een waarschuwing.

## Privacy

Sla geen paspoort-, visum- of creditcardnummers op in de database. Alleen type, vervaldatum en status.

## Stappenplan

0. Keuzes, datamodel en ontwerp – **klaar** (ontwerp goedgekeurd in claude.ai)
1. Skelet: navigatie, layout telefoon/laptop, login, gedeelde opslag, export/import
2. Dagplanning
3. Route met kaart, afstanden en rijtijden
4. Budgetplanner
5. To-do-lijst
6. Links
7. Extra: boekingen, paklijst, documenten/gezondheid/noodinfo, dashboard, reisdagboek
8. Afronding: offline (PWA), printversie, prestaties, eindtest op beide telefoons

## Stap 1 – acceptatiecriteria

- [x] `supabase/schema.sql` en `supabase/policies.sql` maken alle tabellen met RLS aan; uitvoerbaar in de Supabase SQL-editor.
- [x] Inloggen met magic link werkt, lokaal en op GitHub Pages. Uitloggen werkt.
- [x] Na eerste login: een reis aanmaken en een tweede persoon uitnodigen via e-mail.
- [x] Navigatie tussen de vijf onderdelen werkt (hash-router), met lege schermen die al de juiste kop en layout hebben.
- [x] Telefoonlayout met onderste navigatiebalk, laptoplayout (vanaf ± 900px) met zijbalk.
- [x] Overzicht toont de reisnaam en een werkende countdown op basis van de startdatum.
- [x] Een test-notitie die Eric opslaat, verschijnt zonder herladen bij Ilse (Realtime).
- [x] Export van alle reisdata naar een JSON-bestand en import daarvan werkt.
- [x] Een gebruiker die geen lid is, ziet niets van de reis (RLS gecontroleerd).
- [x] Playwright-rooktest: app laadt, navigatie werkt op telefoon- en laptopbreedte.
- [x] `docs/tests.md` bevat de handmatige checklist voor stap 1, afgevinkt.

## Status

- Stap 0: klaar
- Stap 1: klaar
- Stap 2: klaar
