import Dexie from "dexie";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import {
  localDB,
  tempId,
  withSync,
  type DexieTableName,
  type SyncMeta,
} from "@/lib/local-db";

export type WriteResult = { ok: boolean; offline: boolean; id: string };

type SupabaseTableName = keyof Database["public"]["Tables"];

function getTable(name: DexieTableName): Dexie.Table<SyncMeta & { id: string }> {
  return localDB[name] as Dexie.Table<SyncMeta & { id: string }>;
}

/** Omit generated Supabase columns on insert. */
function stripInsertPayload(
  table: DexieTableName,
  data: Record<string, unknown>
): Record<string, unknown> {
  if (table === "karigar_work_entries") {
    const { amount: _a, ...rest } = data;
    return rest;
  }
  return data;
}

function enrichForLocal(
  table: DexieTableName,
  record: Record<string, unknown>
): Record<string, unknown> {
  if (table === "karigar_work_entries") {
    const q = Number(record.quantity);
    const r = Number(record.rate);
    if (Number.isFinite(q) && Number.isFinite(r)) {
      return { ...record, amount: q * r };
    }
  }
  return record;
}

export async function offlineInsert(
  supabaseTable: SupabaseTableName,
  dexieTable: DexieTableName,
  data: Record<string, unknown> & { id?: string; owner_id: string }
): Promise<WriteResult> {
  const table = getTable(dexieTable);
  const newId =
    data.id ?? (typeof navigator !== "undefined" && navigator.onLine ? crypto.randomUUID() : tempId());
  const now = new Date().toISOString();
  const base = enrichForLocal(dexieTable, {
    ...data,
    id: newId,
    created_at: (data as { created_at?: string }).created_at ?? now,
    updated_at: (data as { updated_at?: string }).updated_at ?? now,
  });

  if (typeof navigator !== "undefined" && navigator.onLine) {
    const payload = stripInsertPayload(dexieTable, { ...data, id: newId });
    const { error } = await supabase
      .from(supabaseTable)
      .insert(payload as never);
    if (!error) {
      await table.put(withSync(base) as SyncMeta & { id: string });
      return { ok: true, offline: false, id: newId };
    }
  }

  const offlineId = newId.startsWith("offline_") ? newId : tempId();
  await table.put(
    withSync({ ...base, id: offlineId }, 0) as SyncMeta & { id: string }
  );
  return { ok: true, offline: true, id: offlineId };
}

export async function offlineUpdate(
  supabaseTable: SupabaseTableName,
  dexieTable: DexieTableName,
  id: string,
  changes: Record<string, unknown>
): Promise<WriteResult> {
  const table = getTable(dexieTable);
  const existing = await table.get(id);
  const merged = enrichForLocal(dexieTable, {
    ...(existing ?? {}),
    ...changes,
    id,
  });

  await table.put({
    ...merged,
    _synced: 0,
    _deleted: existing?._deleted ?? 0,
  } as SyncMeta & { id: string });

  if (typeof navigator !== "undefined" && navigator.onLine && !isOfflineIdBlocked(id)) {
    const payload = stripInsertPayload(dexieTable, changes as Record<string, unknown>);
    const { error } = await supabase
      .from(supabaseTable)
      .update(payload as never)
      .eq("id", id);
    if (!error) {
      await table.update(id, { _synced: 1 } as Partial<SyncMeta>);
      return { ok: true, offline: false, id };
    }
  }

  return { ok: true, offline: true, id };
}

function isOfflineIdBlocked(id: string): boolean {
  return id.startsWith("offline_");
}

export async function offlineDelete(
  supabaseTable: SupabaseTableName,
  dexieTable: DexieTableName,
  id: string
): Promise<WriteResult> {
  const table = getTable(dexieTable);
  const existing = await table.get(id);

  if (existing) {
    await table.put({ ...existing, _deleted: 1, _synced: 0 });
  } else {
    await table.put(
      withSync({ id, owner_id: "", _deleted: 1 }, 0) as SyncMeta & { id: string }
    );
  }

  if (typeof navigator !== "undefined" && navigator.onLine && !isOfflineIdBlocked(id)) {
    const { error } = await supabase.from(supabaseTable).delete().eq("id", id);
    if (!error) {
      await table.delete(id);
      return { ok: true, offline: false, id };
    }
  }

  if (isOfflineIdBlocked(id)) {
    await table.delete(id);
  }

  return { ok: true, offline: true, id };
}

/** Read a row from Dexie after write (for forms that need the saved shape). */
export async function readLocalRow<T>(
  dexieTable: DexieTableName,
  id: string
): Promise<T | null> {
  const row = await getTable(dexieTable).get(id);
  if (!row || row._deleted === 1) return null;
  const { _synced, _deleted, _local_id, ...rest } = row;
  return rest as T;
}
