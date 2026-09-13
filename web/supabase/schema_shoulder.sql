-- Post-session shoulder check. The plan says to stop any lift that pinches and
-- to track a pain score over time; this records the answer each session.

alter table public.workout_sessions
  add column if not exists shoulder_status text
  check (shoulder_status is null or shoulder_status in ('fine', 'pinchy', 'painful'));

alter table public.workout_sessions
  add column if not exists shoulder_lift text;
