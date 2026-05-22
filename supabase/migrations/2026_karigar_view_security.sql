-- Fix: karigar_pending_wages flagged as SECURITY DEFINER in Supabase linter
-- Run this once if you already applied 2026_karigar.sql without security_invoker.

alter view public.karigar_pending_wages set (security_invoker = on);

grant select on public.karigar_pending_wages to authenticated;
