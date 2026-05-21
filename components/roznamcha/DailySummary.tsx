"use client";

import { classNames, formatPKR } from "@/lib/format";

export interface DailySummaryProps {
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  closingBalance: number;
  onEditOpening: () => void;
}

export function DailySummary({
  openingBalance,
  totalIncome,
  totalExpense,
  closingBalance,
  onEditOpening,
}: DailySummaryProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Opening balance row */}
      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-3.5 shadow-card">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            Kal ka Baki (Opening)
          </p>
          <p className="mt-0.5 font-mono text-lg font-bold text-ink-900">
            Rs. {formatPKR(openingBalance)}
          </p>
        </div>
        <button
          type="button"
          onClick={onEditOpening}
          className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
        >
          Edit
        </button>
      </div>

      {/* 3-up totals */}
      <div className="grid grid-cols-3 gap-2">
        <SummaryTile
          label="AMDANI"
          value={`+ ${formatPKR(totalIncome)}`}
          tone="income"
        />
        <SummaryTile
          label="KHARCHA"
          value={`- ${formatPKR(totalExpense)}`}
          tone="expense"
        />
        <SummaryTile
          label="BAAKI"
          value={formatPKR(closingBalance)}
          tone={closingBalance < 0 ? "negative" : "neutral"}
        />
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense" | "neutral" | "negative";
}) {
  const styles =
    tone === "income"
      ? {
          bg: "bg-[#eff6ff]",
          labelColor: "text-[#3b82f6]",
          valueColor: "text-lena",
        }
      : tone === "expense"
        ? {
            bg: "bg-dena-50",
            labelColor: "text-dena",
            valueColor: "text-dena",
          }
        : tone === "negative"
          ? {
              bg: "bg-page border border-line",
              labelColor: "text-ink-500",
              valueColor: "text-dena",
            }
          : {
              bg: "bg-page border border-line",
              labelColor: "text-ink-500",
              valueColor: "text-ink-900",
            };
  return (
    <div className={classNames("rounded-xl p-2.5 text-center", styles.bg)}>
      <p
        className={classNames(
          "text-[10px] font-bold uppercase tracking-wide",
          styles.labelColor
        )}
      >
        {label}
      </p>
      <p
        className={classNames(
          "mt-1 font-mono text-[15px] font-bold",
          styles.valueColor
        )}
      >
        {value}
      </p>
    </div>
  );
}
