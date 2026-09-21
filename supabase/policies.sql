-- Row Level Security: alleen leden van een reis zien en wijzigen die reis.
-- Uitvoeren ná schema.sql.

-- Is de ingelogde gebruiker lid van deze reis? Lidmaatschap loopt via user_id of via
-- het e-mailadres van de login (uitnodigen = e-mailadres toevoegen aan trip_members).
-- security definer zodat de functie zelf niet door RLS op trip_members geblokkeerd wordt.
create or replace function is_member(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from trip_members m
    where m.trip_id = p_trip
      and (m.user_id = auth.uid()
           or lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

-- Reis aanmaken: de maker wordt meteen eigenaar (anders zou hij zijn eigen reis niet zien).
create or replace function create_trip(p_naam text, p_startdatum date default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  insert into trips (naam, startdatum) values (p_naam, p_startdatum) returning id into v_id;
  insert into trip_members (trip_id, user_id, email, rol)
    values (v_id, auth.uid(), lower(auth.jwt() ->> 'email'), 'eigenaar');
  return v_id;
end $$;

-- Na de eerste login het user_id invullen bij de uitnodiging op dit e-mailadres.
create or replace function claim_memberships() returns void
language sql security definer set search_path = public as $$
  update trip_members set user_id = auth.uid()
  where user_id is null and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

revoke all on function create_trip(text, date) from public, anon;
revoke all on function claim_memberships() from public, anon;
grant execute on function create_trip(text, date) to authenticated;
grant execute on function claim_memberships() to authenticated;
grant execute on function is_member(uuid) to authenticated;

alter table trips enable row level security;
alter table trip_members enable row level security;

drop policy if exists trips_select on trips;
drop policy if exists trips_update on trips;
drop policy if exists trips_delete on trips;
create policy trips_select on trips for select to authenticated using (is_member(id));
create policy trips_update on trips for update to authenticated using (is_member(id)) with check (is_member(id));
-- Verwijderen mag alleen de eigenaar
create policy trips_delete on trips for delete to authenticated using (
  exists (select 1 from trip_members m where m.trip_id = trips.id and m.rol = 'eigenaar'
          and (m.user_id = auth.uid() or lower(m.email) = lower(coalesce(auth.jwt() ->> 'email',''))))
);
-- Geen insert-policy op trips: aanmaken gaat via create_trip().

drop policy if exists members_select on trip_members;
drop policy if exists members_insert on trip_members;
drop policy if exists members_update on trip_members;
drop policy if exists members_delete on trip_members;
create policy members_select on trip_members for select to authenticated using (is_member(trip_id));
create policy members_insert on trip_members for insert to authenticated with check (is_member(trip_id));
create policy members_update on trip_members for update to authenticated using (is_member(trip_id)) with check (is_member(trip_id));
create policy members_delete on trip_members for delete to authenticated using (is_member(trip_id));

-- Alle overige tabellen: leden mogen alles binnen hun eigen reis.
do $$
declare t text;
begin
  foreach t in array array['places','days','bookings','activities','legs','expenses',
    'tasks','links','packing_items','documents'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_leden', t);
    execute format('create policy %I on %I for all to authenticated
                    using (is_member(trip_id)) with check (is_member(trip_id))', t || '_leden', t);
  end loop;
end $$;

-- Anonieme gebruikers krijgen nergens toegang.
revoke all on all tables in schema public from anon;
