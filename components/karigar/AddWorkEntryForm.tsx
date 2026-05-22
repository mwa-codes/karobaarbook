"use client";

import { FormEvent, useMemo, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { classNames, formatPKR, todayIso } from "@/lib/format";
import type { Employee, WorkType } from "@/types/database";

type Row = {
  id: string;
  workType: WorkType;
  quantity: string;
  rate: string;
  description: string;
};

function newRow(defaultType: WorkType, defaultRate: number): Row {
  return {
    id: crypto.randomUUID(),
    workType: defaultType,
    quantity: defaultType === "per_day" ? "1" : "",
    rate: defaultRate > 0 ? String(defaultRate) : "",
    description: "",
  };
}

export function AddWorkEntryForm({
  open,
  onClose,
  ownerId,
  employee,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  employee: Employee;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [entryDate, setEntryDate] = useState(todayIso());
  const [rows, setRows] = useState<Row[]>(() => [
    newRow(employee.rate_type, Number(employee.rate_amount)),
  ]);
  const [submitting, setSubmitting] = useState(false);

  const previewTotal = useMemo(() => {
    return rows.reduce((sum, r) => {
      const q = Number(r.quantity);
      const rate = Number(r.rate);
      if (!Number.isFinite(q) || !Number.isFinite(rate)) return sum;
      return sum + q * rate;
    }, 0);
  }, [rows]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      newRow(employee.rate_type, Number(employee.rate_amount)),
    ]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const valid = rows.every((r) => {
      const q = Number(r.quantity);
      const rate = Number(r.rate);
      return q > 0 && rate > 0;
    });
    if (!valid) {
      toast.error("Quantity aur rate dono 0 se zyada hon.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("karigar_work_entries").insert(
        rows.map((row) => ({
          owner_id: ownerId,
          employee_id: employee.id,
          entry_date: entryDate,
          work_type: row.workType,
          quantity: Number(row.quantity),
          rate: Number(row.rate),
          description: row.description.trim() || null,
          wage_payment_id: null,
        }))
      );
      if (error) throw error;
      toast.success("Work Add Ho Gaya.");
      setRows([newRow(employee.rate_type, Number(employee.rate_amount))]);
      setEntryDate(todayIso());
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save nahi ho saka.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Work Add Karein">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <Input
          label="Date"
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
        />

        {rows.map((row, index) => (
          <div
            key={row.id}
            className="rounded-2xl border border-line bg-page p-3 flex flex-col gap-3"
          >
            {rows.length > 1 ? (
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink-500">
                  Entry {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-xs font-semibold text-dena"
                >
                  Hata dein
                </button>
              </div>
            ) : null}

            <div>
              <p className="text-sm font-medium text-ink-900">Work Type</p>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {(
                  [
                    ["per_day", "Per Day"],
                    ["per_piece", "Per Piece"],
                    ["per_kg", "Per Kg"],
                  ] as const
                ).map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      updateRow(row.id, {
                        workType: t,
                        quantity: t === "per_day" ? "1" : row.quantity,
                      })
                    }
                    className={classNames(
                      "h-9 rounded-xl text-[11px] font-semibold",
                      row.workType === t
                        ? "bg-brand text-white"
                        : "border border-line bg-white text-ink-500"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {row.workType === "per_day" ? (
              <>
                <Input
                  label="Days worked"
                  inputMode="decimal"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                />
                <Input
                  label="Rate per day (Rs.)"
                  inputMode="decimal"
                  value={row.rate}
                  onChange={(e) => updateRow(row.id, { rate: e.target.value })}
                />
                <Input
                  label="Description (optional)"
                  placeholder="e.g. Dihari"
                  value={row.description}
                  onChange={(e) =>
                    updateRow(row.id, { description: e.target.value })
                  }
                />
              </>
            ) : null}

            {row.workType === "per_piece" ? (
              <>
                <Input
                  label="Pieces done"
                  inputMode="decimal"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                />
                <Input
                  label="Rate per piece (Rs.)"
                  inputMode="decimal"
                  value={row.rate}
                  onChange={(e) => updateRow(row.id, { rate: e.target.value })}
                />
                <Input
                  label="Description"
                  placeholder="Chhoti pieces, Bari pieces…"
                  value={row.description}
                  onChange={(e) =>
                    updateRow(row.id, { description: e.target.value })
                  }
                />
              </>
            ) : null}

            {row.workType === "per_kg" ? (
              <>
                <Input
                  label="Weight (kg)"
                  inputMode="decimal"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                />
                <Input
                  label="Rate per kg (Rs.)"
                  inputMode="decimal"
                  value={row.rate}
                  onChange={(e) => updateRow(row.id, { rate: e.target.value })}
                />
                <Input
                  label="Description (optional)"
                  value={row.description}
                  onChange={(e) =>
                    updateRow(row.id, { description: e.target.value })
                  }
                />
              </>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="text-sm font-semibold text-brand"
        >
          + Aur Entry Add Karein
        </button>

        <div
          className="rounded-xl px-4 py-3 text-center font-mono text-lg font-bold"
          style={{ background: "#fffbeb", color: "#d97706" }}
        >
          Rs. {formatPKR(previewTotal)}
        </div>

        <Button type="submit" fullWidth loading={submitting}>
          Save
        </Button>
      </form>
    </BottomSheet>
  );
}
