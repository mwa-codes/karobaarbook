-- Add email + full_name to subscriptions for easy lookup in Supabase Table Editor.
-- Kept in sync automatically from auth.users and profiles.

alter table public.subscriptions
  add column if not exists email text,
  add column if not exists full_name text;

create index if not exists idx_subscriptions_email on public.subscriptions(email);

----------------------------------------------------------------------------
-- Signup: store email + name on new subscription
----------------------------------------------------------------------------
create or replace function public.handle_new_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (
    user_id,
    status,
    trial_ends_at,
    email,
    full_name
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

----------------------------------------------------------------------------
-- Profile name changes → update subscription row
----------------------------------------------------------------------------
create or replace function public.sync_subscription_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
  set
    full_name = coalesce(new.full_name, ''),
    updated_at = now()
  where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_profile_sync_subscription on public.profiles;
create trigger on_profile_sync_subscription
  after insert or update of full_name on public.profiles
  for each row execute function public.sync_subscription_from_profile();

----------------------------------------------------------------------------
-- Email changes in auth → update subscription row
----------------------------------------------------------------------------
create or replace function public.sync_subscription_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email is distinct from new.email then
    update public.subscriptions
    set email = new.email, updated_at = now()
    where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_sync_subscription_email on auth.users;
create trigger on_auth_user_sync_subscription_email
  after update of email on auth.users
  for each row execute function public.sync_subscription_from_auth_user();

----------------------------------------------------------------------------
-- Backfill existing rows
----------------------------------------------------------------------------
update public.subscriptions s
set
  email = u.email,
  full_name = coalesce(
    p.full_name,
    u.raw_user_meta_data ->> 'full_name',
    ''
  ),
  updated_at = now()
from auth.users u
left join public.profiles p on p.id = u.id
where s.user_id = u.id
  and (s.email is distinct from u.email or s.full_name is distinct from coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name', ''));
