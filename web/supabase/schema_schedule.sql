-- Weekly training schedule + coach write access to athlete libraries
-- Run in Supabase SQL Editor after schema.sql

create table if not exists public.training_schedules (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- Index 0 = Sunday … 6 = Saturday (JS Date.getDay()). null = Rest.
  day_ids jsonb not null default '[null,null,null,null,null,null,null]'::jsonb,
  -- Per-date overrides: { "YYYY-MM-DD": "workout_day_uuid" | null }
  date_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.training_schedules
  add column if not exists date_overrides jsonb not null default '{}'::jsonb;

alter table public.training_schedules enable row level security;

drop policy if exists "training_schedules_own" on public.training_schedules;
create policy "training_schedules_own" on public.training_schedules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "training_schedules_coach_read" on public.training_schedules;
create policy "training_schedules_coach_read" on public.training_schedules for select using (
  exists (
    select 1 from public.coach_links cl
    where cl.athlete_id = training_schedules.user_id
      and cl.coach_id = auth.uid()
      and cl.status = 'active'
  )
);

drop policy if exists "training_schedules_coach_write" on public.training_schedules;
create policy "training_schedules_coach_write" on public.training_schedules for insert
  with check (
    exists (
      select 1 from public.coach_links cl
      where cl.athlete_id = training_schedules.user_id
        and cl.coach_id = auth.uid()
        and cl.status = 'active'
    )
  );

drop policy if exists "training_schedules_coach_update" on public.training_schedules;
create policy "training_schedules_coach_update" on public.training_schedules for update
  using (
    exists (
      select 1 from public.coach_links cl
      where cl.athlete_id = training_schedules.user_id
        and cl.coach_id = auth.uid()
        and cl.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.coach_links cl
      where cl.athlete_id = training_schedules.user_id
        and cl.coach_id = auth.uid()
        and cl.status = 'active'
    )
  );

-- Coach can push / update athlete workout days + exercises
drop policy if exists "workout_days_coach_write" on public.workout_days;
create policy "workout_days_coach_write" on public.workout_days for insert
  with check (
    exists (
      select 1 from public.coach_links cl
      where cl.athlete_id = workout_days.user_id
        and cl.coach_id = auth.uid()
        and cl.status = 'active'
    )
  );

drop policy if exists "workout_days_coach_update" on public.workout_days;
create policy "workout_days_coach_update" on public.workout_days for update
  using (
    exists (
      select 1 from public.coach_links cl
      where cl.athlete_id = workout_days.user_id
        and cl.coach_id = auth.uid()
        and cl.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.coach_links cl
      where cl.athlete_id = workout_days.user_id
        and cl.coach_id = auth.uid()
        and cl.status = 'active'
    )
  );

drop policy if exists "workout_days_coach_delete" on public.workout_days;
create policy "workout_days_coach_delete" on public.workout_days for delete
  using (
    exists (
      select 1 from public.coach_links cl
      where cl.athlete_id = workout_days.user_id
        and cl.coach_id = auth.uid()
        and cl.status = 'active'
    )
  );

drop policy if exists "workout_exercises_coach_write" on public.workout_exercises;
create policy "workout_exercises_coach_write" on public.workout_exercises for insert
  with check (
    exists (
      select 1 from public.workout_days d
      join public.coach_links cl on cl.athlete_id = d.user_id
      where d.id = workout_day_id
        and cl.coach_id = auth.uid()
        and cl.status = 'active'
    )
  );

drop policy if exists "workout_exercises_coach_update" on public.workout_exercises;
create policy "workout_exercises_coach_update" on public.workout_exercises for update
  using (
    exists (
      select 1 from public.workout_days d
      join public.coach_links cl on cl.athlete_id = d.user_id
      where d.id = workout_day_id
        and cl.coach_id = auth.uid()
        and cl.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.workout_days d
      join public.coach_links cl on cl.athlete_id = d.user_id
      where d.id = workout_day_id
        and cl.coach_id = auth.uid()
        and cl.status = 'active'
    )
  );

drop policy if exists "workout_exercises_coach_delete" on public.workout_exercises;
create policy "workout_exercises_coach_delete" on public.workout_exercises for delete
  using (
    exists (
      select 1 from public.workout_days d
      join public.coach_links cl on cl.athlete_id = d.user_id
      where d.id = workout_day_id
        and cl.coach_id = auth.uid()
        and cl.status = 'active'
    )
  );
