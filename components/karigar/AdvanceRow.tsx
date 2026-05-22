"use client";

import { formatPKR } from "@/lib/format";
import { formatEntryDateHeader } from "@/lib/karigar";
import { advanceBalance } from "@/hooks/useKarigarAdvances";
import { TrashIcon } from "@/components/ui/Icons";
import type { KarigarAdvance } from "@/types/database";

export function AdvanceRow({
  advance,
  onDelete,
}: {
  advance: KarigarAdvance;
  onDelete?: (advance: KarigarAdvance) => void;
}) {
  const balance = advanceBalance(advance);
  const settled = balance <= 0;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white">
      <div>
        <p className="text-xs text-ink-500">{formatEntryDateHeader(advance.entry_date)}</p>
        <p className="font-mono text-sm font-semibold text-ink-900">
          Rs. {formatPKR(advance.amount)}
          {!settled ? (
            <span className="ml-2 text-xs font-normal text-amber-700">
              baaki Rs. {formatPKR(balance)}
            </span>
          ) : null}
        </p>
        {advance.description ? (
          <p className="text-xs text-ink-500">{advance.description}</p>
        ) : null}
        {Number(advance.amount_settled) > 0 ? (
          <p className="text-[11px] text-ink-500">
            Kat chuka: Rs. {formatPKR(advance.amount_settled)}
          </p>
        ) : null}
      </div>
      {!settled && Number(advance.amount_settled) === 0 && onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(advance)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-dena hover:bg-dena-50"
          aria-label="Delete advance"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
