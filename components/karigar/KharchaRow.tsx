"use client";

import { formatPKR } from "@/lib/format";
import { formatEntryDateHeader, KARIGAR_PAID } from "@/lib/karigar";
import { TrashIcon } from "@/components/ui/Icons";
import type { KarigarKharcha } from "@/types/database";

export function KharchaRow({
  item,
  onDelete,
}: {
  item: KarigarKharcha;
  onDelete?: (item: KarigarKharcha) => void;
}) {
  const settled = item.wage_payment_id != null;

  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2.5"
      style={{ background: settled ? KARIGAR_PAID.bg : "white", opacity: settled ? 0.85 : 1 }}
    >
      <div>
        <p className="text-xs text-ink-500">{formatEntryDateHeader(item.entry_date)}</p>
        <p className="font-mono text-sm font-semibold text-dena">
          − Rs. {formatPKR(item.amount)}
        </p>
        {item.description ? (
          <p className="text-xs text-ink-500">{item.description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {settled ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ color: KARIGAR_PAID.color, background: KARIGAR_PAID.bg }}
          >
            Cut ho gayi
          </span>
        ) : onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-dena hover:bg-dena-50"
            aria-label="Delete kharcha"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
