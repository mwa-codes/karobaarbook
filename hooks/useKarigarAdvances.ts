"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { KarigarAdvance } from "@/types/database";

interface Options {
  employeeId?: string;
  openOnly?: boolean;
}

export function useKarigarAdvances(
  userId: string | null | undefined,
  options: Options = {}
) {
  const { employeeId, openOnly = false } = options;
  const [advances, setAdvances] = useState<KarigarAdvance[]>([]);
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
      .from("karigar_advances")
      .select("*")
      .eq("owner_id", userId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (employeeId) q = q.eq("employee_id", employeeId);

    const { data, error: err } = await q;
    if (!alive.current) return;
    if (err) setError(err.message);
    else {
      let list = (data ?? []) as KarigarAdvance[];
      if (openOnly) {
        list = list.filter(
          (a) => Number(a.amount) > Number(a.amount_settled)
        );
      }
      setAdvances(list);
    }
    setLoading(false);
  }, [userId, employeeId, openOnly]);

  useEffect(() => {
    alive.current = true;
    fetch();
    return () => {
      alive.current = false;
    };
  }, [fetch]);

  return { advances, loading, error, refresh: fetch };
}

export function advanceBalance(advance: KarigarAdvance): number {
  return Math.max(0, Number(advance.amount) - Number(advance.amount_settled));
}
