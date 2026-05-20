"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Party, PartyBalance } from "@/types/database";

export type PartyFilter = "all" | "customer" | "vendor";

export interface UsePartiesResult {
  loading: boolean;
  error: string | null;
  parties: PartyBalance[];
  refresh: () => Promise<void>;
}

export function usePartyBalances(userId: string | null | undefined): UsePartiesResult {
  const [parties, setParties] = useState<PartyBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const fetchParties = useCallback(async () => {
    if (!userId) {
      setParties([]);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: err } = await supabase
      .from("party_balances")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .order("net_balance", { ascending: false });
    if (!aliveRef.current) return;
    if (err) {
      setError(err.message);
      setParties([]);
    } else {
      setParties((data ?? []) as PartyBalance[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    aliveRef.current = true;
    setLoading(true);
    fetchParties();
    return () => {
      aliveRef.current = false;
    };
  }, [fetchParties]);

  useEffect(() => {
    if (!userId) return;
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
        () => {
          fetchParties();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `owner_id=eq.${userId}`,
        },
        () => {
          fetchParties();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchParties]);

  return { loading, error, parties, refresh: fetchParties };
}

export async function fetchParty(
  partyId: string,
  ownerId: string
): Promise<Party | null> {
  const { data, error } = await supabase
    .from("parties")
    .select("*")
    .eq("id", partyId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  return (data as Party | null) ?? null;
}

export async function fetchPartyBalance(
  partyId: string,
  ownerId: string
): Promise<PartyBalance | null> {
  const { data, error } = await supabase
    .from("party_balances")
    .select("*")
    .eq("party_id", partyId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  return (data as PartyBalance | null) ?? null;
}
