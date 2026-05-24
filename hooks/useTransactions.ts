"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "@/lib/debounce";
import { localDB, withSync, type LocalTransaction } from "@/lib/local-db";
import { reconcileTransactionsFromServer } from "@/lib/reconcile-transactions";
import { shouldSurfaceSyncError } from "@/lib/sync-failure";
import { supabase } from "@/lib/supabase";
import type { Transaction } from "@/types/database";

const INITIAL_LIMIT = 50;

export type TransactionWithSync = Transaction & { _synced?: 0 | 1 };

export interface UseTransactionsResult {
  loading: boolean;
  error: string | null;
  transactions: TransactionWithSync[];
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => Promise<void>;
}

interface Options {
  partyId?: string;
  limit?: number;
}

function stripSync(row: LocalTransaction): TransactionWithSync {
  const { _deleted, _local_id, ...rest } = row;
  return rest;
}

async function activePartyIds(ownerId: string): Promise<Set<string>> {
  const parties = await localDB.parties
    .where("owner_id")
    .equals(ownerId)
    .and((p) => p._deleted === 0)
    .toArray();
  return new Set(parties.map((p) => p.id));
}

export function useTransactions(
  userId: string | null | undefined,
  options: Options = {}
): UseTransactionsResult {
  const { partyId, limit = INITIAL_LIMIT } = options;
  const [transactions, setTransactions] = useState<TransactionWithSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLimit, setCurrentLimit] = useState(limit);
  const aliveRef = useRef(true);

  const loadLocal = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const partyIds = partyId ? new Set([partyId]) : await activePartyIds(userId);

    let rows: LocalTransaction[];
    if (partyId) {
      rows = await localDB.transactions
        .where("party_id")
        .equals(partyId)
        .and((t) => t._deleted === 0 && t.owner_id === userId)
        .toArray();
    } else {
      rows = await localDB.transactions
        .where("owner_id")
        .equals(userId)
        .and((t) => t._deleted === 0)
        .toArray();
    }

    rows = rows.filter((t) => partyIds.has(t.party_id));

    rows.sort((a, b) => {
      const d = b.transaction_date.localeCompare(a.transaction_date);
      return d !== 0 ? d : b.created_at.localeCompare(a.created_at);
    });

    const sliced = rows.slice(0, currentLimit).map(stripSync);
    if (!aliveRef.current) return;
    setTransactions(sliced);
    setHasMore(rows.length > currentLimit);
    setLoading(false);
  }, [userId, partyId, currentLimit]);

  const syncFromServer = useCallback(async () => {
    if (!userId || !navigator.onLine) return;
    setError(null);
    let q = supabase.from("transactions").select("*").eq("owner_id", userId);
    if (partyId) q = q.eq("party_id", partyId);
    const { data, error: err } = await q;
    if (!aliveRef.current) return;
    if (err) {
      if (!shouldSurfaceSyncError()) {
        await loadLocal();
        return;
      }
      const localCount = await localDB.transactions
        .where("owner_id")
        .equals(userId)
        .count();
      if (localCount > 0) {
        await loadLocal();
        return;
      }
      setError(err.message);
      return;
    }
    if (data) {
      const synced = data.map((r) => withSync(r));
      await localDB.transactions.bulkPut(synced);
      await reconcileTransactionsFromServer(userId, synced);
      await loadLocal();
    }
  }, [userId, partyId, loadLocal]);

  const refresh = useCallback(async () => {
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
    const filterStr = partyId
      ? `party_id=eq.${partyId}`
      : `owner_id=eq.${userId}`;
    const refetch = debounce(() => {
      void refresh();
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
  }, [userId, partyId, refresh]);

  const loadMore = useCallback(() => {
    setCurrentLimit((prev) => prev + INITIAL_LIMIT);
  }, []);

  return { loading, error, transactions, hasMore, loadMore, refresh };
}
