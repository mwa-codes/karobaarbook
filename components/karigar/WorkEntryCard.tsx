"use client";

import { formatPKR } from "@/lib/format";
import {
  workTypeIcon,
  workTypeLabel,
  workTypeUnit,
  KARIGAR_PAID,
} from "@/lib/karigar";
import { TrashIcon } from "@/components/ui/Icons";
import type { KarigarWorkEntry } from "@/types/database";
import { SyncPendingBadge, isSyncPending } from "@/components/ui/SyncPendingBadge";

export function WorkEntryCard({
  entry,
  onDelete,
}: {
  entry: KarigarWorkEntry & { _synced?: 0 | 1 };
  onDelete?: (entry: KarigarWorkEntry) => void;
}) {
  const isPaid = entry.wage_payment_id != null;
  const qty = Number(entry.quantity);
  const rate = Number(entry.rate);
  const amount = Number(entry.amount);

  return (
    <div
      className="flex items-start justify-between gap-2 rounded-xl px-3 py-2.5"
      style={{
        background: isPaid ? KARIGAR_PAID.bg : "white",
        opacity: isPaid ? 0.85 : 1,
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-500">
          {workTypeIcon(entry.work_type)} {workTypeLabel(entry.work_type)}
        </p>
        <p className="mt-0.5 font-mono text-sm font-semibold text-ink-900">
          {formatPKR(qty)} {workTypeUnit(entry.work_type)} × Rs. {formatPKR(rate)}{" "}
          = Rs. {formatPKR(amount)}
          <SyncPendingBadge pending={isSyncPending(entry)} />
        </p>
        {entry.description ? (
          <p className="mt-0.5 text-xs text-ink-500">{entry.description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isPaid ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: KARIGAR_PAID.bg, color: KARIGAR_PAID.color }}
          >
            Paid
          </span>
        ) : onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(entry)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-dena hover:bg-dena-50"
            aria-label="Delete entry"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
