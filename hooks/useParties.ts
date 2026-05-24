"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "@/lib/debounce";
import { localDB, withSync } from "@/lib/local-db";
import { reconcileTransactionsFromServer } from "@/lib/reconcile-transactions";
import { supabase } from "@/lib/supabase";
import type { Party, PartyBalance } from "@/types/database";

export type PartyFilter = "all" | "customer" | "vendor";

export interface UsePartiesResult {
  loading: boolean;
  error: string | null;
  parties: PartyBalance[];
  refresh: () => Promise<void>;
}

async function computeLocalBalances(ownerId: string): Promise<PartyBalance[]> {
  const parties = await localDB.parties
    .where("owner_id")
    .equals(ownerId)
    .and((p) => p._deleted === 0 && p.is_active)
    .toArray();

  const allTx = await localDB.transactions
    .where("owner_id")
    .equals(ownerId)
    .and((t) => t._deleted === 0)
    .toArray();

  return parties.map((p) => {
    const partyTx = allTx.filter((t) => t.party_id === p.id);
    const totalLena = partyTx
      .filter((t) => t.type === "lena")
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalDena = partyTx
      .filter((t) => t.type === "dena")
      .reduce((s, t) => s + Number(t.amount), 0);
    return {
      party_id: p.id,
      owner_id: p.owner_id,
      name: p.name,
      type: p.type,
      phone: p.phone,
      is_active: p.is_active,
      total_lena: totalLena,
      total_dena: totalDena,
      net_balance: totalLena - totalDena,
    } satisfies PartyBalance;
  });
}

export function usePartyBalances(
  userId: string | null | undefined
): UsePartiesResult {
  const [parties, setParties] = useState<PartyBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const loadLocal = useCallback(async () => {
    if (!userId) {
      setParties([]);
      setLoading(false);
      return;
    }
    const balances = await computeLocalBalances(userId);
    if (!aliveRef.current) return;
    setParties(balances.sort((a, b) => b.net_balance - a.net_balance));
    setLoading(false);
  }, [userId]);

  const syncFromServer = useCallback(async () => {
    if (!userId || !navigator.onLine) return;
    setError(null);
    const [partiesRes, txRes] = await Promise.all([
      supabase.from("parties").select("*").eq("owner_id", userId),
      supabase.from("transactions").select("*").eq("owner_id", userId),
    ]);
    if (partiesRes.error) {
      if (!aliveRef.current) return;
      setError(partiesRes.error.message);
      return;
    }
    if (txRes.error) {
      if (!aliveRef.current) return;
      setError(txRes.error.message);
      return;
    }
    if (partiesRes.data) {
      await localDB.parties.bulkPut(
        partiesRes.data.map((r) => withSync(r))
      );
    }
    if (txRes.data) {
      const synced = txRes.data.map((r) => withSync(r));
      await localDB.transactions.bulkPut(synced);
      await reconcileTransactionsFromServer(userId, synced);
    }
    await loadLocal();
  }, [userId, loadLocal]);

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
    const refetch = debounce(() => {
      void refresh();
    }, 400);
    const channel = supabase
      .channel(`parties:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parties",
          filter: `owner_id=eq.${userId}`,
        },
        refetch
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
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

  return { loading, error, parties, refresh };
}

export async function fetchParty(
  partyId: string,
  ownerId: string
): Promise<Party | null> {
  const local = await localDB.parties.get(partyId);
  if (local && local._deleted === 0 && local.owner_id === ownerId) {
    const { _synced, _deleted, _local_id, ...party } = local;
    return party;
  }
  if (!navigator.onLine) return null;

  const { data, error } = await supabase
    .from("parties")
    .select("*")
    .eq("id", partyId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (data) await localDB.parties.put(withSync(data));
  return (data as Party | null) ?? null;
}

export async function fetchPartyBalance(
  partyId: string,
  ownerId: string
): Promise<PartyBalance | null> {
  const balances = await computeLocalBalances(ownerId);
  const found = balances.find((b) => b.party_id === partyId);
  if (found) return found;

  if (!navigator.onLine) return null;

  const { data, error } = await supabase
    .from("party_balances")
    .select("*")
    .eq("party_id", partyId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  return (data as PartyBalance | null) ?? null;
}
