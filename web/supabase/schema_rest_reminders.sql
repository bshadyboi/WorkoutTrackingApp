-- Delayed rest-timer push reminders (works when the app is backgrounded)
-- Run once in Supabase SQL Editor

create table if not exists public.rest_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ends_at timestamptz not null,
  label text not null default '',
  url text not null default '/train',
  cancelled boolean not null default false,
  fired boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists rest_reminders_due_idx
  on public.rest_reminders (ends_at)
  where cancelled = false and fired = false;

alter table public.rest_reminders enable row level security;

drop policy if exists "rest_reminders_own" on public.rest_reminders;
create policy "rest_reminders_own" on public.rest_reminders for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
