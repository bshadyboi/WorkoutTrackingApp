-- Left/right logging for one-arm (or one-leg) exercises.
-- set_logs.side: 'L' or 'R' on a one-sided set, null on a normal set.
-- workout_exercises.unilateral: the lifter's answer for a custom exercise;
-- null means "work it out from the name".

alter table public.set_logs
  add column if not exists side text
  check (side is null or side in ('L', 'R'));

alter table public.workout_exercises
  add column if not exists unilateral boolean;
