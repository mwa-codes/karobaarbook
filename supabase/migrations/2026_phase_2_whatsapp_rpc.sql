-- =============================================================================
-- Phase 2 Migration: get_roznamcha_day RPC
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================================================

-- Roznamcha single-call RPC
-- Replaces 3 sequential DB calls (fetchExplicitOpening + anchor lookup + delta sum)
-- with a single server-side function, reducing Roznamcha load from 3-4 round-trips to 2.
create or replace function get_roznamcha_day(
  p_owner_id uuid,
  p_date     date
)
returns json as $$
declare
  v_opening    numeric := 0;
  v_anchor_date date   := '1970-01-01';
  v_anchor_bal  numeric := 0;
  v_delta       numeric := 0;
begin
  -- 1. Check for an explicit opening balance override on this exact date.
  select opening_balance into v_opening
  from daily_opening_balance
  where owner_id = p_owner_id
    and entry_date = p_date;

  if found then
    return json_build_object(
      'opening_balance', v_opening,
      'is_explicit',     true
    );
  end if;

  -- 2. Find the most recent anchor (explicit row) strictly before p_date.
  select entry_date, opening_balance
    into v_anchor_date, v_anchor_bal
  from daily_opening_balance
  where owner_id = p_owner_id
    and entry_date < p_date
  order by entry_date desc
  limit 1;

  if not found then
    v_anchor_date := '1970-01-01';
    v_anchor_bal  := 0;
  end if;

  -- 3. Sum all roznamcha entries from the anchor date (inclusive)
  --    up to (but not including) p_date to get the implied opening.
  select coalesce(
    sum(case when type = 'income' then amount else -amount end),
    0
  ) into v_delta
  from roznamcha
  where owner_id  = p_owner_id
    and entry_date >= v_anchor_date
    and entry_date <  p_date;

  return json_build_object(
    'opening_balance', v_anchor_bal + v_delta,
    'is_explicit',     false
  );
end;
$$ language plpgsql security definer;

-- Grant execute to authenticated users only.
grant execute on function get_roznamcha_day(uuid, date) to authenticated;
