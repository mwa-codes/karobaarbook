"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  DailyOpeningBalance,
  RoznamchaEntry,
} from "@/types/database";

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

/** Fetches the explicit opening balance for `date` if it exists. */
async function fetchExplicitOpening(
  userId: string,
  date: string
): Promise<DailyOpeningBalance | null> {
  const { data, error } = await supabase
    .from("daily_opening_balance")
    .select("*")
    .eq("owner_id", userId)
    .eq("entry_date", date)
    .maybeSingle();
  if (error) throw error;
  return (data as DailyOpeningBalance | null) ?? null;
}

/** Walks history backwards: finds the most recent explicit opening balance
 *  on or before `date`, then sums every roznamcha entry strictly between that
 *  anchor and `date` (exclusive of `date`). Returns the implied opening
 *  balance for `date`. If nothing exists, returns 0. */
async function computeImpliedOpening(
  userId: string,
  date: string
): Promise<number> {
  const { data: anchorRow, error: anchorErr } = await supabase
    .from("daily_opening_balance")
    .select("*")
    .eq("owner_id", userId)
    .lte("entry_date", date)
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (anchorErr) throw anchorErr;

  // Earliest cash-book entry we know about — used when no anchor exists.
  let anchorDate: string;
  let anchorBalance: number;

  if (anchorRow) {
    anchorDate = (anchorRow as DailyOpeningBalance).entry_date;
    anchorBalance = Number((anchorRow as DailyOpeningBalance).opening_balance);
    // If the anchor IS the date itself, that's the explicit opening.
    if (anchorDate === date) return anchorBalance;
  } else {
    anchorDate = "1970-01-01";
    anchorBalance = 0;
  }

  // Sum every entry from anchorDate (inclusive) up to (but not including) `date`.
  const { data: between, error: betweenErr } = await supabase
    .from("roznamcha")
    .select("type,amount,entry_date")
    .eq("owner_id", userId)
    .gte("entry_date", anchorDate)
    .lt("entry_date", date);
  if (betweenErr) throw betweenErr;

  let delta = 0;
  for (const row of (between ?? []) as Pick<
    RoznamchaEntry,
    "type" | "amount" | "entry_date"
  >[]) {
    const amt = Number(row.amount);
    delta += row.type === "income" ? amt : -amt;
  }
  return anchorBalance + delta;
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
      const [{ data: entryData, error: entryErr }, explicit] = await Promise.all([
        supabase
          .from("roznamcha")
          .select("*")
          .eq("owner_id", userId)
          .eq("entry_date", selectedDate)
          .order("created_at", { ascending: false }),
        fetchExplicitOpening(userId, selectedDate),
      ]);
      if (entryErr) throw entryErr;

      let opening: number;
      let explicitFlag: boolean;
      if (explicit) {
        opening = Number(explicit.opening_balance);
        explicitFlag = true;
      } else {
        opening = await computeImpliedOpening(userId, selectedDate);
        explicitFlag = false;
      }

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
        () => load()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_opening_balance",
          filter: `owner_id=eq.${userId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
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
