"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { localDB, withSync } from "@/lib/local-db";
import { advanceBalance } from "@/hooks/useKarigarAdvances";
import { shouldSurfaceSyncError } from "@/lib/sync-failure";
import { supabase } from "@/lib/supabase";
import type { KarigarPendingWage } from "@/types/database";

async function computeLocalKarigarWages(
  ownerId: string
): Promise<KarigarPendingWage[]> {
  const employees = await localDB.employees
    .where("owner_id")
    .equals(ownerId)
    .and((e) => e._deleted === 0 && e.is_active)
    .toArray();

  const unpaidEntries = await localDB.karigar_work_entries
    .where("owner_id")
    .equals(ownerId)
    .and((e) => e._deleted === 0 && !e.wage_payment_id)
    .toArray();

  const unpaidKharcha = await localDB.karigar_kharcha
    .where("owner_id")
    .equals(ownerId)
    .and((k) => k._deleted === 0 && !k.wage_payment_id)
    .toArray();

  const advances = await localDB.karigar_advances
    .where("owner_id")
    .equals(ownerId)
    .and((a) => a._deleted === 0)
    .toArray();

  return employees.map((emp) => {
    const empEntries = unpaidEntries.filter((e) => e.employee_id === emp.id);
    const totalPending = empEntries.reduce((s, e) => s + Number(e.amount), 0);
    const dates = empEntries.map((e) => e.entry_date).sort();
    const totalKharcha = unpaidKharcha
      .filter((k) => k.employee_id === emp.id)
      .reduce((s, k) => s + Number(k.amount), 0);
    const advanceBal = advances
      .filter((a) => a.employee_id === emp.id)
      .reduce((s, a) => s + advanceBalance(a), 0);

    return {
      employee_id: emp.id,
      owner_id: emp.owner_id,
      name: emp.name,
      phone: emp.phone,
      role: emp.role,
      rate_type: emp.rate_type,
      rate_amount: emp.rate_amount,
      is_active: emp.is_active,
      total_pending: totalPending,
      entry_count: empEntries.length,
      earliest_unpaid_date: dates[0] ?? null,
      latest_unpaid_date: dates[dates.length - 1] ?? null,
      total_kharcha: totalKharcha,
      advance_balance: advanceBal,
    } satisfies KarigarPendingWage;
  });
}

export function useKarigars(userId: string | null | undefined) {
  const [karigars, setKarigars] = useState<KarigarPendingWage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const loadLocal = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const computed = await computeLocalKarigarWages(userId);
    if (!alive.current) return;
    setKarigars(computed.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }, [userId]);

  const syncFromServer = useCallback(async () => {
    if (!userId || !navigator.onLine) return;
    setError(null);
    const [empRes, entriesRes, paymentsRes, kharchaRes, advancesRes] =
      await Promise.all([
        supabase.from("employees").select("*").eq("owner_id", userId),
        supabase.from("karigar_work_entries").select("*").eq("owner_id", userId),
        supabase.from("wage_payments").select("*").eq("owner_id", userId),
        supabase.from("karigar_kharcha").select("*").eq("owner_id", userId),
        supabase.from("karigar_advances").select("*").eq("owner_id", userId),
      ]);
    if (empRes.error) {
      if (!alive.current) return;
      if (!shouldSurfaceSyncError()) {
        await loadLocal();
        return;
      }
      const localCount = await localDB.employees
        .where("owner_id")
        .equals(userId)
        .count();
      if (localCount > 0) {
        await loadLocal();
        return;
      }
      setError(empRes.error.message);
      return;
    }
    if (empRes.data) {
      await localDB.employees.bulkPut(empRes.data.map((r) => withSync(r)));
    }
    if (entriesRes.data) {
      await localDB.karigar_work_entries.bulkPut(
        entriesRes.data.map((r) => withSync(r))
      );
    }
    if (paymentsRes.data) {
      await localDB.wage_payments.bulkPut(
        paymentsRes.data.map((r) => withSync(r))
      );
    }
    if (kharchaRes.data) {
      await localDB.karigar_kharcha.bulkPut(
        kharchaRes.data.map((r) => withSync(r))
      );
    }
    if (advancesRes.data) {
      await localDB.karigar_advances.bulkPut(
        advancesRes.data.map((r) => withSync(r))
      );
    }
    await loadLocal();
  }, [userId, loadLocal]);

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

  return { karigars, loading, error, refresh };
}
