import { isOfflineRecord, localDB } from "@/lib/local-db";
import type { LocalTransaction } from "@/lib/local-db";

/** Drop local rows removed on server (e.g. cascade when a party is deleted). */
export async function reconcileTransactionsFromServer(
  ownerId: string,
  serverRows: LocalTransaction[]
): Promise<void> {
  const serverIds = new Set(serverRows.map((r) => r.id));
  const pendingIds = new Set(
    (
      await localDB.transactions
        .where("_synced")
        .equals(0)
        .and((t) => t.owner_id === ownerId)
        .toArray()
    ).map((t) => t.id)
  );

  const locals = await localDB.transactions
    .where("owner_id")
    .equals(ownerId)
    .toArray();

  for (const row of locals) {
    if (
      row._deleted === 0 &&
      !serverIds.has(row.id) &&
      !pendingIds.has(row.id) &&
      !isOfflineRecord(row.id)
    ) {
      await localDB.transactions.delete(row.id);
    }
  }
}
