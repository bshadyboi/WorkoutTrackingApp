-- Fasted blood pressure — two morning readings + when logged
-- Run in Supabase SQL Editor

alter table public.daily_logs
  add column if not exists bp1_systolic int not null default 0,
  add column if not exists bp1_diastolic int not null default 0,
  add column if not exists bp2_systolic int not null default 0,
  add column if not exists bp2_diastolic int not null default 0,
  add column if not exists bp_logged_at timestamptz;

comment on column public.daily_logs.bp1_systolic is 'Fasted BP reading 1 · systolic mmHg';
comment on column public.daily_logs.bp1_diastolic is 'Fasted BP reading 1 · diastolic mmHg';
comment on column public.daily_logs.bp2_systolic is 'Fasted BP reading 2 · systolic mmHg';
comment on column public.daily_logs.bp2_diastolic is 'Fasted BP reading 2 · diastolic mmHg';
comment on column public.daily_logs.bp_logged_at is 'When the latest BP pair was saved';
