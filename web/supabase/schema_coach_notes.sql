-- Coach notes on an active athlete↔coach link
-- Run once in Supabase SQL Editor

alter table public.coach_links
  add column if not exists coach_note text not null default '';

alter table public.coach_links
  add column if not exists coach_note_at timestamptz;
