-- Derrick Recomp weekly check-in (waist + strength trend + applied calorie delta)
-- Run once in Supabase SQL Editor

alter table public.daily_logs
  add column if not exists waist_cm numeric;

create table if not exists public.recomp_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_number int not null,
  weight_avg numeric,
  waist_cm numeric,
  waist_trend text not null check (waist_trend in ('down', 'stable', 'up')),
  strength_trend text not null check (strength_trend in ('climbing', 'flat', 'falling')),
  condition text not null check (condition in ('A', 'B', 'C')),
  calorie_delta int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.recomp_checkins enable row level security;

create policy "recomp_checkins_own"
  on public.recomp_checkins
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
