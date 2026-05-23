"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "@/lib/debounce";
import { supabase } from "@/lib/supabase";
import type { RoznamchaDayResult, RoznamchaEntry } from "@/types/database";

export interface UseRoznamchaResult {
  loading: boolean;
  error: string | null;
  entries: RoznamchaEntry[];
  /** The opening balance to display for `date`. Either the explicit override
   *  from `daily_opening_balance` (if any), or the auto-rolled-forward closing
   *  balance of the previous day's data we could find. */
  openingBalance: number;
  /** True iff `daily_opening_balance` has an explicit row for this date. */
  openingIsExplicit: boolean;
  totalIncome: number;
  totalExpense: number;
  closingBalance: number;
  refresh: () => Promise<void>;
}

export function useRoznamcha(
  userId: string | null | undefined,
  selectedDate: string
): UseRoznamchaResult {
  const [entries, setEntries] = useState<RoznamchaEntry[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [openingIsExplicit, setOpeningIsExplicit] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    if (!userId || !selectedDate) {
      setEntries([]);
      setOpeningBalance(0);
      setOpeningIsExplicit(false);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [{ data: entryData, error: entryErr }, rpcResult] = await Promise.all([
        supabase
          .from("roznamcha")
          .select("*")
          .eq("owner_id", userId)
          .eq("entry_date", selectedDate)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_roznamcha_day", {
          p_owner_id: userId,
          p_date: selectedDate,
        }),
      ]);
      if (entryErr) throw entryErr;
      if (rpcResult.error) throw rpcResult.error;

      const rpcData = rpcResult.data as RoznamchaDayResult | null;

      const opening = Number(rpcData?.opening_balance ?? 0);
      const explicitFlag = rpcData?.is_explicit ?? false;

      if (!aliveRef.current) return;
      setEntries((entryData ?? []) as RoznamchaEntry[]);
      setOpeningBalance(opening);
      setOpeningIsExplicit(explicitFlag);
    } catch (err) {
      if (!aliveRef.current) return;
      setError(err instanceof Error ? err.message : "Load failed");
      setEntries([]);
      setOpeningBalance(0);
      setOpeningIsExplicit(false);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [userId, selectedDate]);

  useEffect(() => {
    aliveRef.current = true;
    setLoading(true);
    load();
    return () => {
      aliveRef.current = false;
    };
  }, [load]);

  // Realtime: refetch when this user's roznamcha or opening-balance rows change.
  useEffect(() => {
    if (!userId) return;
    const refetch = debounce(() => {
      void load();
    }, 400);
    const channel = supabase
      .channel(`roznamcha:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "roznamcha",
          filter: `owner_id=eq.${userId}`,
        },
        refetch
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_opening_balance",
          filter: `owner_id=eq.${userId}`,
        },
        refetch
      )
      .subscribe();
    return () => {
      refetch.cancel();
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const totalIncome = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpense = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const closingBalance = openingBalance + totalIncome - totalExpense;

  return {
    loading,
    error,
    entries,
    openingBalance,
    openingIsExplicit,
    totalIncome,
    totalExpense,
    closingBalance,
    refresh: load,
  };
}
