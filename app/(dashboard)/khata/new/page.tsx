"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { AddPartyForm } from "@/components/khata/AddPartyForm";
import { useAuth } from "@/hooks/useAuth";

export default function NewPartyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  return (
    <div>
      <Header
        title="Nayi Party"
        subtitle="Customer ya vendor add karein"
        showBack
        onBack={() => router.back()}
      />
      <div className="px-4 pb-10 pt-2">
        {loading || !user ? (
          <div className="mt-6 text-center text-sm text-ink-500">Loading…</div>
        ) : (
          <AddPartyForm ownerId={user.id} />
        )}
      </div>
    </div>
  );
}
