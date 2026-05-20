"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Transaction } from "@/types/database";

export interface UseTransactionsResult {
  loading: boolean;
  error: string | null;
  transactions: Transaction[];
  refresh: () => Promise<void>;
}

interface Options {
  partyId?: string;
  limit?: number;
}

export function useTransactions(
  userId: string | null | undefined,
  options: Options = {}
): UseTransactionsResult {
  const { partyId, limit } = options;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const fetchTx = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setError(null);
    let q = supabase
      .from("transactions")
      .select("*")
      .eq("owner_id", userId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (partyId) q = q.eq("party_id", partyId);
    if (limit) q = q.limit(limit);
    const { data, error: err } = await q;
    if (!aliveRef.current) return;
    if (err) {
      setError(err.message);
      setTransactions([]);
    } else {
      setTransactions((data ?? []) as Transaction[]);
    }
    setLoading(false);
  }, [userId, partyId, limit]);

  useEffect(() => {
    aliveRef.current = true;
    setLoading(true);
    fetchTx();
    return () => {
      aliveRef.current = false;
    };
  }, [fetchTx]);

  useEffect(() => {
    if (!userId) return;
    const filterStr = partyId
      ? `party_id=eq.${partyId}`
      : `owner_id=eq.${userId}`;
    const channel = supabase
      .channel(`transactions:${userId}:${partyId ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: filterStr,
        },
        () => {
          fetchTx();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, partyId, fetchTx]);

  return { loading, error, transactions, refresh: fetchTx };
}
