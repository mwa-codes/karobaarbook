"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useOffline } from "@/context/OfflineContext";
import { localDB } from "@/lib/local-db";
import { deleteExplicitOpeningBalance } from "@/lib/roznamcha-opening";
import { offlineInsert, offlineUpdate } from "@/lib/offline-write";
import { classNames, formatPKR } from "@/lib/format";

export interface OpeningBalanceEditorProps {
  ownerId: string;
  date: string;
  currentOpening: number;
  /** True if the value comes from an explicit row in daily_opening_balance. */
  isExplicit: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

export function OpeningBalanceEditor({
  ownerId,
  date,
  currentOpening,
  isExplicit,
  onSaved,
  onCancel,
}: OpeningBalanceEditorProps) {
  const toast = useToast();
  const { refreshPending } = useOffline();
  const inputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState<string>(String(currentOpening || 0));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const numeric = Number(amount);
    if (!amount || !Number.isFinite(numeric)) {
      setError("Sahi number daalein.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const existing = await localDB.daily_opening_balance
        .where("owner_id")
        .equals(ownerId)
        .and((r) => r._deleted === 0 && r.entry_date === date)
        .first();

      const result = existing
        ? await offlineUpdate("daily_opening_balance", "daily_opening_balance", existing.id, {
            opening_balance: numeric,
          })
        : await offlineInsert("daily_opening_balance", "daily_opening_balance", {
            owner_id: ownerId,
            entry_date: date,
            opening_balance: numeric,
          });

      toast.success(
        result.offline
          ? "Offline — opening balance local save ho gaya."
          : "Opening balance update ho gaya."
      );
      await refreshPending();
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save nahi ho saka.";
      setError(message);
      toast.error("Save nahi ho saka.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    setSubmitting(true);
    try {
      const result = await deleteExplicitOpeningBalance(ownerId, date);
      if (!result.ok) throw new Error("Reset nahi ho saka.");

      toast.success("Opening balance delete ho gaya (ab auto-calculate).");
      await refreshPending();
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reset nahi ho saka.";
      setError(message);
      toast.error("Reset nahi ho saka.");
    } finally {
      setSubmitting(false);
    }
  }

  const numeric = Number(amount);
  const preview = Number.isFinite(numeric) ? formatPKR(numeric) : "0";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-500">
        Is din ka opening balance set karein. Yeh pichle din ke closing balance
        ko override karega.
      </p>

      <div>
        <label htmlFor="opening" className="text-sm font-medium text-ink-900">
          Opening Balance (Rs)
        </label>
        <div
          className={classNames(
            "mt-1.5 flex items-center rounded-2xl border bg-white px-4",
            error ? "border-dena" : "border-line focus-within:border-brand"
          )}
        >
          <span className="text-2xl font-semibold text-ink-500">Rs</span>
          <input
            ref={inputRef}
            id="opening"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="ml-2 flex-1 bg-transparent py-3 text-3xl font-mono font-bold text-ink-900 outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-ink-500">
          {Number.isFinite(numeric) ? `Rs. ${preview} likha jayega` : ""}
          {error ? <span className="text-dena">{error}</span> : null}
        </p>
      </div>

      <div className="flex gap-3">
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
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
        >
          Save karo
        </Button>
      </div>

      {isExplicit ? (
        <button
          type="button"
          onClick={handleReset}
          disabled={submitting}
          className="text-center text-sm font-semibold text-dena hover:underline"
        >
          Delete karein (auto-calculate wapas)
        </button>
      ) : null}
    </form>
  );
}
