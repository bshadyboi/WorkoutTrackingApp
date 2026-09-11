-- Additive: per-date calendar overrides on training_schedules
-- Run if you already ran schema_schedule.sql earlier

alter table public.training_schedules
  add column if not exists date_overrides jsonb not null default '{}'::jsonb;
