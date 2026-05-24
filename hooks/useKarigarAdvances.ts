"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { localDB, withSync, type LocalKarigarAdvance } from "@/lib/local-db";
import { supabase } from "@/lib/supabase";
import type { KarigarAdvance } from "@/types/database";

interface Options {
  employeeId?: string;
  openOnly?: boolean;
}

export type KarigarAdvanceWithSync = KarigarAdvance & { _synced?: 0 | 1 };

function stripSync(row: LocalKarigarAdvance): KarigarAdvanceWithSync {
  const { _deleted, _local_id, ...rest } = row;
  return rest;
}

export function useKarigarAdvances(
  userId: string | null | undefined,
  options: Options = {}
) {
  const { employeeId, openOnly = false } = options;
  const [advances, setAdvances] = useState<KarigarAdvanceWithSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const loadLocal = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let list = await localDB.karigar_advances
      .where("owner_id")
      .equals(userId)
      .and((a) => {
        if (a._deleted === 1) return false;
        if (employeeId && a.employee_id !== employeeId) return false;
        return true;
      })
      .toArray();
    list.sort((a, b) => {
      const d = b.entry_date.localeCompare(a.entry_date);
      return d !== 0 ? d : b.created_at.localeCompare(a.created_at);
    });
    let mapped = list.map(stripSync);
    if (openOnly) {
      mapped = mapped.filter(
        (a) => Number(a.amount) > Number(a.amount_settled)
      );
    }
    if (!alive.current) return;
    setAdvances(mapped);
    setLoading(false);
  }, [userId, employeeId, openOnly]);

  const syncFromServer = useCallback(async () => {
    if (!userId || !navigator.onLine) return;
    setError(null);
    let q = supabase
      .from("karigar_advances")
      .select("*")
      .eq("owner_id", userId);
    if (employeeId) q = q.eq("employee_id", employeeId);
    const { data, error: err } = await q;
    if (!alive.current) return;
    if (err) {
      setError(err.message);
      return;
    }
    if (data) {
      await localDB.karigar_advances.bulkPut(data.map((r) => withSync(r)));
      await loadLocal();
    }
  }, [userId, employeeId, loadLocal]);

  const refresh = useCallback(async () => {
    await loadLocal();
    await syncFromServer();
  }, [loadLocal, syncFromServer]);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    loadLocal().then(syncFromServer);
    return () => {
      alive.current = false;
    };
  }, [loadLocal, syncFromServer]);

  return { advances, loading, error, refresh };
}

export function advanceBalance(advance: KarigarAdvance): number {
  return Math.max(0, Number(advance.amount) - Number(advance.amount_settled));
}
