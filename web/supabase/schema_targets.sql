-- Per-user macro targets (Settings)
-- Run once in Supabase SQL Editor

alter table public.profiles
  add column if not exists target_calories int not null default 2500;

alter table public.profiles
  add column if not exists target_protein int not null default 185;

alter table public.profiles
  add column if not exists target_carbs int not null default 200;

alter table public.profiles
  add column if not exists target_fats int not null default 70;

-- Prefer Derrick Recomp defaults when column already exists with old defaults
alter table public.profiles alter column target_calories set default 2500;
alter table public.profiles alter column target_protein set default 185;
alter table public.profiles alter column target_carbs set default 280;
alter table public.profiles alter column target_fats set default 70;
