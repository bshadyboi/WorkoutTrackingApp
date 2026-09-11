-- Meal items stored on daily logs (Open Food Facts / manual / scan)

alter table public.daily_logs
  add column if not exists meals jsonb not null default '[]'::jsonb;
