import { localDB } from "@/lib/local-db";
import type { RoznamchaDayResult } from "@/types/database";

/** Local fallback when `get_roznamcha_day` RPC is unavailable (offline). */
export async function computeLocalRoznamchaDay(
  ownerId: string,
  date: string
): Promise<RoznamchaDayResult> {
  const explicit = await localDB.daily_opening_balance
    .where("owner_id")
    .equals(ownerId)
    .and((r) => r._deleted === 0 && r.entry_date === date)
    .first();

  if (explicit) {
    return {
      opening_balance: Number(explicit.opening_balance),
      is_explicit: true,
    };
  }

  const allEntries = await localDB.roznamcha
    .where("owner_id")
    .equals(ownerId)
    .and((r) => r._deleted === 0)
    .toArray();

  const allOpenings = await localDB.daily_opening_balance
    .where("owner_id")
    .equals(ownerId)
    .and((r) => r._deleted === 0)
    .toArray();

  const datesBefore = new Set<string>();
  for (const e of allEntries) {
    if (e.entry_date < date) datesBefore.add(e.entry_date);
  }
  for (const o of allOpenings) {
    if (o.entry_date < date) datesBefore.add(o.entry_date);
  }

  if (datesBefore.size === 0) {
    return { opening_balance: 0, is_explicit: false };
  }

  const sortedDates = [...datesBefore].sort();
  let closing = 0;

  for (const d of sortedDates) {
    const openingRow = allOpenings.find((o) => o.entry_date === d);
    const opening = openingRow
      ? Number(openingRow.opening_balance)
      : closing;
    const dayEntries = allEntries.filter((e) => e.entry_date === d);
    const income = dayEntries
      .filter((e) => e.type === "income")
      .reduce((s, e) => s + Number(e.amount), 0);
    const expense = dayEntries
      .filter((e) => e.type === "expense")
      .reduce((s, e) => s + Number(e.amount), 0);
    closing = opening + income - expense;
  }

  return { opening_balance: closing, is_explicit: false };
}
