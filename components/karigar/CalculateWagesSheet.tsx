"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useOffline } from "@/context/OfflineContext";
import {
  offlineInsert,
  offlineUpdate,
} from "@/lib/offline-write";
import { classNames, formatPKR, formatRs } from "@/lib/format";
import {
  computeWageBreakdown,
  computeNetPayable,
  formatPeriodRange,
  wagePaymentTotals,
  KARIGAR_PENDING,
} from "@/lib/karigar";
import { advanceBalance } from "@/hooks/useKarigarAdvances";
import { WageSlipShare } from "@/components/karigar/WageSlipShare";
import type {
  Employee,
  KarigarAdvance,
  KarigarKharcha,
  KarigarWorkEntry,
  PaymentMode,
} from "@/types/database";

type AdvanceCut = { advanceId: string; amount: number };

export function CalculateWagesSheet({
  open,
  onClose,
  ownerId,
  employee,
  unpaidEntries,
  unpaidKharcha,
  openAdvances,
  onPaid,
  factoryName,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  employee: Employee;
  unpaidEntries: KarigarWorkEntry[];
  unpaidKharcha: KarigarKharcha[];
  openAdvances: KarigarAdvance[];
  onPaid: () => void;
  factoryName?: string;
}) {
  const toast = useToast();
  const { refreshPending } = useOffline();

  const earliest = useMemo(() => {
    const dates = [
      ...unpaidEntries.map((e) => e.entry_date),
      ...unpaidKharcha.map((k) => k.entry_date),
    ];
    return dates.length ? dates.sort()[0] : null;
  }, [unpaidEntries, unpaidKharcha]);

  const latest = useMemo(() => {
    const dates = [
      ...unpaidEntries.map((e) => e.entry_date),
      ...unpaidKharcha.map((k) => k.entry_date),
    ];
    return dates.length ? dates.sort().at(-1) ?? null : null;
  }, [unpaidEntries, unpaidKharcha]);

  const [dateFrom, setDateFrom] = useState(earliest ?? "");
  const [dateTo, setDateTo] = useState(latest ?? "");
  const [deductions, setDeductions] = useState("0");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [notes, setNotes] = useState("");
  const [advanceCuts, setAdvanceCuts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [paidResult, setPaidResult] = useState<{
    breakdown: { label: string; amount: number }[];
    gross: number;
    kharcha: number;
    advance: number;
    deductions: number;
    net: number;
    from: string;
    to: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setDateFrom(earliest ?? "");
      setDateTo(latest ?? "");
      setDeductions("0");
      setPaymentMode("cash");
      setNotes("");
      setAdvanceCuts({});
      setPaidResult(null);
    }
  }, [open, earliest, latest]);

  const rangeEntries = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    return unpaidEntries.filter(
      (e) => e.entry_date >= dateFrom && e.entry_date <= dateTo
    );
  }, [unpaidEntries, dateFrom, dateTo]);

  const rangeKharcha = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    return unpaidKharcha.filter(
      (k) => k.entry_date >= dateFrom && k.entry_date <= dateTo
    );
  }, [unpaidKharcha, dateFrom, dateTo]);

  const { items: breakdown, gross } = useMemo(
    () => computeWageBreakdown(rangeEntries),
    [rangeEntries]
  );

  const kharchaTotal = useMemo(
    () => rangeKharcha.reduce((s, k) => s + Number(k.amount), 0),
    [rangeKharcha]
  );

  const resolvedAdvanceCuts = useMemo((): AdvanceCut[] => {
    const cuts: AdvanceCut[] = [];
    for (const adv of openAdvances) {
      const raw = advanceCuts[adv.id]?.trim();
      if (!raw) continue;
      const amt = Number(raw);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      const max = advanceBalance(adv);
      cuts.push({ advanceId: adv.id, amount: Math.min(amt, max) });
    }
    return cuts;
  }, [openAdvances, advanceCuts]);

  const advanceTotal = useMemo(
    () => resolvedAdvanceCuts.reduce((s, c) => s + c.amount, 0),
    [resolvedAdvanceCuts]
  );

  const otherDed = Number(deductions) || 0;
  const net = computeNetPayable(gross, kharchaTotal, advanceTotal, otherDed);

  const canPay =
    rangeEntries.length > 0 || rangeKharcha.length > 0 || advanceTotal > 0;

  function setAdvanceCut(advanceId: string, value: string) {
    setAdvanceCuts((prev) => ({ ...prev, [advanceId]: value }));
  }

  function fillAdvanceBalance(advance: KarigarAdvance) {
    setAdvanceCut(advance.id, String(advanceBalance(advance)));
  }

  async function handleMarkPaid() {
    if (!dateFrom || !dateTo) {
      toast.error("Date range select karein.");
      return;
    }
    if (!canPay) {
      toast.error("Is range me kaam, kharcha, ya advance cut kuch nahi.");
      return;
    }

    for (const adv of openAdvances) {
      const raw = advanceCuts[adv.id]?.trim();
      if (!raw) continue;
      const amt = Number(raw);
      if (amt > advanceBalance(adv)) {
        toast.error("Advance cut balance se zyada hai.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const totals = wagePaymentTotals(rangeEntries);
      const noteText = [
        `[${paymentMode === "bank" ? "Bank" : paymentMode === "cheque" ? "Cheque" : paymentMode === "other" ? "Other" : "Cash"}]`,
        notes.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      const paymentResult = await offlineInsert("wage_payments", "wage_payments", {
        owner_id: ownerId,
        employee_id: employee.id,
        period_start: dateFrom,
        period_end: dateTo,
        ...totals,
        gross_amount: gross,
        kharcha_deduction: kharchaTotal,
        advance_deduction: advanceTotal,
        deductions: otherDed,
        net_amount: net,
        paid: true,
        paid_at: new Date().toISOString(),
        notes: noteText || null,
      });
      const paymentId = paymentResult.id;

      for (const entry of rangeEntries) {
        await offlineUpdate("karigar_work_entries", "karigar_work_entries", entry.id, {
          wage_payment_id: paymentId,
        });
      }

      for (const kh of rangeKharcha) {
        await offlineUpdate("karigar_kharcha", "karigar_kharcha", kh.id, {
          wage_payment_id: paymentId,
        });
      }

      for (const cut of resolvedAdvanceCuts) {
        const adv = openAdvances.find((a) => a.id === cut.advanceId);
        if (!adv) continue;

        await offlineInsert(
          "karigar_advance_applications",
          "karigar_advance_applications",
          {
            owner_id: ownerId,
            advance_id: cut.advanceId,
            wage_payment_id: paymentId,
            amount: cut.amount,
          }
        );

        const newSettled = Number(adv.amount_settled) + cut.amount;
        await offlineUpdate("karigar_advances", "karigar_advances", cut.advanceId, {
          amount_settled: newSettled,
        });
      }

      toast.success(
        paymentResult.offline
          ? "Offline — payment local save ho gayi, internet pe sync ho jaegi."
          : "Payment mark ho gayi."
      );
      await refreshPending();
      const slipBreakdown = [
        ...breakdown,
        ...(kharchaTotal > 0
          ? [{ label: `Kharcha (${rangeKharcha.length} entries)`, amount: -kharchaTotal }]
          : []),
        ...(advanceTotal > 0
          ? [{ label: "Advance cut", amount: -advanceTotal }]
          : []),
      ];
      setPaidResult({
        breakdown: slipBreakdown,
        gross,
        kharcha: kharchaTotal,
        advance: advanceTotal,
        deductions: otherDed,
        net,
        from: dateFrom,
        to: dateTo,
      });
      onPaid();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment save nahi hui.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`${employee.name} ki Wages`}
    >
      {paidResult ? (
        <div>
          <p className="text-sm text-ink-500">
            Payment save ho gayi — {formatPeriodRange(paidResult.from, paidResult.to)}
          </p>
          <WageSlipShare
            employeeName={employee.name}
            phone={employee.phone}
            period={{ from: paidResult.from, to: paidResult.to }}
            breakdown={paidResult.breakdown}
            gross={paidResult.gross}
            deductions={paidResult.deductions}
            net={paidResult.net}
            kharcha={paidResult.kharcha}
            advance={paidResult.advance}
            factoryName={factoryName}
          />
          <Button variant="secondary" fullWidth className="mt-2" onClick={onClose}>
            Band karein
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-2 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
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

          <div
            className="rounded-2xl border p-3 text-sm"
            style={{
              background: KARIGAR_PENDING.bg,
              borderColor: KARIGAR_PENDING.border,
            }}
          >
            <p className="font-semibold text-ink-900">Kaam (gross)</p>
            {breakdown.length === 0 ? (
              <p className="mt-2 text-ink-500">Is range me kaam ki entry nahi.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {breakdown.map((b, i) => (
                  <li key={i} className="flex justify-between gap-2 text-ink-700">
                    <span className="min-w-0 flex-1 text-xs">{b.label}</span>
                    <span className="shrink-0 font-mono font-semibold">
                      Rs. {formatPKR(b.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-dena-100 bg-dena-50 p-3 text-sm">
            <p className="font-semibold text-dena-800">
              Kharcha (auto cut) — {rangeKharcha.length} entries
            </p>
            {rangeKharcha.length === 0 ? (
              <p className="mt-1 text-xs text-ink-500">Is range me kharcha nahi.</p>
            ) : (
              <>
                <ul className="mt-2 flex flex-col gap-1">
                  {rangeKharcha.map((k) => (
                    <li
                      key={k.id}
                      className="flex justify-between text-xs text-ink-700"
                    >
                      <span>
                        {k.entry_date}
                        {k.description ? ` · ${k.description}` : ""}
                      </span>
                      <span className="font-mono">−{formatPKR(k.amount)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-right font-mono font-bold text-dena">
                  Total: −{formatRs(kharchaTotal)}
                </p>
              </>
            )}
          </div>

          {openAdvances.length > 0 ? (
            <div className="rounded-2xl border border-line bg-page p-3 text-sm">
              <p className="font-semibold text-ink-900">
                Advance cut (jab aap chahein)
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                Sirf woh amount likhein jo ab katni hai — khud cut nahi hoti.
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {openAdvances.map((adv) => {
                  const bal = advanceBalance(adv);
                  return (
                    <div
                      key={adv.id}
                      className="rounded-xl border border-line bg-white p-3"
                    >
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="text-ink-700">
                          {adv.entry_date}
                          {adv.description ? ` · ${adv.description}` : ""}
                        </span>
                        <span className="font-mono text-amber-700">
                          baaki Rs. {formatPKR(bal)}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Input
                          label="Katna (Rs.)"
                          inputMode="decimal"
                          value={advanceCuts[adv.id] ?? ""}
                          onChange={(e) => setAdvanceCut(adv.id, e.target.value)}
                          containerClassName="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => fillAdvanceBalance(adv)}
                          className="mt-6 shrink-0 text-xs font-semibold text-brand"
                        >
                          Poora Adv Katoti
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-line bg-page px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Gross (kaam)</span>
              <span className="font-mono font-bold">{formatRs(gross)}</span>
            </div>
            {kharchaTotal > 0 ? (
              <div className="flex justify-between text-sm text-dena">
                <span>Kharcha cut</span>
                <span className="font-mono font-semibold">− {formatRs(kharchaTotal)}</span>
              </div>
            ) : null}
            {advanceTotal > 0 ? (
              <div className="flex justify-between text-sm text-amber-700">
                <span>Advance cut</span>
                <span className="font-mono font-semibold">− {formatRs(advanceTotal)}</span>
              </div>
            ) : null}
            <Input
              label="Aur katoti (Rs.)"
              inputMode="decimal"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
            />
            <div className="flex justify-between border-t border-line pt-2">
              <span className="font-semibold text-ink-900">Net Payable</span>
              <span
                className="font-mono text-lg font-bold"
                style={{ color: KARIGAR_PENDING.color }}
              >
                {formatRs(net)}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink-900">Payment Mode</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(
                [
                  ["cash", "Cash"],
                  ["bank", "Bank"],
                  ["other", "Other"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMode(m)}
                  className={classNames(
                    "h-10 rounded-xl text-xs font-semibold",
                    paymentMode === m
                      ? "bg-brand text-white"
                      : "border border-line bg-white text-ink-500"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button
            fullWidth
            loading={submitting}
            disabled={!canPay}
            onClick={handleMarkPaid}
          >
            ✅ Mark as Paid
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}
