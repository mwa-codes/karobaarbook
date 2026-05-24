"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useOffline } from "@/context/OfflineContext";
import {
  offlineInsert,
  offlineUpdate,
  readLocalRow,
} from "@/lib/offline-write";
import { classNames, formatPKR, todayIso } from "@/lib/format";
import type {
  PartyType,
  PaymentMode,
  Transaction,
  TransactionCategory,
  TransactionType,
} from "@/types/database";

export interface AddTransactionFormProps {
  ownerId: string;
  partyId: string;
  partyType: PartyType;
  /** The transaction-direction the user originally tapped. Used to choose a
   *  sensible default category on first open. */
  initialType: TransactionType;
  /** Optional override category — e.g. opening "New Bill" should preselect "sale". */
  initialCategory?: TransactionCategory;
  /** When provided, the form edits this transaction instead of inserting. */
  editing?: Transaction | null;
  onSaved: (transaction: Transaction) => void;
  onCancel: () => void;
}

/** Categories that represent money owed (lena from customer / payment made to vendor). */
const CATEGORY_TYPE_MAP: Partial<Record<TransactionCategory, TransactionType>> = {
  sale: "lena",
  payment_received: "dena",
  purchase: "dena",
  payment_made: "lena",
  other: "lena",
};

/** Whether to show the payment-mode picker — only for actual cash movements. */
const SHOW_PAYMENT_MODE: Record<TransactionCategory, boolean> = {
  sale: false,
  purchase: false,
  payment_received: true,
  payment_made: true,
  opening_balance: false,
  other: true,
};

const CATEGORY_LABEL: Record<TransactionCategory, string> = {
  sale: "Sale / Bill",
  purchase: "Purchase",
  payment_received: "Payment Received",
  payment_made: "Payment Made",
  opening_balance: "Opening Balance",
  other: "Other",
};

const PAYMENT_MODES: { id: PaymentMode; label: string; icon: string }[] = [
  { id: "cash", label: "Cash", icon: "💵" },
  { id: "bank", label: "Bank", icon: "🏦" },
  { id: "cheque", label: "Cheque", icon: "📄" },
  { id: "other", label: "Other", icon: "📝" },
];

function categoriesFor(
  partyType: PartyType
): { id: TransactionCategory; label: string }[] {
  if (partyType === "customer") {
    return [
      { id: "sale", label: "Sale / Bill" },
      { id: "payment_received", label: "Payment Received" },
      { id: "other", label: "Other" },
    ];
  }
  if (partyType === "vendor") {
    return [
      { id: "purchase", label: "Purchase" },
      { id: "payment_made", label: "Payment Made" },
      { id: "other", label: "Other" },
    ];
  }
  return [
    { id: "sale", label: "Sale" },
    { id: "purchase", label: "Purchase" },
    { id: "payment_received", label: "Payment In" },
    { id: "payment_made", label: "Payment Out" },
    { id: "other", label: "Other" },
  ];
}

function defaultCategory(
  partyType: PartyType,
  direction: TransactionType
): TransactionCategory {
  if (partyType === "customer") {
    return direction === "lena" ? "sale" : "payment_received";
  }
  if (partyType === "vendor") {
    return direction === "dena" ? "purchase" : "payment_made";
  }
  return direction === "lena" ? "sale" : "payment_made";
}

