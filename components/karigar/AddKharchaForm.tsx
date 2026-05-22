"use client";

import { FormEvent, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { todayIso } from "@/lib/format";

export function AddKharchaForm({
  open,
  onClose,
  ownerId,
  employeeId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  employeeId: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [entryDate, setEntryDate] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Amount 0 se zyada hon.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("karigar_kharcha").insert({
        owner_id: ownerId,
        employee_id: employeeId,
        entry_date: entryDate,
        amount: amt,
        description: description.trim() || null,
        wage_payment_id: null,
      });
      if (error) throw error;
      toast.success("Kharcha log ho gayi.");
      setAmount("");
      setDescription("");
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
    <BottomSheet open={open} onClose={onClose} title="Kharcha (haftay me li)">
      <p className="mb-3 text-xs text-ink-500">
        Jab wages pay karein ge, yeh kharcha us period se auto cut ho jayegi.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <Input
          label="Date"
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
        />
        <Input
          label="Amount (Rs.)"
          placeholder="500, 1000…"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Note (optional)"
          placeholder="e.g. Monday ko li"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button type="submit" fullWidth loading={submitting}>
          Kharcha Save Karein
        </Button>
      </form>
    </BottomSheet>
  );
}
