-- Warm-up vs working sets on logged sets
-- Run in Supabase SQL Editor

alter table public.set_logs
  add column if not exists is_warmup boolean not null default false;

comment on column public.set_logs.is_warmup is
  'True for warm-up / feeder sets — ignored for previous working loads and lift progress';
