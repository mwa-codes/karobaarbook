"use client";

import { EditIcon, TrashIcon } from "@/components/ui/Icons";
import { classNames, formatPKR, formatDateShort } from "@/lib/format";
import type {
  PaymentMode,
  Transaction,
  TransactionCategory,
} from "@/types/database";
import { SyncPendingBadge, isSyncPending } from "@/components/ui/SyncPendingBadge";

export interface TransactionRowProps {
  transaction: Transaction & { _synced?: 0 | 1 };
  /** Running balance AFTER this transaction is applied. */
  runningBalance: number;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
}

const CATEGORY_LABEL: Record<TransactionCategory, string> = {
  sale: "Sale / Bill",
  purchase: "Purchase",
  payment_received: "Payment Received",
  payment_made: "Payment Made",
  opening_balance: "Opening Balance",
  other: "Other",
};

const PAYMENT_MODE_META: Record<
  PaymentMode,
  { icon: string; label: string }
> = {
  cash: { icon: "💵", label: "Cash" },
  bank: { icon: "🏦", label: "Bank" },
  cheque: { icon: "📄", label: "Cheque" },
  other: { icon: "📝", label: "Other" },
};

/** Render a ledger-style row: date / description / debit / credit / balance.
 *  - "lena" goes in the debit column (red — they owe you more).
 *  - "dena" goes in the credit column (green — you settled / received). */
export function TransactionRow({
  transaction,
  runningBalance,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const isLena = transaction.type === "lena";
  const isPayment =
    transaction.transaction_category === "payment_received" ||
    transaction.transaction_category === "payment_made";
  const showMode = isPayment || transaction.transaction_category === "other";
  const mode = PAYMENT_MODE_META[transaction.payment_mode];

  return (
    <div className="group rounded-2xl bg-white p-3 shadow-card">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-ink-500">
              {formatDateShort(transaction.transaction_date)}
            </span>
            <span
              className={classNames(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                isLena
                  ? "bg-lena-50 text-lena-700"
                  : "bg-dena-50 text-dena-700"
              )}
            >
              {CATEGORY_LABEL[transaction.transaction_category]}
            </span>
            <SyncPendingBadge pending={isSyncPending(transaction)} />
            {showMode ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-page px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </span>
            ) : null}
          </div>
          {transaction.description ? (
            <p className="mt-1 truncate text-sm text-ink-900">
              {transaction.description}
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-500">—</p>
          )}
        </div>

        <div className="text-right">
          <p
            className={classNames(
              "font-mono text-base font-bold",
              isLena ? "text-dena" : "text-lena"
            )}
          >
            {isLena ? "+" : "−"} {formatPKR(transaction.amount)}
          </p>
          <p
            className={classNames(
              "mt-0.5 font-mono text-xs font-semibold",
              runningBalance > 0
                ? "text-lena"
                : runningBalance < 0
                  ? "text-dena"
                  : "text-ink-500"
            )}
          >
            Bal: {formatPKR(Math.abs(runningBalance))}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1">
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(transaction)}
            aria-label="Edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-page hover:text-brand"
          >
            <EditIcon className="h-4 w-4" />
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(transaction)}
            aria-label="Delete"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-dena-50 hover:text-dena"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
