import { localDB } from "@/lib/local-db";
import { offlineDelete, offlineInsert } from "@/lib/offline-write";
import type { WriteResult } from "@/lib/offline-write";

/**
 * Clear opening for a day: remove a manual override, or set explicit Rs 0 when
 * the value was auto-calculated from prior days.
 */
export async function clearOpeningBalanceForDay(
  ownerId: string,
  date: string
): Promise<WriteResult> {
  const existing = await localDB.daily_opening_balance
    .where("owner_id")
    .equals(ownerId)
    .and((r) => r._deleted === 0 && r.entry_date === date)
    .first();

  if (existing) {
    return deleteExplicitOpeningBalance(ownerId, date);
  }

  return offlineInsert("daily_opening_balance", "daily_opening_balance", {
    owner_id: ownerId,
    entry_date: date,
    opening_balance: 0,
  });
}

/** Remove manual opening balance for a day (falls back to auto-calculate). */
export async function deleteExplicitOpeningBalance(
  ownerId: string,
  date: string
): Promise<WriteResult> {
  const existing = await localDB.daily_opening_balance
    .where("owner_id")
    .equals(ownerId)
    .and((r) => r._deleted === 0 && r.entry_date === date)
    .first();

  if (!existing) {
    return { ok: true, offline: false, id: "" };
  }

  return offlineDelete(
    "daily_opening_balance",
    "daily_opening_balance",
    existing.id
  );
}