export function AddTransactionForm({
  ownerId,
  partyId,
  partyType,
  initialType,
  initialCategory,
  editing,
  onSaved,
  onCancel,
}: AddTransactionFormProps) {
  const toast = useToast();
  const { refreshPending } = useOffline();
  const amountRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => categoriesFor(partyType), [partyType]);

  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [date, setDate] = useState(editing?.transaction_date ?? todayIso());
  const [category, setCategory] = useState<TransactionCategory>(
    editing?.transaction_category ??
      initialCategory ??
      defaultCategory(partyType, initialType)
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    editing?.payment_mode ?? "cash"
  );
  // For "other" the user manually picks lena/dena.
  const [manualType, setManualType] = useState<TransactionType>(
    editing?.type ?? initialType
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const effectiveType: TransactionType = useMemo(() => {
    if (category === "other") return manualType;
    if (category === "opening_balance") {
      return partyType === "vendor" ? "dena" : "lena";
    }
    return CATEGORY_TYPE_MAP[category] ?? "lena";
  }, [category, manualType, partyType]);

  const showPaymentMode = SHOW_PAYMENT_MODE[category];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const numeric = parseFloat(amount.replace(/,/g, "").trim());
    if (!amount.trim() || !Number.isFinite(numeric) || numeric <= 0) {
      setError("Amount sahi daalein (0 se zyada).");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        amount: numeric,
        type: effectiveType,
        transaction_category: category,
        payment_mode: paymentMode,
        description: description.trim() || null,
        transaction_date: date,
      };

      if (editing) {
        const result = await offlineUpdate(
          "transactions",
          "transactions",
          editing.id,
          payload
        );
        const saved = await readLocalRow<Transaction>("transactions", result.id);
        if (!saved) throw new Error("Save nahi ho saka.");
        toast.success(
          result.offline
            ? "Offline — update local save ho gaya, internet pe sync ho jaega."
            : "Update ho gaya."
        );
        onSaved(saved);
      } else {
        const result = await offlineInsert("transactions", "transactions", {
          owner_id: ownerId,
          party_id: partyId,
          ...payload,
        });
        const saved = await readLocalRow<Transaction>("transactions", result.id);
        if (!saved) throw new Error("Save nahi ho saka.");
        toast.success(
          result.offline
            ? "Offline — entry local save ho gayi, internet pe sync ho jaegi."
            : `${CATEGORY_LABEL[category]} save ho gaya.`
        );
        onSaved(saved);
      }
      await refreshPending();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Save nahi ho saka.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const numericAmount = parseFloat(amount.replace(/,/g, "").trim());
  const preview =
    Number.isFinite(numericAmount) && numericAmount > 0
      ? formatPKR(numericAmount)
      : "0";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Category toggle */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Type
        </p>
        <div
          className={classNames(
            "mt-1.5 grid gap-2",
            categories.length === 5
              ? "grid-cols-3"
              : categories.length === 3
                ? "grid-cols-3"
                : "grid-cols-2"
          )}
        >
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              active={category === c.id}
              tone={
                c.id === "other"
                  ? "neutral"
                  : (CATEGORY_TYPE_MAP[c.id] ?? "lena") === "lena"
                    ? "lena"
                    : "dena"
              }
              onClick={() => setCategory(c.id)}
              label={c.label}
            />
          ))}
        </div>
      </div>

      {/* For "other" let the user pick direction manually */}
      {category === "other" ? (
        <div className="grid grid-cols-2 gap-2">
          <DirectionToggle
            active={manualType === "lena"}
            tone="lena"
            label="Lena (+)"
            onClick={() => setManualType("lena")}
          />
          <DirectionToggle
            active={manualType === "dena"}
            tone="dena"
            label="Dena (−)"
            onClick={() => setManualType("dena")}
          />
        </div>
      ) : null}

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="text-sm font-medium text-ink-900">
          Amount (Rs)
        </label>
        <div
          className={classNames(
            "mt-1.5 flex items-center rounded-2xl border bg-white px-4",
            error ? "border-dena" : "border-line focus-within:border-brand"
          )}
        >
          <span className="text-2xl font-semibold text-ink-500">Rs</span>
          <input
            ref={amountRef}
            id="amount"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="ml-2 flex-1 bg-transparent py-3 text-3xl font-mono font-bold text-ink-900 outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-ink-500">
          {preview !== "0" ? `Rs ${preview} likha jayega` : ""}
          {error ? <span className="text-dena">{error}</span> : null}
        </p>
      </div>

      {/* Payment Mode (only for payments) */}
      {showPaymentMode ? (
        <div>
          <p className="text-sm font-medium text-ink-900">Payment Mode</p>
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            {PAYMENT_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMode(m.id)}
                className={classNames(
                  "flex h-14 flex-col items-center justify-center rounded-xl border text-xs font-semibold transition-colors",
                  paymentMode === m.id
                    ? "border-brand bg-brand-50 text-brand-700"
                    : "border-line bg-white text-ink-500"
                )}
              >
                <span className="text-base leading-none">{m.icon}</span>
                <span className="mt-1">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Input
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        max={(() => {
          const d = new Date();
          d.setDate(d.getDate() + 90);
          return d.toISOString().split("T")[0];
        })()}
        required
      />

      <TextArea
        label="Description (optional)"
        placeholder="e.g. March ka bill, advance payment..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="mt-1 flex gap-3">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          fullWidth
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant={effectiveType === "lena" ? "lena" : "dena"}
          size="lg"
          fullWidth
          loading={submitting}
        >
          {editing ? "Update karo" : "Save karo"}
        </Button>
      </div>
    </form>
  );
}

function CategoryChip({
  active,
  tone,
  label,
  onClick,
}: {
  active: boolean;
  tone: "lena" | "dena" | "neutral";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "h-12 rounded-xl border px-2 text-sm font-semibold transition-colors",
        active
          ? tone === "lena"
            ? "border-lena bg-lena-50 text-lena-700"
            : tone === "dena"
              ? "border-dena bg-dena-50 text-dena-700"
              : "border-brand bg-brand-50 text-brand-700"
          : "border-line bg-white text-ink-500"
      )}
    >
      {label}
    </button>
  );
}

function DirectionToggle({
  active,
  tone,
  label,
  onClick,
}: {
  active: boolean;
  tone: "lena" | "dena";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "h-12 rounded-xl border text-sm font-semibold transition-colors",
        active
          ? tone === "lena"
            ? "border-lena bg-lena-50 text-lena-700"
            : "border-dena bg-dena-50 text-dena-700"
          : "border-line bg-white text-ink-500"
      )}
    >
      {label}
    </button>
  );
}
