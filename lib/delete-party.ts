import { localDB } from "@/lib/local-db";
import { offlineDelete } from "@/lib/offline-write";
import type { WriteResult } from "@/lib/offline-write";

/** Soft-delete party and all its transactions locally (matches DB cascade). */
export async function deletePartyWithTransactions(
  partyId: string,
  ownerId: string
): Promise<WriteResult> {
  const transactions = await localDB.transactions
    .where("party_id")
    .equals(partyId)
    .and((t) => t._deleted === 0 && t.owner_id === ownerId)
    .toArray();

  for (const tx of transactions) {
    const result = await offlineDelete("transactions", "transactions", tx.id);
    if (!result.ok) return result;
  }

  return offlineDelete("parties", "parties", partyId);
}
