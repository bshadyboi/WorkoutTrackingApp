-- Active training program (program switcher)
-- Run once in Supabase SQL Editor

alter table public.profiles
  add column if not exists active_program text not null default 'derrick-recomp';

alter table public.profiles alter column active_program set default 'derrick-recomp';

comment on column public.profiles.active_program is
  'Training program id: derrick-recomp | ppl-aesthetics | elevate-challenge';
