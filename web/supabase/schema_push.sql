-- Push subscriptions for coach → athlete notifications
-- Run once in Supabase SQL Editor

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_own" on public.push_subscriptions;
create policy "push_own" on public.push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Linked coaches can read athlete endpoints to deliver notes (send happens server-side)
drop policy if exists "push_coach_read" on public.push_subscriptions;
create policy "push_coach_read" on public.push_subscriptions for select using (
  exists (
    select 1 from public.coach_links cl
    where cl.athlete_id = push_subscriptions.user_id
      and cl.coach_id = auth.uid()
      and cl.status = 'active'
  )
);
