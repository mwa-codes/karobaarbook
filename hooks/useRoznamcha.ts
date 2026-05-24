"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "@/lib/debounce";
import { localDB, withSync, type LocalRoznamchaEntry } from "@/lib/local-db";
import { computeLocalRoznamchaDay } from "@/lib/roznamcha-local";
import { supabase } from "@/lib/supabase";
import type { RoznamchaDayResult, RoznamchaEntry } from "@/types/database";

export type RoznamchaEntryWithSync = RoznamchaEntry & { _synced?: 0 | 1 };

export interface UseRoznamchaResult {
  loading: boolean;
  error: string | null;
  entries: RoznamchaEntryWithSync[];
  openingBalance: number;
  openingIsExplicit: boolean;
  totalIncome: number;
  totalExpense: number;
  closingBalance: number;
  refresh: () => Promise<void>;
}

function stripSync(row: LocalRoznamchaEntry): RoznamchaEntryWithSync {
  const { _deleted, _local_id, ...rest } = row;
  return rest;
}

export function useRoznamcha(
  userId: string | null | undefined,
  selectedDate: string
): UseRoznamchaResult {
  const [entries, setEntries] = useState<RoznamchaEntryWithSync[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [openingIsExplicit, setOpeningIsExplicit] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const loadLocal = useCallback(async () => {
    if (!userId || !selectedDate) {
      setEntries([]);
      setOpeningBalance(0);
      setOpeningIsExplicit(false);
      setLoading(false);
      return;
    }

    const dayEntries = await localDB.roznamcha
      .where("owner_id")
      .equals(userId)
      .and((e) => e._deleted === 0 && e.entry_date === selectedDate)
      .toArray();
    dayEntries.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const dayMeta = await computeLocalRoznamchaDay(userId, selectedDate);

    if (!aliveRef.current) return;
    setEntries(dayEntries.map(stripSync));
    setOpeningBalance(dayMeta.opening_balance);
    setOpeningIsExplicit(dayMeta.is_explicit);
    setLoading(false);
  }, [userId, selectedDate]);

  const syncFromServer = useCallback(async () => {
    if (!userId || !selectedDate) return;
    setError(null);

    try {
      let rpcData: RoznamchaDayResult | null = null;

      if (navigator.onLine) {
        const [{ data: entryData, error: entryErr }, rpcResult] =
          await Promise.all([
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

        const { data: openingRows } = await supabase
          .from("daily_opening_balance")
          .select("*")
          .eq("owner_id", userId);

        if (entryData) {
          await localDB.roznamcha.bulkPut(
            entryData.map((r) => withSync(r))
          );
        }
        if (openingRows) {
          await localDB.daily_opening_balance.bulkPut(
            openingRows.map((r) => withSync(r))
          );
        }

        if (!rpcResult.error && rpcResult.data) {
          rpcData = rpcResult.data as RoznamchaDayResult;
        }
      }

      await loadLocal();

      if (rpcData && aliveRef.current) {
        setOpeningBalance(Number(rpcData.opening_balance ?? 0));
        setOpeningIsExplicit(rpcData.is_explicit ?? false);
      }
    } catch (err) {
      if (!aliveRef.current) return;
      setError(err instanceof Error ? err.message : "Load failed");
      await loadLocal();
    }
  }, [userId, selectedDate, loadLocal]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadLocal();
    await syncFromServer();
  }, [loadLocal, syncFromServer]);

  useEffect(() => {
    aliveRef.current = true;
    setLoading(true);
    loadLocal().then(syncFromServer);
    return () => {
      aliveRef.current = false;
    };
  }, [loadLocal, syncFromServer]);

  useEffect(() => {
    if (!userId) return;
    const refetch = debounce(() => {
      void refresh();
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
  }, [userId, refresh]);

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
    refresh,
  };
}
