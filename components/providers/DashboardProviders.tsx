"use client";

import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { RouteCacheTracker } from "@/components/layout/RouteCacheTracker";
import { OfflineProvider } from "@/context/OfflineContext";
import { cacheSubscriptionState } from "@/lib/subscription-cache";
import type { SubscriptionState } from "@/types/subscription";

function OfflineBridge({ children }: { children: ReactNode }) {
  const auth = useAuthContext();
  const ownerId = auth?.user?.id ?? null;
  return <OfflineProvider ownerId={ownerId}>{children}</OfflineProvider>;
}

export function DashboardProviders({
  user,
  subscriptionState,
  children,
}: {
  user: User;
  subscriptionState: SubscriptionState;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (subscriptionState.isActive) {
      cacheSubscriptionState(subscriptionState);
    }
  }, [subscriptionState]);

  return (
    <AuthProvider initialUser={user}>
      <RouteCacheTracker />
      <OfflineBridge>{children}</OfflineBridge>
    </AuthProvider>
  );
}
