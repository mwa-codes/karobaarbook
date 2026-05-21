-- KarobaarBook Phase 1.5 — Khata Enhancement + Roznamcha
-- Run this in the Supabase SQL editor AFTER Phase 1 (schema.sql).
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE / drop-if-exists.

----------------------------------------------------------------------------
-- 1. Extensions (idempotent — already enabled by schema.sql)
----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

----------------------------------------------------------------------------
-- 2. New enums
----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_mode') then
    create type payment_mode as enum ('cash', 'bank', 'cheque', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'transaction_category') then
    create type transaction_category as enum (
      'sale',
      'purchase',
      'payment_received',
      'payment_made',
      'opening_balance',
      'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'roznamcha_type') then
    create type roznamcha_type as enum ('income', 'expense');
  end if;
end$$;

----------------------------------------------------------------------------
-- 3. Extend transactions table
----------------------------------------------------------------------------
alter table public.transactions
  add column if not exists payment_mode payment_mode not null default 'cash';

alter table public.transactions
  add column if not exists transaction_category transaction_category not null default 'other';

----------------------------------------------------------------------------
-- 4. New table: roznamcha (daily cash book)
----------------------------------------------------------------------------
create table if not exists public.roznamcha (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  type roznamcha_type not null,
  amount numeric(14,2) not null check (amount > 0),
  description text not null,
  category text,
  payment_mode payment_mode not null default 'cash',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_roznamcha_owner_date
  on public.roznamcha(owner_id, entry_date desc);
create index if not exists idx_roznamcha_owner_created
  on public.roznamcha(owner_id, created_at desc);

----------------------------------------------------------------------------
-- 5. New table: daily_opening_balance
----------------------------------------------------------------------------
create table if not exists public.daily_opening_balance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, entry_date)
);

create index if not exists idx_daily_opening_owner_date
  on public.daily_opening_balance(owner_id, entry_date desc);

----------------------------------------------------------------------------
-- 6. updated_at trigger helper
----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_roznamcha_updated_at on public.roznamcha;
create trigger trg_roznamcha_updated_at
  before update on public.roznamcha
  for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_opening_updated_at on public.daily_opening_balance;
create trigger trg_daily_opening_updated_at
  before update on public.daily_opening_balance
  for each row execute function public.set_updated_at();

----------------------------------------------------------------------------
-- 7. Row Level Security
----------------------------------------------------------------------------
alter table public.roznamcha enable row level security;
alter table public.daily_opening_balance enable row level security;

-- roznamcha policies
drop policy if exists "roznamcha_select_own" on public.roznamcha;
create policy "roznamcha_select_own"
  on public.roznamcha for select
  using (auth.uid() = owner_id);

drop policy if exists "roznamcha_insert_own" on public.roznamcha;
create policy "roznamcha_insert_own"
  on public.roznamcha for insert
  with check (auth.uid() = owner_id);

drop policy if exists "roznamcha_update_own" on public.roznamcha;
create policy "roznamcha_update_own"
  on public.roznamcha for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "roznamcha_delete_own" on public.roznamcha;
create policy "roznamcha_delete_own"
  on public.roznamcha for delete
  using (auth.uid() = owner_id);

-- daily_opening_balance policies
drop policy if exists "daily_opening_select_own" on public.daily_opening_balance;
create policy "daily_opening_select_own"
  on public.daily_opening_balance for select
  using (auth.uid() = owner_id);

drop policy if exists "daily_opening_insert_own" on public.daily_opening_balance;
create policy "daily_opening_insert_own"
  on public.daily_opening_balance for insert
  with check (auth.uid() = owner_id);

drop policy if exists "daily_opening_update_own" on public.daily_opening_balance;
create policy "daily_opening_update_own"
  on public.daily_opening_balance for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "daily_opening_delete_own" on public.daily_opening_balance;
create policy "daily_opening_delete_own"
  on public.daily_opening_balance for delete
  using (auth.uid() = owner_id);

----------------------------------------------------------------------------
-- 8. Realtime
----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'roznamcha'
  ) then
    alter publication supabase_realtime add table public.roznamcha;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'daily_opening_balance'
  ) then
    alter publication supabase_realtime add table public.daily_opening_balance;
  end if;
end$$;
