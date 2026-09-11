-- Run in Supabase SQL Editor (additive — safe if already partially applied)

alter table public.daily_logs
  add column if not exists water_oz double precision not null default 0,
  add column if not exists morning_weight double precision not null default 0,
  add column if not exists water_unit text not null default 'oz',
  add column if not exists bp1_systolic int not null default 0,
  add column if not exists bp1_diastolic int not null default 0,
  add column if not exists bp2_systolic int not null default 0,
  add column if not exists bp2_diastolic int not null default 0,
  add column if not exists bp_logged_at timestamptz,
  add column if not exists checkin_sleep smallint not null default 0,
  add column if not exists checkin_energy smallint not null default 0,
  add column if not exists checkin_pump smallint not null default 0;

create table if not exists public.protocol_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  dosage text not null default '',
  schedule_label text not null default 'Daily',
  frequency_label text not null default 'Daily',
  sort_order int not null default 0,
  taken_dates text not null default '',
  created_at timestamptz not null default now()
);

alter table public.protocol_items enable row level security;

drop policy if exists "protocol_items_own" on public.protocol_items;
create policy "protocol_items_own" on public.protocol_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "protocol_items_coach_read" on public.protocol_items;
create policy "protocol_items_coach_read" on public.protocol_items for select using (
  exists (
    select 1 from public.coach_links cl
    where cl.athlete_id = protocol_items.user_id
      and cl.coach_id = auth.uid()
      and cl.status = 'active'
  )
);
