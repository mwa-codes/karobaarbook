"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { advanceRemaining, getCurrentWeekRange } from "@/lib/karigar";
import {
  buildKarigarPendingSummaryMessage,
  buildKarigarPeriodDetailMessage,
  buildKarigarPeriodWageSlipMessage,
  buildWageSlipFromPayment,
  openWhatsApp,
} from "@/lib/whatsapp";
import type {
  Employee,
  KarigarAdvance,
  KarigarKharcha,
  KarigarWorkEntry,
  WagePayment,
} from "@/types/database";

function ShareOption({
  emoji,
  title,
  subtitle,
  onShare,
  disabled,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  onShare: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onShare}
      className="flex w-full items-center gap-4 rounded-2xl border border-line bg-white px-4 py-3 text-left hover:bg-page active:bg-page disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>
      </div>
      <span className="text-ink-400">›</span>
    </button>
  );
}

function defaultPeriod(
  unpaidEntries: KarigarWorkEntry[],
  unpaidKharcha: KarigarKharcha[]
): { from: string; to: string } {
  const dates = [
    ...unpaidEntries.map((e) => e.entry_date),
    ...unpaidKharcha.map((k) => k.entry_date),
  ];
  if (dates.length > 0) {
    const sorted = [...dates].sort();
    return { from: sorted[0]!, to: sorted[sorted.length - 1]! };
  }
  return getCurrentWeekRange();
}

export function KarigarShareSheet({
  open,
  onClose,
  employee,
  factoryName,
  unpaidEntries,
  unpaidKharcha,
  openAdvances,
  allEntries,
  allKharcha,
  payments,
  pendingSummary,
}: {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  factoryName?: string;
  unpaidEntries: KarigarWorkEntry[];
  unpaidKharcha: KarigarKharcha[];
  openAdvances: KarigarAdvance[];
  allEntries: KarigarWorkEntry[];
  allKharcha: KarigarKharcha[];
  payments: WagePayment[];
  pendingSummary: {
    kaamPending: number;
    kharchaPending: number;
    advanceBalance: number;
    estimatedNet: number;
  };
}) {
  const toast = useToast();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (open) {
      const { from, to } = defaultPeriod(unpaidEntries, unpaidKharcha);
      setDateFrom(from);
      setDateTo(to);
    }
  }, [open, unpaidEntries, unpaidKharcha]);

  const lastPayment = payments[0] ?? null;

  const rangeKharchaTotal = useMemo(() => {
    if (!dateFrom || !dateTo) return 0;
    return unpaidKharcha
      .filter((k) => k.entry_date >= dateFrom && k.entry_date <= dateTo)
      .reduce((s, k) => s + Number(k.amount), 0);
  }, [unpaidKharcha, dateFrom, dateTo]);

  const rangeAdvanceTotal = useMemo(
    () => openAdvances.reduce((s, a) => s + advanceRemaining(a), 0),
    [openAdvances]
  );

  const periodValid = Boolean(dateFrom && dateTo && dateFrom <= dateTo);
  const phone = employee.phone ?? undefined;

  function share(msg: string) {
    openWhatsApp(msg, phone);
    onClose();
  }

  async function copy(msg: string) {
    await navigator.clipboard.writeText(msg);
    toast.success("Copy ho gaya!");
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="WhatsApp pe share karein">
      <div className="flex flex-col gap-3 pb-2">
        <div className="rounded-2xl border border-line bg-page p-3">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
            Date range (hafta / custom)
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input
              label="From"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="To"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const w = getCurrentWeekRange();
              setDateFrom(w.from);
              setDateTo(w.to);
            }}
            className="mt-2 text-xs font-semibold text-brand"
          >
            Is hafte (Mon–Sun) select karein
          </button>
        </div>

        <ShareOption
          emoji="💰"
          title="Pending Hisaab"
          subtitle="Unpaid kaam, kharcha, advance — abhi kitna dena hai"
          onShare={() => {
            share(
              buildKarigarPendingSummaryMessage(
                employee.name,
                {
                  ...pendingSummary,
                  unpaidEntryCount: unpaidEntries.length,
                },
                factoryName
              )
            );
          }}
        />

        <ShareOption
          emoji="📋"
          title="Period Detail"
          subtitle="Kaam, kharcha, advance ki poori list (upar wali dates)"
          disabled={!periodValid}
          onShare={() => {
            if (!periodValid) return;
            share(
              buildKarigarPeriodDetailMessage(
                employee.name,
                { from: dateFrom, to: dateTo },
                allEntries,
                allKharcha,
                openAdvances,
                factoryName
              )
            );
          }}
        />

        <ShareOption
          emoji="📄"
          title="Period Wage Slip (Andaza)"
          subtitle="Breakdown + net — payment se pehle bhi bhej sakte hain"
          disabled={!periodValid}
          onShare={() => {
            if (!periodValid) return;
            const grossEntries = allEntries.filter(
              (e) =>
                e.entry_date >= dateFrom &&
                e.entry_date <= dateTo &&
                e.wage_payment_id == null
            );
            if (
              grossEntries.length === 0 &&
              rangeKharchaTotal === 0 &&
              rangeAdvanceTotal === 0
            ) {
              toast.error("Is range me share karne ke liye kuch nahi.");
              return;
            }
            share(
              buildKarigarPeriodWageSlipMessage(
                employee.name,
                { from: dateFrom, to: dateTo },
                allEntries.filter(
                  (e) => e.entry_date >= dateFrom && e.entry_date <= dateTo
                ),
                rangeKharchaTotal,
                rangeAdvanceTotal,
                0,
                factoryName,
                false
              )
            );
          }}
        />

        <ShareOption
          emoji="✅"
          title="Last Payment Wage Slip"
          subtitle={
            lastPayment
              ? `Paid: Rs. ${lastPayment.net_amount} — dubara bhejein`
              : "Abhi koi payment record nahi"
          }
          disabled={!lastPayment}
          onShare={() => {
            if (!lastPayment) return;
            share(
              buildWageSlipFromPayment(employee.name, lastPayment, factoryName)
            );
          }}
        />

        <ShareOption
          emoji="📝"
          title="Copy Karein"
          subtitle="Pending hisaab clipboard pe"
          onShare={() => {
            void copy(
              buildKarigarPendingSummaryMessage(
                employee.name,
                {
                  ...pendingSummary,
                  unpaidEntryCount: unpaidEntries.length,
                },
                factoryName
              )
            );
          }}
        />

        {!phone ? (
          <p className="text-center text-xs text-ink-500">
            Karigar ka phone add karein (edit) — WhatsApp seedha un par khulega.
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}

export function WhatsAppShareIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
