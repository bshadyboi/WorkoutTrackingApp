-- FitTrack Web — run in Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.coach_links (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  coach_id uuid references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active')),
  invite_code text not null unique default encode(gen_random_bytes(8), 'hex'),
  created_at timestamptz not null default now()
);

create unique index if not exists coach_links_athlete_coach_uidx
  on public.coach_links (athlete_id, coach_id)
  where coach_id is not null;

create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  subtitle text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days (id) on delete cascade,
  name text not null,
  muscle text not null default '',
  default_sets int not null default 3,
  has_crown_set boolean not null default false,
  crown_rep_range text not null default '',
  working_rep_range text not null default '8–12',
  sort_order int not null default 0
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_name text not null,
  muscle text not null default '',
  set_number int not null,
  weight double precision not null default 0,
  reps int not null default 0,
  rir int,
  is_completed boolean not null default true
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  target_calories int not null default 2100,
  target_protein int not null default 190,
  target_carbs int not null default 100,
  target_fats int not null default 70,
  actual_calories int not null default 0,
  actual_protein int not null default 0,
  actual_carbs_pre int not null default 0,
  actual_carbs_post int not null default 0,
  actual_fats int not null default 0,
  sleep_hours double precision not null default 0,
  sleep_notes text not null default '',
  steps_count int not null default 0,
  incline_walk_minutes int not null default 0,
  incline_walk_incline int not null default 0,
  incline_walk_speed double precision not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.profiles enable row level security;
alter table public.coach_links enable row level security;
alter table public.workout_days enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.daily_logs enable row level security;

create policy "profiles_select_own_or_linked" on public.profiles for select using (
  auth.uid() = id
  or exists (
    select 1 from public.coach_links cl
    where cl.status = 'active'
      and ((cl.coach_id = auth.uid() and cl.athlete_id = profiles.id)
        or (cl.athlete_id = auth.uid() and cl.coach_id = profiles.id))
  )
);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create policy "coach_links_select_participants" on public.coach_links for select
  using (
    auth.uid() = athlete_id
    or auth.uid() = coach_id
    or (status = 'pending' and coach_id is null)
  );
create policy "coach_links_insert_athlete" on public.coach_links for insert
  with check (auth.uid() = athlete_id);
create policy "coach_links_update_participants" on public.coach_links for update
  using (
    auth.uid() = athlete_id
    or auth.uid() = coach_id
    or (status = 'pending' and coach_id is null)
  )
  with check (
    auth.uid() = athlete_id
    or auth.uid() = coach_id
  );

create policy "workout_days_own" on public.workout_days for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_days_coach_read" on public.workout_days for select using (
  exists (select 1 from public.coach_links cl
    where cl.athlete_id = workout_days.user_id and cl.coach_id = auth.uid() and cl.status = 'active')
);

create policy "workout_exercises_own" on public.workout_exercises for all
  using (exists (select 1 from public.workout_days d where d.id = workout_day_id and d.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_days d where d.id = workout_day_id and d.user_id = auth.uid()));
create policy "workout_exercises_coach_read" on public.workout_exercises for select using (
  exists (
    select 1 from public.workout_days d
    join public.coach_links cl on cl.athlete_id = d.user_id
    where d.id = workout_day_id and cl.coach_id = auth.uid() and cl.status = 'active'
  )
);

create policy "sessions_own" on public.workout_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_coach_read" on public.workout_sessions for select using (
  exists (select 1 from public.coach_links cl
    where cl.athlete_id = workout_sessions.user_id and cl.coach_id = auth.uid() and cl.status = 'active')
);

create policy "set_logs_own" on public.set_logs for all
  using (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "set_logs_coach_read" on public.set_logs for select using (
  exists (
    select 1 from public.workout_sessions s
    join public.coach_links cl on cl.athlete_id = s.user_id
    where s.id = session_id and cl.coach_id = auth.uid() and cl.status = 'active'
  )
);

create policy "daily_logs_own" on public.daily_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_logs_coach_read" on public.daily_logs for select using (
  exists (select 1 from public.coach_links cl
    where cl.athlete_id = daily_logs.user_id and cl.coach_id = auth.uid() and cl.status = 'active')
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'athlete'), '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
