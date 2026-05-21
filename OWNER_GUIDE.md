# How to manage subscriptions

## View all users
Go to: Supabase Dashboard → Table Editor → **subscriptions** table

Sort or filter by **email** or **full_name** — no need to look up UUIDs.

## Activate a paid user
When someone pays you (JazzCash/EasyPaisa/cash), update their row:

1. Find their row by **email** (or name) in the subscriptions table
2. Set status = 'active'
3. Set plan = 'monthly' or 'annual'
4. Set amount_pkr = what they paid
5. Set subscription_ends_at = one month or one year from today
   - Monthly: now() + interval '1 month'
   - Annual: now() + interval '1 year'
6. Add notes = "Paid via JazzCash 03xx-xxxxxxx on [date]"

## Give someone extra free time (trial extension)
Update: trial_ends_at = [new future date]
Keep status = 'trial'

## Suspend a user immediately
Update: status = 'suspended'
They see "Account suspend hai" immediately.

## Give someone lifetime free access
Update: status = 'active', subscription_ends_at = NULL

## SQL shortcuts (run in SQL Editor):

-- Activate monthly for a specific email:
update subscriptions
set
  status = 'active',
  plan = 'monthly',
  amount_pkr = 500,
  subscription_ends_at = now() + interval '1 month',
  notes = 'Paid via JazzCash',
  updated_at = now()
where email = 'user@email.com';

-- Extend trial by 30 days:
update subscriptions
set trial_ends_at = trial_ends_at + interval '30 days'
where email = 'user@email.com';

-- Suspend immediately:
update subscriptions
set status = 'suspended'
where email = 'user@email.com';
