"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { localDB, withSync, type LocalWorkEntry } from "@/lib/local-db";
import { shouldSurfaceSyncError } from "@/lib/sync-failure";
import { supabase } from "@/lib/supabase";
import type { KarigarWorkEntry } from "@/types/database";

interface Options {
  employeeId?: string;
  unpaidOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export type WorkEntryWithSync = KarigarWorkEntry & { _synced?: 0 | 1 };

function stripSync(row: LocalWorkEntry): WorkEntryWithSync {
  const { _deleted, _local_id, ...rest } = row;
  return rest;
}

export function useWorkEntries(
  userId: string | null | undefined,
  options: Options = {}
) {
  const { employeeId, unpaidOnly = false, dateFrom, dateTo } = options;
  const [entries, setEntries] = useState<WorkEntryWithSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const loadLocal = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const all = await localDB.karigar_work_entries
      .where("owner_id")
      .equals(userId)
      .and((e) => {
        if (e._deleted === 1) return false;
        if (employeeId && e.employee_id !== employeeId) return false;
        if (unpaidOnly && e.wage_payment_id) return false;
        if (dateFrom && e.entry_date < dateFrom) return false;
        if (dateTo && e.entry_date > dateTo) return false;
        return true;
      })
      .toArray();
    all.sort((a, b) => {
      const d = b.entry_date.localeCompare(a.entry_date);
      return d !== 0 ? d : b.created_at.localeCompare(a.created_at);
    });
    if (!alive.current) return;
    setEntries(all.map(stripSync));
    setLoading(false);
  }, [userId, employeeId, unpaidOnly, dateFrom, dateTo]);

  const syncFromServer = useCallback(async () => {
    if (!userId || !navigator.onLine) return;
    setError(null);
    let q = supabase
      .from("karigar_work_entries")
      .select("*")
      .eq("owner_id", userId);
    if (employeeId) q = q.eq("employee_id", employeeId);
    const { data, error: err } = await q;
    if (!alive.current) return;
    if (err) {
      if (!shouldSurfaceSyncError()) {
        await loadLocal();
        return;
      }
      setError(err.message);
      return;
    }
    if (data) {
      await localDB.karigar_work_entries.bulkPut(
        data.map((r) => withSync(r))
      );
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

  return { entries, loading, error, refresh };
}
