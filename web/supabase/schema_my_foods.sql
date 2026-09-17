-- Your own verified foods, keyed by barcode.
--
-- Public food databases are someone else's copy of a label — often right,
-- sometimes stale, occasionally missing. Once you scan a product and confirm
-- its numbers against the packet, they are stored here and every later scan of
-- that barcode skips the databases entirely. Accuracy then grows with use
-- instead of depending on strangers.

create table if not exists public.my_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  barcode text not null,
  name text not null,
  brand text not null default '',
  serving_label text not null default '1 serving',
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, barcode)
);

create index if not exists my_foods_user_idx on public.my_foods (user_id, updated_at desc);

alter table public.my_foods enable row level security;

drop policy if exists "my_foods_own" on public.my_foods;
create policy "my_foods_own" on public.my_foods for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
