"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { KarigarWorkEntry } from "@/types/database";

interface Options {
  employeeId?: string;
  unpaidOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export function useWorkEntries(
  userId: string | null | undefined,
  options: Options = {}
) {
  const { employeeId, unpaidOnly = false, dateFrom, dateTo } = options;
  const [entries, setEntries] = useState<KarigarWorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const fetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    let q = supabase
      .from("karigar_work_entries")
      .select("*")
      .eq("owner_id", userId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (employeeId) q = q.eq("employee_id", employeeId);
    if (unpaidOnly) q = q.is("wage_payment_id", null);
    if (dateFrom) q = q.gte("entry_date", dateFrom);
    if (dateTo) q = q.lte("entry_date", dateTo);

    const { data, error: err } = await q;
    if (!alive.current) return;
    if (err) setError(err.message);
    else setEntries((data ?? []) as KarigarWorkEntry[]);
    setLoading(false);
  }, [userId, employeeId, unpaidOnly, dateFrom, dateTo]);

  useEffect(() => {
    alive.current = true;
    fetch();
    return () => {
      alive.current = false;
    };
  }, [fetch]);

  return { entries, loading, error, refresh: fetch };
}
