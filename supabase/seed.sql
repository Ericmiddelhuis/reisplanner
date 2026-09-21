-- Voorbeeldreis "Namibië & Botswana 2027" met 28 lege dagen en de standaard-taken.
-- Uitvoeren ná schema.sql en policies.sql. Startdatum is een plaatsvervanger: pas aan in de app.
-- Let op: in de SQL-editor is er geen ingelogde gebruiker, dus voeg daarna leden toe:
--   insert into trip_members (trip_id, email, rol)
--   select id, 'jouw@email.nl', 'eigenaar' from trips where naam = 'Namibië & Botswana 2027';
--   (en hetzelfde voor het adres van Ilse, met rol 'lid')

with nieuwe_reis as (
  insert into trips (naam, startdatum, einddatum, totaalbudget)
  values ('Namibië & Botswana 2027', date '2027-07-10', date '2027-07-10' + 27, null)
  returning id, startdatum
), dagen as (
  insert into days (trip_id, dagnummer, datum)
  select r.id, n, r.startdatum + (n - 1)
  from nieuwe_reis r, generate_series(1, 28) as n
)
insert into tasks (trip_id, titel, categorie, toegewezen_aan)
select r.id, t.titel, t.categorie, null
from nieuwe_reis r,
  (values
    ('Visum Namibië regelen (e-visum vooraf of bij aankomst)', 'Visum/grens'),
    ('Grensvergunning huurauto aanvragen (Botswana)', 'Visum/grens'),
    ('Malariapreventie bespreken met huisarts/GGD', 'Gezondheid'),
    ('Paspoorten controleren (geldigheid en lege pagina''s)', 'Documenten')
  ) as t(titel, categorie);
