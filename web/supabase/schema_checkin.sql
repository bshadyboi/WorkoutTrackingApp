-- Morning check-in tags (sleep / energy / pump) — 1–4 scale, 0 = unset
-- Run in Supabase SQL Editor

alter table public.daily_logs
  add column if not exists checkin_sleep smallint not null default 0,
  add column if not exists checkin_energy smallint not null default 0,
  add column if not exists checkin_pump smallint not null default 0;

comment on column public.daily_logs.checkin_sleep is 'Morning sleep quality 1–4';
comment on column public.daily_logs.checkin_energy is 'Morning energy 1–4';
comment on column public.daily_logs.checkin_pump is 'Morning muscle pump / fullness 1–4';
  