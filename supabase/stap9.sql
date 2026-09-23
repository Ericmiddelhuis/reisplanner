-- Correctie: gedeelde notitie op Overzicht wordt een lijstje losse notities (met datumstempel per notitie)
-- in plaats van één tekstveld op de reis zelf. Eenmalig uitvoeren in de Supabase SQL-editor.
create table if not exists notities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  tekst text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

drop trigger if exists audit on notities;
create trigger audit before insert or update on notities for each row execute function set_audit();
create index if not exists notities_trip_idx on notities (trip_id);

alter table notities enable row level security;
drop policy if exists notities_leden on notities;
create policy notities_leden on notities for all to authenticated
  using (is_member(trip_id)) with check (is_member(trip_id));

do $$ begin
  execute 'alter publication supabase_realtime add table notities';
exception when duplicate_object then null;  -- stond er al in
end $$;

-- Het oude tekstveld trips.notitie blijft ongebruikt in de database staan (harmless); niet nodig om te verwijderen.
