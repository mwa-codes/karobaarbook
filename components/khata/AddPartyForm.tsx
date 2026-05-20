"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { classNames } from "@/lib/format";
import type { Party, PartyType } from "@/types/database";

export interface AddPartyFormProps {
  ownerId: string;
  initial?: Party | null;
  onSaved?: (party: Party) => void;
}

export function AddPartyForm({ ownerId, initial, onSaved }: AddPartyFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<PartyType>(initial?.type ?? "customer");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
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
      if (initial) {
        const { data, error } = await supabase
          .from("parties")
          .update({
            name: name.trim(),
            type,
            phone: phone.trim() || null,
            address: address.trim() || null,
            notes: notes.trim() || null,
          })
          .eq("id", initial.id)
          .eq("owner_id", ownerId)
          .select("*")
          .single();
        if (error) throw error;
        toast.success("Update ho gaya.");
        if (onSaved) onSaved(data as Party);
        else router.push(`/khata/${(data as Party).id}`);
      } else {
        const { data, error } = await supabase
          .from("parties")
          .insert({
            owner_id: ownerId,
            name: name.trim(),
            type,
            phone: phone.trim() || null,
            address: address.trim() || null,
            notes: notes.trim() || null,
          })
          .select("*")
          .single();
        if (error) throw error;
        toast.success("Party add ho gayi.");
        if (onSaved) onSaved(data as Party);
        else router.replace(`/khata/${(data as Party).id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save nahi ho saka.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Naam"
        placeholder="e.g. Asad Trader"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
      />

      <div>
        <p className="text-sm font-medium text-ink-900">Type</p>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(["customer", "vendor", "both"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={classNames(
                "h-12 rounded-xl border text-sm font-semibold capitalize transition-colors",
                type === t
                  ? "border-brand bg-brand-50 text-brand-700"
                  : "border-line bg-white text-ink-500"
              )}
            >
              {t === "both" ? "Dono" : t === "customer" ? "Customer" : "Vendor"}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Phone (optional)"
        type="tel"
        inputMode="tel"
        placeholder="0300-1234567"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <TextArea
        label="Address (optional)"
        placeholder="Shop / address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <TextArea
        label="Notes (optional)"
        placeholder="Koi extra detail"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={submitting}
        fullWidth
      >
        {initial ? "Update karo" : "Save karo"}
      </Button>
    </form>
  );
}
