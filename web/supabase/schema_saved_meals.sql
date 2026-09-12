-- Saved meals: a named set of foods logged together in one tap
-- (e.g. lunch = 8 oz ground beef + a rice bowl). A single saved food is
-- just a meal with one item.

create table if not exists public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  meal text not null default 'Snacks',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists saved_meals_user_idx on public.saved_meals (user_id, created_at);

alter table public.saved_meals enable row level security;

drop policy if exists "saved_meals_own" on public.saved_meals;
create policy "saved_meals_own" on public.saved_meals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
