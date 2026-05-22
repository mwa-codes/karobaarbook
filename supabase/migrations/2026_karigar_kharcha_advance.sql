-- Kharcha (weekly pocket money — auto-cut on wage payment)
-- Advance (larger loan — cut only when owner chooses during payment)

-- ============================================================
-- KHARCHA
-- ============================================================
create table if not exists public.karigar_kharcha (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  employee_id     uuid not null references public.employees(id) on delete cascade,
  entry_date      date not null default current_date,
  amount          numeric(10,2) not null check (amount > 0),
  description     text,
  wage_payment_id uuid references public.wage_payments(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_kharcha_owner on public.karigar_kharcha(owner_id);
create index if not exists idx_kharcha_employee on public.karigar_kharcha(employee_id);
create index if not exists idx_kharcha_unpaid on public.karigar_kharcha(employee_id, wage_payment_id)
  where wage_payment_id is null;

alter table public.karigar_kharcha enable row level security;

drop policy if exists "owner select karigar_kharcha" on public.karigar_kharcha;
drop policy if exists "owner insert karigar_kharcha" on public.karigar_kharcha;
drop policy if exists "owner update karigar_kharcha" on public.karigar_kharcha;
drop policy if exists "owner delete karigar_kharcha" on public.karigar_kharcha;

create policy "owner select karigar_kharcha"
  on public.karigar_kharcha for select using (auth.uid() = owner_id);
create policy "owner insert karigar_kharcha"
  on public.karigar_kharcha for insert with check (auth.uid() = owner_id);
create policy "owner update karigar_kharcha"
  on public.karigar_kharcha for update using (auth.uid() = owner_id);
create policy "owner delete karigar_kharcha"
  on public.karigar_kharcha for delete using (auth.uid() = owner_id);

-- ============================================================
-- ADVANCE (balance until manually cut on wage payment)
-- ============================================================
create table if not exists public.karigar_advances (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  employee_id     uuid not null references public.employees(id) on delete cascade,
  entry_date      date not null default current_date,
  amount          numeric(10,2) not null check (amount > 0),
  amount_settled  numeric(10,2) not null default 0 check (amount_settled >= 0),
  description     text,
  created_at      timestamptz not null default now(),
  constraint advance_settled_lte_amount check (amount_settled <= amount)
);

create index if not exists idx_advances_owner on public.karigar_advances(owner_id);
create index if not exists idx_advances_employee on public.karigar_advances(employee_id);

alter table public.karigar_advances enable row level security;

drop policy if exists "owner select karigar_advances" on public.karigar_advances;
drop policy if exists "owner insert karigar_advances" on public.karigar_advances;
drop policy if exists "owner update karigar_advances" on public.karigar_advances;
drop policy if exists "owner delete karigar_advances" on public.karigar_advances;

create policy "owner select karigar_advances"
  on public.karigar_advances for select using (auth.uid() = owner_id);
create policy "owner insert karigar_advances"
  on public.karigar_advances for insert with check (auth.uid() = owner_id);
create policy "owner update karigar_advances"
  on public.karigar_advances for update using (auth.uid() = owner_id);
create policy "owner delete karigar_advances"
  on public.karigar_advances for delete using (auth.uid() = owner_id);

-- Log each advance cut against a wage payment
create table if not exists public.karigar_advance_applications (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  advance_id      uuid not null references public.karigar_advances(id) on delete cascade,
  wage_payment_id uuid not null references public.wage_payments(id) on delete cascade,
  amount          numeric(10,2) not null check (amount > 0),
  created_at      timestamptz not null default now()
);

create index if not exists idx_advance_app_payment
  on public.karigar_advance_applications(wage_payment_id);

alter table public.karigar_advance_applications enable row level security;

drop policy if exists "owner select karigar_advance_applications" on public.karigar_advance_applications;
drop policy if exists "owner insert karigar_advance_applications" on public.karigar_advance_applications;

create policy "owner select karigar_advance_applications"
  on public.karigar_advance_applications for select using (auth.uid() = owner_id);
create policy "owner insert karigar_advance_applications"
  on public.karigar_advance_applications for insert with check (auth.uid() = owner_id);

-- Wage payment breakdown columns
alter table public.wage_payments
  add column if not exists kharcha_deduction numeric(10,2) not null default 0;
alter table public.wage_payments
  add column if not exists advance_deduction numeric(10,2) not null default 0;

-- Pending view: work + kharcha + advance balance
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
  max(kwe.entry_date)                 as latest_unpaid_date,
  coalesce((
    select sum(k.amount)
    from public.karigar_kharcha k
    where k.employee_id = e.id and k.wage_payment_id is null
  ), 0)                               as total_kharcha,
  coalesce((
    select sum(a.amount - a.amount_settled)
    from public.karigar_advances a
    where a.employee_id = e.id and a.amount > a.amount_settled
  ), 0)                               as advance_balance
from public.employees e
left join public.karigar_work_entries kwe
  on kwe.employee_id = e.id
  and kwe.wage_payment_id is null
group by
  e.id, e.owner_id, e.name, e.phone,
  e.role, e.rate_type, e.rate_amount, e.is_active;

alter view public.karigar_pending_wages set (security_invoker = on);

grant select on public.karigar_kharcha to authenticated;
grant select on public.karigar_advances to authenticated;
grant select on public.karigar_advance_applications to authenticated;
