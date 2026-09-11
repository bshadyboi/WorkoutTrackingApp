alter table public.workout_sessions
  add column if not exists rating int
  check (rating is null or (rating >= 1 and rating <= 10));
