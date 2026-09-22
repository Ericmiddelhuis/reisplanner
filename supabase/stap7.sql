-- Stap 7: Gezondheid en Noodinfo zijn vrije tekstvelden op de reis zelf.
-- Boekingen, Paklijst en Documenten gebruiken tabellen die al sinds stap 1 bestaan (met RLS en Realtime).
-- Eenmalig uitvoeren in de Supabase SQL-editor.
alter table trips add column if not exists gezondheid text;
alter table trips add column if not exists noodinfo text;
