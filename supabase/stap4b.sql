-- Stap 4, correctie: kosten van een activiteit (Dagen) tellen nu mee bij Budget, via een categorie op de activiteit.
-- Eenmalig uitvoeren in de Supabase SQL-editor.
alter table activities add column if not exists categorie text check (categorie in (
  'Vluchten','4x4-huurauto & brandstof','Lodges & campings','Parkgelden & safari''s',
  'Eten & boodschappen','Visum/grens & verzekering','Buffer'));
