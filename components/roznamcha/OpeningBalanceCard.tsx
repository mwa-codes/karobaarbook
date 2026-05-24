"use client";

import { EditIcon, TrashIcon } from "@/components/ui/Icons";
import { classNames, formatPKR } from "@/lib/format";

export function OpeningBalanceCard({
  amount,
  onEdit,
  onDelete,
}: {
  amount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-3.5 shadow-card border-l-4 border-l-brand">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink-900">
            <span className="mr-1">📒</span>
            Kal ka Bakaya (Opening Balance)
          </p>
          <p className="mt-1 text-[12px] text-ink-500">
            <span className="font-semibold text-brand-700">Manual set</span>
            <span className="mx-1">•</span>
            <span>Pichle din ke auto balance ko override karta hai</span>
          </p>
        </div>
        <div className="flex flex-col items-end">
          <p className="font-mono text-[17px] font-bold text-ink-900">
            Rs. {formatPKR(amount)}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit opening balance"
              className={classNames(
                "inline-flex h-8 w-8 items-center justify-center rounded-full",
                "text-ink-500 hover:bg-white hover:text-brand"
              )}
            >
              <EditIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete opening balance"
              className={classNames(
                "inline-flex h-8 w-8 items-center justify-center rounded-full",
                "text-ink-500 hover:bg-dena-50 hover:text-dena"
              )}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
