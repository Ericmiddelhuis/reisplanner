-- Stap 4 (budget): eenmalig uitvoeren in de Supabase SQL-editor als schema.sql/policies.sql al eerder zijn uitgevoerd.

create table if not exists budgetten (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  categorie text not null check (categorie in (
    'Vluchten','4x4-huurauto & brandstof','Lodges & campings','Parkgelden & safari''s',
    'Eten & boodschappen','Visum/grens & verzekering','Buffer')),
  bedrag numeric(12,2),  -- handmatig begroot bedrag in EUR; leeg = afgeleid uit geplande/betaalde uitgaven
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (trip_id, categorie)
);

drop trigger if exists audit on budgetten;
create trigger audit before insert or update on budgetten for each row execute function set_audit();
create index if not exists budgetten_trip_idx on budgetten (trip_id);

alter table budgetten enable row level security;
drop policy if exists budgetten_leden on budgetten;
create policy budgetten_leden on budgetten for all to authenticated
  using (is_member(trip_id)) with check (is_member(trip_id));

do $$ begin
  execute 'alter publication supabase_realtime add table budgetten';
exception when duplicate_object then null;  -- stond er al in
end $$;
