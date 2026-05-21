-- KarobaarBook — Subscriptions & access control
-- Owner manages rows manually via Supabase dashboard (service role bypasses RLS).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / drop-if-exists where applicable.

----------------------------------------------------------------------------
-- 1. Enum
----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum (
      'trial',
      'active',
      'expired',
      'suspended'
    );
  end if;
end$$;

----------------------------------------------------------------------------
-- 2. Table
----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text,
  full_name text,
  status subscription_status not null default 'trial',
  trial_ends_at timestamp with time zone not null
    default (now() + interval '60 days'),
  subscription_ends_at timestamp with time zone,
  plan text check (plan in ('monthly', 'annual')) default null,
  amount_pkr integer default null,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_email on public.subscriptions(email);

----------------------------------------------------------------------------
-- 3. Auto-create subscription on signup
----------------------------------------------------------------------------
create or replace function public.handle_new_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (
    user_id, status, trial_ends_at, email, full_name
  )
  values (
    new.id,
    'trial',
    now() + interval '60 days',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_subscription();

----------------------------------------------------------------------------
-- 4. Access helper
----------------------------------------------------------------------------
create or replace function public.is_subscription_active(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
begin
  select * into v_sub
  from public.subscriptions
  where user_id = p_user_id;

  if not found then
    return false;
  end if;

  if v_sub.status = 'suspended' then
    return false;
  end if;

  if v_sub.status = 'trial' then
    return v_sub.trial_ends_at > now();
  end if;

  if v_sub.status = 'active' then
    if v_sub.subscription_ends_at is null then
      return true;
    end if;
    return v_sub.subscription_ends_at > now();
  end if;

  return false;
end;
$$;

grant execute on function public.is_subscription_active(uuid) to authenticated;

----------------------------------------------------------------------------
-- 5. Backfill existing users (60-day trial)
----------------------------------------------------------------------------
insert into public.subscriptions (user_id, status, trial_ends_at, email, full_name)
select
  u.id,
  'trial',
  now() + interval '60 days',
  u.email,
  coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
left join public.profiles p on p.id = u.id
where u.id not in (select user_id from public.subscriptions)
on conflict (user_id) do nothing;

----------------------------------------------------------------------------
-- 6. Ensure 60-day trial default (safe if table already existed with 30 days)
----------------------------------------------------------------------------
alter table public.subscriptions
  alter column trial_ends_at set default (now() + interval '60 days');

-- Starting users on trial: full 60 days from signup (not 30)
update public.subscriptions
set
  trial_ends_at = created_at + interval '60 days',
  updated_at = now()
where status = 'trial'
  and trial_ends_at < created_at + interval '60 days';
