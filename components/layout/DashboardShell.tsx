"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppRouteWarmer } from "@/components/layout/AppRouteWarmer";
import { BottomNav } from "@/components/layout/BottomNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { RouteCacheTracker } from "@/components/layout/RouteCacheTracker";
import { TrialBanner } from "@/components/layout/TrialBanner";
import {
  AuthProvider,
  useAuthContext,
} from "@/components/providers/AuthProvider";
import { OfflineProvider } from "@/context/OfflineContext";
import {
  evaluateSubscription,
  offlineSubscriptionFallback,
} from "@/lib/subscription-access";
import {
  cacheSubscriptionState,
  readCachedSubscriptionState,
} from "@/lib/subscription-cache";
import { supabase } from "@/lib/supabase";
import type { SubscriptionState } from "@/types/subscription";

function LoadingScreen() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-page">
      <p className="text-sm text-ink-500">Loading…</p>
    </div>
  );
}

function SubscriptionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const userId = useAuthContext()?.user?.id;

  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>(
    () => readCachedSubscriptionState() ?? offlineSubscriptionFallback()
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function loadSubscription() {
      const uid = userId;
      if (!uid) return;

      setReady(false);

      if (!navigator.onLine) {
        if (!cancelled) {
          setSubscriptionState(
            readCachedSubscriptionState() ?? offlineSubscriptionFallback()
          );
          setReady(true);
        }
        return;
      }

      const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("status, trial_ends_at, subscription_ends_at")
        .eq("user_id", uid)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        const cached = readCachedSubscriptionState();
        setSubscriptionState(
          cached?.isActive ? cached : offlineSubscriptionFallback()
        );
        setReady(true);
        return;
      }

      if (!sub) {
        router.replace("/subscribe");
        return;
      }

      const { hasAccess, state } = evaluateSubscription(sub);
      if (!hasAccess) {
        router.replace("/subscribe");
        return;
      }

      cacheSubscriptionState(state);
      setSubscriptionState(state);
      setReady(true);
    }

    void loadSubscription();

    return () => {
      cancelled = true;
    };
  }, [userId, router]);

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <>
      <TrialBanner state={subscriptionState} />
      <OfflineBanner />
      {children}
      <BottomNav />
    </>
  );
}

function DashboardGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const auth = useAuthContext();

  useEffect(() => {
    if (auth?.loading) return;
    if (!auth?.user) {
      router.replace("/login");
    }
  }, [auth?.loading, auth?.user, router]);

  if (auth?.loading) {
    return <LoadingScreen />;
  }

  if (!auth?.user) {
    return null;
  }

  return (
    <OfflineProvider ownerId={auth.user.id}>
      <AppRouteWarmer />
      <RouteCacheTracker />
      <SubscriptionGate>{children}</SubscriptionGate>
    </OfflineProvider>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-[100dvh] pb-nav">
        <DashboardGate>{children}</DashboardGate>
      </div>
    </AuthProvider>
  );
}
