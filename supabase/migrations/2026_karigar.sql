-- Karigar module — run entire file in Supabase SQL Editor (safe to re-run)
-- Creates employees + wage_payments (if missing), then work entries + view.

-- Reuse updated_at helper (from Phase 1 schema; no-op if already exists)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- EMPLOYEES (karigars / factory workers)
-- ============================================================
create table if not exists public.employees (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  phone         text,
  role          text,
  rate_type     text not null default 'per_day'
                check (rate_type in ('per_day', 'per_piece', 'per_kg')),
  rate_amount   numeric(10,2) not null default 0,
  joining_date  date not null default current_date,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_employees_owner on public.employees(owner_id);
create index if not exists idx_employees_owner_active
  on public.employees(owner_id, is_active);

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- ============================================================
-- WAGE PAYMENTS (must exist before karigar_work_entries FK)
-- ============================================================
create table if not exists public.wage_payments (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  employee_id   uuid not null references public.employees(id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  total_days    numeric(10,2) not null default 0,
  total_units   numeric(10,2) not null default 0,
  total_hours   numeric(10,2) not null default 0,
  gross_amount  numeric(10,2) not null default 0,
  deductions    numeric(10,2) not null default 0,
  net_amount    numeric(10,2) not null default 0,
  paid          boolean not null default false,
  paid_at       timestamptz,
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_wage_payments_owner on public.wage_payments(owner_id);
create index if not exists idx_wage_payments_employee
  on public.wage_payments(employee_id);

-- ============================================================
-- KARIGAR WORK ENTRIES
-- ============================================================
create table if not exists public.karigar_work_entries (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  employee_id     uuid not null references public.employees(id) on delete cascade,
  entry_date      date not null default current_date,
  work_type       text not null
                    check (work_type in ('per_day', 'per_piece', 'per_kg')),
  quantity        numeric(10,2) not null check (quantity > 0),
  rate            numeric(10,2) not null check (rate > 0),
  amount          numeric(10,2) generated always as (quantity * rate) stored,
  description     text,
  wage_payment_id uuid references public.wage_payments(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.karigar_work_entries enable row level security;

drop policy if exists "owner select karigar_work_entries" on public.karigar_work_entries;
drop policy if exists "owner insert karigar_work_entries" on public.karigar_work_entries;
drop policy if exists "owner update karigar_work_entries" on public.karigar_work_entries;
drop policy if exists "owner delete karigar_work_entries" on public.karigar_work_entries;

create policy "owner select karigar_work_entries"
  on public.karigar_work_entries for select using (auth.uid() = owner_id);
create policy "owner insert karigar_work_entries"
  on public.karigar_work_entries for insert with check (auth.uid() = owner_id);
create policy "owner update karigar_work_entries"
  on public.karigar_work_entries for update using (auth.uid() = owner_id);
create policy "owner delete karigar_work_entries"
  on public.karigar_work_entries for delete using (auth.uid() = owner_id);

create index if not exists idx_kwe_owner on public.karigar_work_entries(owner_id);
create index if not exists idx_kwe_employee on public.karigar_work_entries(employee_id);
create index if not exists idx_kwe_date on public.karigar_work_entries(entry_date);
create index if not exists idx_kwe_unpaid on public.karigar_work_entries(employee_id, wage_payment_id)
  where wage_payment_id is null;

-- ============================================================
-- RLS: employees + wage_payments
-- ============================================================
alter table public.employees enable row level security;
alter table public.wage_payments enable row level security;

drop policy if exists "owner select employees" on public.employees;
drop policy if exists "owner insert employees" on public.employees;
drop policy if exists "owner update employees" on public.employees;
drop policy if exists "owner delete employees" on public.employees;

create policy "owner select employees"
  on public.employees for select using (auth.uid() = owner_id);
create policy "owner insert employees"
  on public.employees for insert with check (auth.uid() = owner_id);
create policy "owner update employees"
  on public.employees for update using (auth.uid() = owner_id);
create policy "owner delete employees"
  on public.employees for delete using (auth.uid() = owner_id);

drop policy if exists "owner select wage_payments" on public.wage_payments;
drop policy if exists "owner insert wage_payments" on public.wage_payments;
drop policy if exists "owner update wage_payments" on public.wage_payments;
drop policy if exists "owner delete wage_payments" on public.wage_payments;

create policy "owner select wage_payments"
  on public.wage_payments for select using (auth.uid() = owner_id);
create policy "owner insert wage_payments"
  on public.wage_payments for insert with check (auth.uid() = owner_id);
create policy "owner update wage_payments"
  on public.wage_payments for update using (auth.uid() = owner_id);
create policy "owner delete wage_payments"
  on public.wage_payments for delete using (auth.uid() = owner_id);

-- ============================================================
-- VIEW: pending wages per karigar
-- ============================================================
create or replace view public.karigar_pending_wages as
select
  e.id            as employee_id,
  e.owner_id,
  e.name,
  e.phone,
  e.role,
  e.rate_type,
  e.rate_amount,
  e.is_active,
  coalesce(sum(kwe.amount), 0)        as total_pending,
  count(kwe.id)                       as entry_count,
  min(kwe.entry_date)                 as earliest_unpaid_date,
  max(kwe.entry_date)                 as latest_unpaid_date
from public.employees e
left join public.karigar_work_entries kwe
  on kwe.employee_id = e.id
  and kwe.wage_payment_id is null
group by
  e.id, e.owner_id, e.name, e.phone,
  e.role, e.rate_type, e.rate_amount, e.is_active;

-- Use caller's RLS (not view owner). Fixes Supabase "Security Definer View" warning.
alter view public.karigar_pending_wages set (security_invoker = on);

grant select on public.karigar_pending_wages to authenticated;
