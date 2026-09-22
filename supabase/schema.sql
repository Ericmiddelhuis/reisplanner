-- Reisplanner Namibië & Botswana – databaseschema
-- Uitvoeren in de Supabase SQL-editor (eerst schema.sql, dan policies.sql, dan optioneel seed.sql).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Reis en leden
-- ---------------------------------------------------------------
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  startdatum date,
  einddatum date,
  basisvaluta text not null default 'EUR' check (basisvaluta in ('EUR','NAD','BWP')),
  totaalbudget numeric(12,2),
  max_rijuren_per_dag numeric(4,1) not null default 4,
  -- koersen: hoeveel EUR is 1 eenheid van de valuta (handmatig instelbaar)
  koersen jsonb not null default '{"EUR":1,"NAD":0.05,"BWP":0.07}',
  notitie text,
  -- vrij tekstveld: vaccinaties, allergieën, medicatie per persoon
  gezondheid text,
  -- vrij tekstveld: alarmnummers, ambassade, verzekeraar; zelf invullen en controleren vóór vertrek
  noodinfo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,  -- mag leeg zijn tot de eerste login
  email text not null,
  rol text not null default 'lid' check (rol in ('eigenaar','lid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create unique index if not exists trip_members_uniek on trip_members (trip_id, lower(email));

-- ---------------------------------------------------------------
-- Inhoud van de reis (allemaal met trip_id)
-- ---------------------------------------------------------------
create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  naam text not null,
  land text check (land in ('NA','BW')),
  type text check (type in ('stad','park','camping','lodge','grenspost','tankstation')),
  lat double precision,
  lng double precision,
  notitie text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  datum date,
  dagnummer int not null,
  titel text,
  overnachting_place_id uuid references places(id) on delete set null,
  notitie text,
  dagboek text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (trip_id, dagnummer)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  type text not null check (type in ('vlucht','auto','verblijf','activiteit','park')),
  titel text not null,
  bevestigingsnr text,
  annuleringsdatum date,
  status text not null default 'idee' check (status in ('idee','nog boeken','geboekt','betaald')),
  day_id uuid references days(id) on delete set null,
  kosten numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  day_id uuid not null references days(id) on delete cascade,
  titel text not null,
  dagdeel text check (dagdeel in ('ochtend','middag','avond')),
  tijd time,
  place_id uuid references places(id) on delete set null,
  kosten numeric(12,2),
  -- categorie (zelfde lijst als expenses.categorie): kosten met een categorie tellen mee bij Budget
  categorie text check (categorie in (
    'Vluchten','4x4-huurauto & brandstof','Lodges & campings','Parkgelden & safari''s',
    'Eten & boodschappen','Visum/grens & verzekering','Buffer')),
  minimumleeftijd_kind int,
  notitie text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  van_place_id uuid references places(id) on delete set null,
  naar_place_id uuid references places(id) on delete set null,
  day_id uuid references days(id) on delete set null,
  afstand_km numeric(8,1),
  rijtijd_min int,                       -- ruwe schatting van de routeservice
  correctiefactor numeric(4,2) not null default 1,  -- grind/zand rijdt langzamer
  wegtype text check (wegtype in ('asfalt','grind','zand','4x4')),
  grensovergang boolean not null default false,
  brandstofkosten numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Stap 3: opgeslagen routelijn (encoded polyline) van OpenRouteService, zodat we niet opnieuw hoeven op te vragen
alter table legs add column if not exists geometrie text;

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  omschrijving text,
  bedrag numeric(12,2) not null,
  valuta text not null default 'EUR' check (valuta in ('EUR','NAD','BWP')),
  bedrag_eur numeric(12,2),
  categorie text check (categorie in (
    'Vluchten','4x4-huurauto & brandstof','Lodges & campings','Parkgelden & safari''s',
    'Eten & boodschappen','Visum/grens & verzekering','Buffer')),
  status text not null default 'gepland' check (status in ('gepland','betaald')),
  booking_id uuid references bookings(id) on delete set null,
  day_id uuid references days(id) on delete set null,
  betaald_door text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Begroting per categorie. bedrag = null betekent: afgeleid uit de geplande/betaalde uitgaven van die categorie.
create table if not exists budgetten (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  categorie text not null check (categorie in (
    'Vluchten','4x4-huurauto & brandstof','Lodges & campings','Parkgelden & safari''s',
    'Eten & boodschappen','Visum/grens & verzekering','Buffer')),
  bedrag numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (trip_id, categorie)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  titel text not null,
  deadline date,
  toegewezen_aan text check (toegewezen_aan in ('Eric','Ilse')),
  klaar boolean not null default false,
  categorie text,
  day_id uuid references days(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  url text not null,
  titel text,
  categorie text,
  day_id uuid references days(id) on delete set null,
  place_id uuid references places(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  titel text not null,
  groep text,
  voor_wie text,                         -- Eric, Ilse, kind of iedereen
  ingepakt boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Privacy: nooit paspoort-/visumnummers opslaan, alleen type, vervaldatum en status.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  persoon text,
  type text check (type in ('paspoort','visum','rijbewijs','verzekering')),
  vervaldatum date,
  status text,
  notitie text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- ---------------------------------------------------------------
-- updated_at / updated_by automatisch bijhouden
-- ---------------------------------------------------------------
create or replace function set_audit() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['trips','trip_members','places','days','bookings','activities',
    'legs','expenses','budgetten','tasks','links','packing_items','documents'] loop
    execute format('drop trigger if exists audit on %I', t);
    execute format('create trigger audit before insert or update on %I
                    for each row execute function set_audit()', t);
    -- indexen op trip_id voor snelle opvraag
    if t <> 'trips' then
      execute format('create index if not exists %I on %I (trip_id)', t || '_trip_idx', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------
-- Realtime aanzetten voor alle tabellen
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['trips','trip_members','places','days','bookings','activities',
    'legs','expenses','budgetten','tasks','links','packing_items','documents'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;  -- stond er al in
    end;
  end loop;
end $$;
