"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
  PaymentMode,
  RoznamchaEntry,
  RoznamchaType,
} from "@/types/database";

export interface AddEntryFormProps {
  ownerId: string;
  /** The date displayed in the parent — used as the default for `entry_date`. */
  defaultDate: string;
  initialType: RoznamchaType;
  editing?: RoznamchaEntry | null;
  onSaved: (entry: RoznamchaEntry) => void;
  onCancel: () => void;
}

const INCOME_CATEGORIES = [
  "Maal sale kia",
  "Party Payment",
  "Advance wapas",
  "Other",
] as const;

const EXPENSE_CATEGORIES = [
  "Mazdoori",
  "Advance diya",
  "Kharcha Maal",
  "Tools & Equipment",
  "Packaging",
  "Bijli/Gas",
  "Other",
] as const;

const PAYMENT_MODES: { id: PaymentMode; label: string; icon: string }[] = [
  { id: "cash", label: "Cash", icon: "💵" },
  { id: "bank", label: "Bank", icon: "🏦" },
  { id: "cheque", label: "Cheque", icon: "📄" },
  { id: "other", label: "Other", icon: "📝" },
];

export function AddEntryForm({
  ownerId,
  defaultDate,
  initialType,
  editing,
  onSaved,
  onCancel,
}: AddEntryFormProps) {
  const toast = useToast();
  const { refreshPending } = useOffline();
  const amountRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<RoznamchaType>(editing?.type ?? initialType);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [category, setCategory] = useState<string>(editing?.category ?? "");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    editing?.payment_mode ?? "cash"
  );
  const [date, setDate] = useState<string>(
    editing?.entry_date ?? defaultDate ?? todayIso()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // When the type changes, reset category to a sensible default.
  useEffect(() => {
    if (editing) return;
    setCategory("");
  }, [type, editing]);

  const categoryOptions =
    type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const numeric = parseFloat(amount.replace(/,/g, "").trim());
    if (!amount.trim() || !Number.isFinite(numeric) || numeric <= 0) {
      setError("Amount sahi daalein (0 se zyada).");
      return;
    }
    if (!description.trim()) {
      setError("Description likhna zaroori hai.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        type,
        amount: numeric,
        description: description.trim(),
        category: category.trim() || null,
        payment_mode: paymentMode,
        entry_date: date,
      };

      if (editing) {
        const result = await offlineUpdate(
          "roznamcha",
          "roznamcha",
          editing.id,
          payload
        );
        const saved = await readLocalRow<RoznamchaEntry>("roznamcha", result.id);
        if (!saved) throw new Error("Save nahi ho saka.");
        toast.success(
          result.offline ? "Offline — update local save ho gaya." : "Update ho gaya."
        );
        onSaved(saved);
      } else {
        const result = await offlineInsert("roznamcha", "roznamcha", {
          owner_id: ownerId,
          ...payload,
        });
        const saved = await readLocalRow<RoznamchaEntry>("roznamcha", result.id);
        if (!saved) throw new Error("Save nahi ho saka.");
        toast.success(
          result.offline
            ? "Offline — entry local save ho gayi, internet pe sync ho jaegi."
            : type === "income"
              ? "Amdani add ho gayi."
              : "Kharcha add ho gaya."
        );
        onSaved(saved);
      }
      await refreshPending();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save nahi ho saka.";
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

  const placeholder =
    type === "income"
      ? "e.g. Maal becha, Party ki payment mili"
      : "e.g. Karigar wages, Tools khareedey, Bags";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2">
        <TypeToggle
          active={type === "income"}
          tone="lena"
          label="Amdani (Income)"
          onClick={() => setType("income")}
        />
        <TypeToggle
          active={type === "expense"}
          tone="dena"
          label="Kharcha (Expense)"
          onClick={() => setType("expense")}
        />
      </div>

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
          {preview !== "0" ? `Rs. ${preview} likha jayega` : ""}
          {error ? <span className="text-dena">{error}</span> : null}
        </p>
      </div>

      <TextArea
        label="Description"
        placeholder={placeholder}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />

      {/* Category */}
      <div>
        <p className="text-sm font-medium text-ink-900">Category (optional)</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {categoryOptions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(category === c ? "" : c)}
              className={classNames(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                category === c
                  ? "border-brand bg-brand-50 text-brand-700"
                  : "border-line bg-white text-ink-500"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Payment mode */}
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

      <Input
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        max={todayIso()}
        required
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
          variant={type === "income" ? "lena" : "dena"}
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

function TypeToggle({
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
