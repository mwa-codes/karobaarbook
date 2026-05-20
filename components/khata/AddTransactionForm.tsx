"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { classNames, formatPKR, todayIso } from "@/lib/format";
import type { Transaction, TransactionType } from "@/types/database";

export interface AddTransactionFormProps {
  ownerId: string;
  partyId: string;
  initialType: TransactionType;
  /** When provided, the form edits this transaction instead of inserting. */
  editing?: Transaction | null;
  onSaved: (transaction: Transaction) => void;
  onCancel: () => void;
}

export function AddTransactionForm({
  ownerId,
  partyId,
  initialType,
  editing,
  onSaved,
  onCancel,
}: AddTransactionFormProps) {
  const toast = useToast();
  const amountRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState(
    editing ? String(editing.amount) : ""
  );
  const [description, setDescription] = useState(editing?.description ?? "");
  const [date, setDate] = useState(editing?.transaction_date ?? todayIso());
  const [type, setType] = useState<TransactionType>(
    editing?.type ?? initialType
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const numeric = Number(amount);
    if (!amount || !Number.isFinite(numeric) || numeric <= 0) {
      setError("Amount sahi daalein (0 se zyada).");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (editing) {
        const { data, error: err } = await supabase
          .from("transactions")
          .update({
            amount: numeric,
            type,
            description: description.trim() || null,
            transaction_date: date,
          })
          .eq("id", editing.id)
          .eq("owner_id", ownerId)
          .select("*")
          .single();
        if (err) throw err;
        toast.success("Update ho gaya.");
        onSaved(data as Transaction);
      } else {
        const { data, error: err } = await supabase
          .from("transactions")
          .insert({
            owner_id: ownerId,
            party_id: partyId,
            amount: numeric,
            type,
            description: description.trim() || null,
            transaction_date: date,
          })
          .select("*")
          .single();
        if (err) throw err;
        toast.success(type === "lena" ? "Lena add ho gaya." : "Dena add ho gaya.");
        onSaved(data as Transaction);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Save nahi ho saka.";
      setError(message);
      toast.error("Save nahi ho saka. Internet check karein.");
    } finally {
      setSubmitting(false);
    }
  }

  const numericAmount = Number(amount);
  const preview = Number.isFinite(numericAmount) && numericAmount > 0
    ? formatPKR(numericAmount)
    : "0";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <TypeToggle
          active={type === "lena"}
          onClick={() => setType("lena")}
          tone="lena"
          label="Lena (+)"
        />
        <TypeToggle
          active={type === "dena"}
          onClick={() => setType("dena")}
          tone="dena"
          label="Dena (−)"
        />
      </div>

      <div>
        <label
          htmlFor="amount"
          className="text-sm font-medium text-ink-900"
        >
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
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
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

      <Input
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <TextArea
        label="Description (optional)"
        placeholder="e.g. 50kg malzaad delivery"
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
          variant={type === "lena" ? "lena" : "dena"}
          size="lg"
          fullWidth
          loading={submitting}
        >
          {editing ? "Update karo" : type === "lena" ? "Lena save karo" : "Dena save karo"}
        </Button>
      </div>
    </form>
  );
}

function TypeToggle({
  active,
  onClick,
  tone,
  label,
}: {
  active: boolean;
  onClick: () => void;
  tone: "lena" | "dena";
  label: string;
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
