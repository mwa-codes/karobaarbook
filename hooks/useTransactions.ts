"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "@/lib/debounce";
import { supabase } from "@/lib/supabase";
import type { Transaction } from "@/types/database";

const INITIAL_LIMIT = 50;

export interface UseTransactionsResult {
  loading: boolean;
  error: string | null;
  transactions: Transaction[];
  hasMore: boolean;
  loadMore: () => void;
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
  const { partyId, limit = INITIAL_LIMIT } = options;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLimit, setCurrentLimit] = useState(limit);
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
      .order("created_at", { ascending: false })
      .limit(currentLimit + 1);
    if (partyId) q = q.eq("party_id", partyId);
    const { data, error: err } = await q;
    if (!aliveRef.current) return;
    if (err) {
      setError(err.message);
      setTransactions([]);
      setHasMore(false);
    } else {
      const items = data ?? [];
      setHasMore(items.length > currentLimit);
      setTransactions(items.slice(0, currentLimit) as Transaction[]);
    }
    setLoading(false);
  }, [userId, partyId, currentLimit]);

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
    const refetch = debounce(() => {
      void fetchTx();
    }, 400);
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
        refetch
      )
      .subscribe();
    return () => {
      refetch.cancel();
      supabase.removeChannel(channel);
    };
  }, [userId, partyId, fetchTx]);

  const loadMore = useCallback(() => {
    setCurrentLimit((prev) => prev + INITIAL_LIMIT);
  }, []);

  return { loading, error, transactions, hasMore, loadMore, refresh: fetchTx };
}
