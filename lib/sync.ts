import Dexie from "dexie";
import { supabase } from "@/lib/supabase";
import { localDB, isOfflineRecord, type SyncMeta } from "@/lib/local-db";

const SUPABASE_TABLES = [
  "parties",
  "transactions",
  "employees",
  "karigar_work_entries",
  "wage_payments",
  "roznamcha",
  "daily_opening_balance",
  "karigar_kharcha",
  "karigar_advances",
  "karigar_advance_applications",
] as const;

type SupabaseTable = (typeof SUPABASE_TABLES)[number];

function getLocalTable(name: SupabaseTable): Dexie.Table<SyncMeta & { id: string; owner_id: string }> {
  return localDB[name] as Dexie.Table<SyncMeta & { id: string; owner_id: string }>;
}

/** Strip Dexie-only fields and generated DB columns before Supabase writes. */
function stripForServer(
  table: SupabaseTable,
  record: Record<string, unknown>
): Record<string, unknown> {
  const { _synced, _deleted, _local_id, ...clean } = record;
  if (table === "karigar_work_entries") {
    const { amount: _amount, ...rest } = clean;
    return rest;
  }
  return clean;
}

export async function pullFromSupabase(ownerId: string): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  try {
    const results = await Promise.allSettled(
      SUPABASE_TABLES.map((table) =>
        supabase.from(table).select("*").eq("owner_id", ownerId)
      )
    );

    const merge = async <T extends { id: string } & SyncMeta>(
      table: Dexie.Table<T>,
      res: PromiseSettledResult<{ data: unknown[] | null; error: unknown }>
    ) => {
      if (res.status !== "fulfilled" || res.value.error || !res.value.data) return;
      const serverRows = res.value.data as T[];
      const pending = new Set(
        (await table.where("_synced").equals(0).toArray()).map((r) => r.id)
      );
      const toUpsert = serverRows
        .filter((r) => !pending.has(r.id))
        .map((r) => ({ ...r, _synced: 1 as const, _deleted: 0 as const }));
      if (toUpsert.length) await table.bulkPut(toUpsert);
    };

    await Promise.all(
      SUPABASE_TABLES.map((table, i) =>
        merge(getLocalTable(table) as Dexie.Table<{ id: string } & SyncMeta>, results[i])
      )
    );
  } catch {
    // offline / network errors are fine
  }
}

export async function pushToSupabase(ownerId: string): Promise<{
  synced: number;
  failed: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  const syncTable = async (supabaseTable: SupabaseTable) => {
    const localTable = getLocalTable(supabaseTable);
    const pending = await localTable
      .where("_synced")
      .equals(0)
      .and((r) => r.owner_id === ownerId)
      .toArray();

    for (const record of pending) {
      const { _synced, _deleted, _local_id, ...rest } = record;
      const clean = stripForServer(supabaseTable, rest as Record<string, unknown>);

      try {
        if (_deleted === 1) {
          if (!isOfflineRecord(record.id)) {
            const { error } = await supabase
              .from(supabaseTable)
              .delete()
              .eq("id", record.id);
            if (error) throw error;
          }
          await localTable.delete(record.id);
        } else if (isOfflineRecord(record.id)) {
          const newId = crypto.randomUUID();
          const { error } = await supabase
            .from(supabaseTable)
            .insert({ ...clean, id: newId } as never);
          if (error) throw error;
          await localTable.delete(record.id);
          await localTable.put({
            ...record,
            ...clean,
            id: newId,
            _synced: 1,
            _local_id: record.id,
          } as typeof record);
        } else {
          const { error } = await supabase
            .from(supabaseTable)
            .upsert(clean as never);
          if (error) throw error;
          await localTable.update(record.id, { _synced: 1 } as Partial<typeof record>);
        }
        synced++;
      } catch {
        failed++;
      }
    }
  };

  for (const table of SUPABASE_TABLES) {
    await syncTable(table);
  }

  if (synced > 0) await pullFromSupabase(ownerId);

  return { synced, failed };
}

export async function getPendingCount(ownerId: string): Promise<number> {
  const counts = await Promise.all(
    SUPABASE_TABLES.map((table) =>
      getLocalTable(table)
        .where("_synced")
        .equals(0)
        .and((r) => r.owner_id === ownerId)
        .count()
    )
  );
  return counts.reduce((a, b) => a + b, 0);
}
