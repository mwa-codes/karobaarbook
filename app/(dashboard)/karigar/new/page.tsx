"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { AddKarigarForm } from "@/components/karigar/AddKarigarForm";
import { useAuth } from "@/hooks/useAuth";

export default function NewKarigarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  return (
    <div>
      <Header
        title="Naya Karigar"
        subtitle="Factory worker add karein"
        showBack
        onBack={() => router.back()}
      />
      <div className="px-4 pb-10 pt-2">
        {loading || !user ? (
          <div className="mt-6 text-center text-sm text-ink-500">Loading…</div>
        ) : (
          <AddKarigarForm ownerId={user.id} />
        )}
      </div>
    </div>
  );
}
