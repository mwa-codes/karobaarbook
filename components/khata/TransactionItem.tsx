"use client";

import { EditIcon, TrashIcon } from "@/components/ui/Icons";
import { classNames, formatDateLong, formatPKR } from "@/lib/format";
import type { Transaction } from "@/types/database";

export interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
}

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const isLena = transaction.type === "lena";
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={classNames(
              "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
              isLena ? "bg-lena-50 text-lena-700" : "bg-dena-50 text-dena-700"
            )}
          >
            {isLena ? "Lena" : "Dena"}
          </span>
          <span className="text-xs text-ink-500">
            {formatDateLong(transaction.transaction_date)}
          </span>
        </div>
        {transaction.description ? (
          <p className="mt-1 truncate text-sm text-ink-900">
            {transaction.description}
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-500">—</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <div className="text-right">
          <p
            className={classNames(
              "font-mono text-base font-bold",
              isLena ? "text-lena" : "text-dena"
            )}
          >
            {isLena ? "+" : "−"} {formatPKR(transaction.amount)}
          </p>
        </div>
        <div className="ml-1 flex items-center gap-1">
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(transaction)}
              aria-label="Edit"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-page hover:text-brand"
            >
              <EditIcon className="h-4 w-4" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(transaction)}
              aria-label="Delete"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-dena-50 hover:text-dena"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
