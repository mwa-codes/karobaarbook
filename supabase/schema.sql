-- KarobaarBook Phase 1 — Khata module
-- Run this in the Supabase SQL editor (or via `supabase db push`) to create
-- all tables, enums, the party_balances view, RLS policies, and the
-- profile-creation trigger used by the app.
--
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE.

----------------------------------------------------------------------------
-- 1. Extensions
----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

----------------------------------------------------------------------------
-- 2. Enums
----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'party_type') then
    create type party_type as enum ('customer', 'vendor', 'both');
  end if;
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type transaction_type as enum ('lena', 'dena');
  end if;
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
-- 3. Tables
----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  factory_name text,
  phone text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type party_type not null default 'customer',
  phone text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists parties_owner_idx on public.parties(owner_id);
create index if not exists parties_owner_active_idx on public.parties(owner_id, is_active);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  party_id uuid not null references public.parties(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  type transaction_type not null,
  description text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Phase 1.5 extensions
alter table public.transactions
  add column if not exists payment_mode payment_mode not null default 'cash';
alter table public.transactions
  add column if not exists transaction_category transaction_category not null default 'other';

create index if not exists transactions_owner_idx on public.transactions(owner_id);
create index if not exists transactions_party_idx on public.transactions(party_id);
create index if not exists transactions_owner_date_idx
  on public.transactions(owner_id, transaction_date desc);

-- Phase 1.5: daily cash book (Roznamcha)
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

-- Phase 1.5: explicit daily opening balance overrides
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

-- updated_at trigger helper
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
-- 4. View: party_balances (live aggregates per party)
----------------------------------------------------------------------------
create or replace view public.party_balances as
select
  p.id            as party_id,
  p.owner_id      as owner_id,
  p.name          as name,
  p.type          as type,
  p.phone         as phone,
  p.is_active     as is_active,
  coalesce(sum(case when t.type = 'lena' then t.amount end), 0)::numeric(14,2) as total_lena,
  coalesce(sum(case when t.type = 'dena' then t.amount end), 0)::numeric(14,2) as total_dena,
  (
    coalesce(sum(case when t.type = 'lena' then t.amount end), 0)
    - coalesce(sum(case when t.type = 'dena' then t.amount end), 0)
  )::numeric(14,2) as net_balance
from public.parties p
left join public.transactions t on t.party_id = p.id
group by p.id, p.owner_id, p.name, p.type, p.phone, p.is_active;

-- security_invoker = on makes the view honour the caller's RLS on parties/transactions,
-- so users only ever see their own rows even when querying the view.
alter view public.party_balances set (security_invoker = on);

----------------------------------------------------------------------------
-- 5. Row Level Security
----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.parties enable row level security;
alter table public.transactions enable row level security;
alter table public.roznamcha enable row level security;
alter table public.daily_opening_balance enable row level security;

-- profiles: every user can read/update their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- parties: scoped strictly to owner_id = auth.uid()
drop policy if exists "parties_select_own" on public.parties;
create policy "parties_select_own"
  on public.parties for select
  using (auth.uid() = owner_id);

drop policy if exists "parties_insert_own" on public.parties;
create policy "parties_insert_own"
  on public.parties for insert
  with check (auth.uid() = owner_id);

drop policy if exists "parties_update_own" on public.parties;
create policy "parties_update_own"
  on public.parties for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "parties_delete_own" on public.parties;
create policy "parties_delete_own"
  on public.parties for delete
  using (auth.uid() = owner_id);

-- transactions: same — scoped to owner_id
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = owner_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = owner_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
  on public.transactions for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
  on public.transactions for delete
  using (auth.uid() = owner_id);

-- roznamcha: scoped to owner_id
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

-- daily_opening_balance: scoped to owner_id
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
-- 6. Trigger: auto-create a profile row when a new auth user signs up
----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, factory_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'factory_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

----------------------------------------------------------------------------
-- 7. Realtime (optional but recommended)
----------------------------------------------------------------------------
-- Enables `supabase.channel(...).on('postgres_changes', ...)` updates so
-- balances refresh live across devices.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'parties'
  ) then
    alter publication supabase_realtime add table public.parties;
  end if;
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
