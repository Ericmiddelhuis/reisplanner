-- Eenmalig gebruiken: maakt de INHOUD van de reis leeg (testdata), met behoud van de reis zelf,
-- de reisinstellingen (naam, startdatum, budget, wisselkoersen, gezondheid/noodinfo) en de leden.
-- Voer dit handmatig uit in de Supabase SQL-editor. Dit kan niet ongedaan worden gemaakt.

-- Stap 1: controleer dat dit precies de reis(en) is die je verwacht, vóórdat je hieronder verwijdert.
select id, naam, startdatum from trips;

-- Stap 2: pas hieronder uit als de bovenstaande lijst klopt (normaal precies één reis).
-- Verwijdert alle dagen, activiteiten, route, budgetposten, taken, links, paklijst, documenten en boekingen.
-- Trips, trip_members, en de reisinstellingen zelf blijven ongewijzigd staan.
delete from expenses    where trip_id in (select id from trips);
delete from budgetten   where trip_id in (select id from trips);
delete from tasks       where trip_id in (select id from trips);
delete from links       where trip_id in (select id from trips);
delete from packing_items where trip_id in (select id from trips);
delete from documents   where trip_id in (select id from trips);
delete from legs        where trip_id in (select id from trips);
delete from bookings    where trip_id in (select id from trips);
delete from activities  where trip_id in (select id from trips);
delete from days        where trip_id in (select id from trips);
delete from places      where trip_id in (select id from trips);

-- Bij het eerstvolgende bezoek aan "Dagen" maakt de app automatisch weer 28 lege dagen aan,
-- gebaseerd op de (behouden) startdatum.
