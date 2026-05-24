"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useOffline } from "@/context/OfflineContext";
import { offlineInsert } from "@/lib/offline-write";
import { classNames, todayIso } from "@/lib/format";
import type { WorkType } from "@/types/database";

export function AddKarigarForm({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { refreshPending } = useOffline();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [rateType, setRateType] = useState<WorkType>("per_day");
  const [rateAmount, setRateAmount] = useState("");
  const [joiningDate, setJoiningDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Naam zaroori hai.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      const defaultRate = rateAmount.trim() ? Number(rateAmount) : 0;
      const result = await offlineInsert("employees", "employees", {
        owner_id: ownerId,
        name: name.trim(),
        role: role.trim() || null,
        phone: phone.trim() || null,
        rate_type: rateType,
        rate_amount: Number.isFinite(defaultRate) ? defaultRate : 0,
        joining_date: joiningDate,
        is_active: true,
      });
      toast.success(
        result.offline
          ? "Offline — karigar local save ho gaya."
          : "Karigar add ho gaya."
      );
      await refreshPending();
      router.replace("/karigar");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save nahi ho saka.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Naam"
        placeholder="e.g. Ali Karigar"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
      />
      <Input
        label="Role / Kaam"
        placeholder="Polisher, Packer, Helper…"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <Input
        label="Phone"
        placeholder="03xx…"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
      />

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
        placeholder="Pre-fill for Work Add"
        value={rateAmount}
        onChange={(e) => setRateAmount(e.target.value)}
        inputMode="decimal"
      />

      <Input
        label="Joining Date"
        type="date"
        value={joiningDate}
        onChange={(e) => setJoiningDate(e.target.value)}
      />

      <Button type="submit" fullWidth loading={submitting}>
        Karigar Add Karein
      </Button>
    </form>
  );
}
