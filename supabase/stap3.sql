-- Stap 3 (route): eenmalig uitvoeren in de Supabase SQL-editor als schema.sql al eerder is uitgevoerd.
alter table legs add column if not exists geometrie text;
