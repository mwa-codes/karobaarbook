"use client";

import { EditIcon, TrashIcon } from "@/components/ui/Icons";
import { classNames, formatPKR, formatDateShort } from "@/lib/format";
import type { PaymentMode, RoznamchaEntry } from "@/types/database";
import { SyncPendingBadge, isSyncPending } from "@/components/ui/SyncPendingBadge";

const PAYMENT_MODE_META: Record<
  PaymentMode,
  { icon: string; label: string }
> = {
  cash: { icon: "💵", label: "Cash" },
  bank: { icon: "🏦", label: "Bank" },
  cheque: { icon: "📄", label: "Cheque" },
  other: { icon: "📝", label: "Other" },
};

export interface EntryCardProps {
  entry: RoznamchaEntry & { _synced?: 0 | 1 };
  onEdit?: (e: RoznamchaEntry) => void;
  onDelete?: (e: RoznamchaEntry) => void;
}

export function EntryCard({ entry, onEdit, onDelete }: EntryCardProps) {
  const isIncome = entry.type === "income";
  const mode = PAYMENT_MODE_META[entry.payment_mode];

  return (
    <div
      className={classNames(
        "rounded-2xl bg-white p-3.5 shadow-card border-l-4",
        isIncome ? "border-l-lena" : "border-l-dena"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink-900">
            <span className="mr-1">{isIncome ? "💰" : "🛒"}</span>
            {entry.description}
            <SyncPendingBadge pending={isSyncPending(entry)} />
          </p>
          <p className="mt-1 text-[12px] text-ink-500">
            <span
              className={classNames(
                "font-semibold",
                isIncome ? "text-lena" : "text-dena"
              )}
            >
              {isIncome ? "Amdani" : "Kharcha"}
            </span>
            <span className="mx-1">•</span>
            <span>
              {mode.icon} {mode.label}
            </span>
            <span className="mx-1">•</span>
            <span>{formatDateShort(entry.entry_date)}</span>
            {entry.category ? (
              <>
                <span className="mx-1">•</span>
                <span>{entry.category}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <p
            className={classNames(
              "font-mono text-[17px] font-bold",
              isIncome ? "text-lena" : "text-dena"
            )}
          >
            {isIncome ? "+" : "−"} Rs. {formatPKR(entry.amount)}
          </p>
          <div className="mt-1 flex items-center gap-1">
            {onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(entry)}
                aria-label="Edit"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-page hover:text-brand"
              >
                <EditIcon className="h-4 w-4" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(entry)}
                aria-label="Delete"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-dena-50 hover:text-dena"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
