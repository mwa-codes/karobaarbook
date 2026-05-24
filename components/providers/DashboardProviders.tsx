"use client";

import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { OfflineProvider } from "@/context/OfflineContext";

function OfflineBridge({ children }: { children: ReactNode }) {
  const auth = useAuthContext();
  const ownerId = auth?.user?.id ?? null;
  return <OfflineProvider ownerId={ownerId}>{children}</OfflineProvider>;
}

export function DashboardProviders({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <AuthProvider initialUser={user}>
      <OfflineBridge>{children}</OfflineBridge>
    </AuthProvider>
  );
}
