"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useOffline } from "@/context/OfflineContext";
import {
  offlineUpdate,
  readLocalRow,
} from "@/lib/offline-write";
import { classNames } from "@/lib/format";
import type { Employee, WorkType } from "@/types/database";

export function EditKarigarForm({
  employee,
  ownerId,
  onSaved,
  onClose,
}: {
  employee: Employee;
  ownerId: string;
  onSaved: (e: Employee) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const { refreshPending } = useOffline();
  const [name, setName] = useState(employee.name);
  const [role, setRole] = useState(employee.role ?? "");
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [rateType, setRateType] = useState<WorkType>(employee.rate_type);
  const [rateAmount, setRateAmount] = useState(String(employee.rate_amount ?? ""));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Naam zaroori hai.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await offlineUpdate("employees", "employees", employee.id, {
        name: name.trim(),
        role: role.trim() || null,
        phone: phone.trim() || null,
        rate_type: rateType,
        rate_amount: Number(rateAmount) || 0,
      });
      const saved = await readLocalRow<Employee>("employees", result.id);
      if (!saved) throw new Error("Update nahi ho saka.");
      toast.success(
        result.offline ? "Offline — update local save ho gaya." : "Update ho gaya."
      );
      await refreshPending();
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update nahi ho saka.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Naam" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Role / Kaam" value={role} onChange={(e) => setRole(e.target.value)} />
      <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div>
        <p className="text-sm font-medium text-ink-900">Default Rate Type</p>
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
              onClick={() => setRateType(t)}
              className={classNames(
                "h-10 rounded-xl text-xs font-semibold",
                rateType === t
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
        label="Default Rate (Rs.)"
        inputMode="decimal"
        value={rateAmount}
        onChange={(e) => setRateAmount(e.target.value)}
      />
      <Button type="submit" fullWidth loading={submitting}>
        Save
      </Button>
    </form>
  );
}
