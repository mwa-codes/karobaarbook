import type { KarigarWorkEntry, WorkType } from "@/types/database";
import { formatPKR } from "@/lib/format";

export const KARIGAR_PENDING = {
  color: "#d97706",
  bg: "#fffbeb",
  border: "#fde68a",
};

export const KARIGAR_PAID = {
  color: "#64748b",
  bg: "#f8fafc",
};

export function workTypeLabel(type: WorkType): string {
  switch (type) {
    case "per_day":
      return "Dihari";
    case "per_piece":
      return "Per Piece";
    case "per_kg":
      return "Per Kg";
  }
}

export function workTypeIcon(type: WorkType): string {
  switch (type) {
    case "per_day":
      return "📅";
    case "per_piece":
      return "🔢";
    case "per_kg":
      return "⚖️";
  }
}

export function workTypeUnit(type: WorkType): string {
  switch (type) {
    case "per_day":
      return "din";
    case "per_piece":
      return "pieces";
    case "per_kg":
      return "kg";
  }
}

export function formatEntryDateHeader(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function formatPeriodRange(from: string, to: string): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
    });
  return `${fmt(from)} – ${fmt(to)}`;
}

export function groupEntriesByDate(
  entries: KarigarWorkEntry[]
): { date: string; entries: KarigarWorkEntry[]; dayTotal: number }[] {
  const map = new Map<string, KarigarWorkEntry[]>();
  for (const e of entries) {
    const list = map.get(e.entry_date) ?? [];
    list.push(e);
    map.set(e.entry_date, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayEntries]) => ({
      date,
      entries: dayEntries,
      dayTotal: dayEntries.reduce((s, e) => s + Number(e.amount), 0),
    }));
}

export type WageBreakdownItem = { label: string; amount: number };

export function computeWageBreakdown(
  entries: KarigarWorkEntry[]
): { items: WageBreakdownItem[]; gross: number } {
  const perDay = entries.filter((e) => e.work_type === "per_day");
  const perPiece = entries.filter((e) => e.work_type === "per_piece");
  const perKg = entries.filter((e) => e.work_type === "per_kg");

  const items: WageBreakdownItem[] = [];

  if (perDay.length > 0) {
    const days = perDay.reduce((s, e) => s + Number(e.quantity), 0);
    const amt = perDay.reduce((s, e) => s + Number(e.amount), 0);
    const rates = [...new Set(perDay.map((e) => Number(e.rate)))];
    const rateHint =
      rates.length === 1 ? `Rs. ${formatPKR(rates[0])}` : "mixed rates";
    items.push({
      label: `${days} din @ ${rateHint}`,
      amount: amt,
    });
  }

  if (perPiece.length > 0) {
    const pieces = perPiece.reduce((s, e) => s + Number(e.quantity), 0);
    const amt = perPiece.reduce((s, e) => s + Number(e.amount), 0);
    const detail = perPiece
      .map(
        (e) =>
          `${formatPKR(e.quantity)} @ Rs. ${formatPKR(e.rate)}${
            e.description ? ` (${e.description})` : ""
          }`
      )
      .join(" + ");
    items.push({
      label: `${formatPKR(pieces)} pieces — ${detail}`,
      amount: amt,
    });
  }

  if (perKg.length > 0) {
    const kg = perKg.reduce((s, e) => s + Number(e.quantity), 0);
    const amt = perKg.reduce((s, e) => s + Number(e.amount), 0);
    items.push({
      label: `${formatPKR(kg)} kg`,
      amount: amt,
    });
  }

  const gross = entries.reduce((s, e) => s + Number(e.amount), 0);
  return { items, gross };
}

export function wagePaymentTotals(entries: KarigarWorkEntry[]) {
  return {
    total_days: entries
      .filter((e) => e.work_type === "per_day")
      .reduce((s, e) => s + Number(e.quantity), 0),
    total_units: entries
      .filter((e) => e.work_type === "per_piece")
      .reduce((s, e) => s + Number(e.quantity), 0),
    total_hours: entries
      .filter((e) => e.work_type === "per_kg")
      .reduce((s, e) => s + Number(e.quantity), 0),
  };
}

export function computeNetPayable(
  gross: number,
  kharcha: number,
  advanceCut: number,
  otherDeductions: number
): number {
  return Math.max(0, gross - kharcha - advanceCut - otherDeductions);
}

export function parsePaymentMode(notes: string | null): string {
  if (!notes) return "—";
  const m = notes.match(/^\[([^\]]+)\]/);
  return m ? m[1] : "—";
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday–Sunday of the current calendar week (local time). */
export function getCurrentWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toIsoDate(monday), to: toIsoDate(sunday) };
}

export function advanceRemaining(advance: {
  amount: number;
  amount_settled: number;
}): number {
  return Math.max(0, Number(advance.amount) - Number(advance.amount_settled));
}
