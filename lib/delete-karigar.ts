import { localDB } from "@/lib/local-db";
import { offlineDelete, type WriteResult } from "@/lib/offline-write";

/** Remove all local rows tied to a karigar (keeps Dexie in sync after server cascade). */
export async function purgeLocalKarigarData(employeeId: string): Promise<void> {
  const advanceIds = await localDB.karigar_advances
    .where("employee_id")
    .equals(employeeId)
    .primaryKeys();

  if (advanceIds.length > 0) {
    const appIds = await localDB.karigar_advance_applications
      .where("advance_id")
      .anyOf(advanceIds)
      .primaryKeys();
    if (appIds.length > 0) {
      await localDB.karigar_advance_applications.bulkDelete(appIds);
    }
  }

  const tables = [
    localDB.karigar_work_entries,
    localDB.karigar_kharcha,
    localDB.karigar_advances,
    localDB.wage_payments,
  ] as const;

  await Promise.all(
    tables.map(async (table) => {
      const ids = await table.where("employee_id").equals(employeeId).primaryKeys();
      if (ids.length > 0) await table.bulkDelete(ids);
    })
  );
}

export async function deleteKarigar(
  ownerId: string,
  employeeId: string
): Promise<WriteResult> {
  const row = await localDB.employees.get(employeeId);
  if (row && row.owner_id !== ownerId) {
    return { ok: false, offline: false, id: employeeId };
  }

  const result = await offlineDelete("employees", "employees", employeeId);
  if (!result.ok) return result;

  await purgeLocalKarigarData(employeeId);
  return result;
}
