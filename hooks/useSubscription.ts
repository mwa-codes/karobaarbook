"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Subscription, SubscriptionState } from "@/types/subscription";

function computeState(sub: Subscription | null): SubscriptionState {
  if (!sub) {
    return {
      isActive: false,
      status: "expired",
      daysLeft: 0,
      isTrialing: false,
      isPaid: false,
      trialEndsAt: null,
      subscriptionEndsAt: null,
    };
  }

  const now = new Date();

  if (sub.status === "suspended") {
    return {
      isActive: false,
      status: "suspended",
      daysLeft: 0,
      isTrialing: false,
      isPaid: false,
      trialEndsAt: sub.trial_ends_at,
      subscriptionEndsAt: sub.subscription_ends_at,
    };
  }

  if (sub.status === "trial") {
    const trialEnd = new Date(sub.trial_ends_at);
    const daysLeft = Math.max(
      0,
      Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    const isActive = trialEnd > now;
    return {
      isActive,
      status: isActive ? "trial" : "expired",
      daysLeft,
      isTrialing: true,
      isPaid: false,
      trialEndsAt: sub.trial_ends_at,
      subscriptionEndsAt: null,
    };
  }

  if (sub.status === "active") {
    if (!sub.subscription_ends_at) {
      return {
        isActive: true,
        status: "active",
        daysLeft: 999,
        isTrialing: false,
        isPaid: true,
        trialEndsAt: null,
        subscriptionEndsAt: null,
      };
    }
    const subEnd = new Date(sub.subscription_ends_at);
    const daysLeft = Math.max(
      0,
      Math.ceil((subEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    const isActive = subEnd > now;
    return {
      isActive,
      status: isActive ? "active" : "expired",
      daysLeft,
      isTrialing: false,
      isPaid: true,
      trialEndsAt: null,
      subscriptionEndsAt: sub.subscription_ends_at,
    };
  }

  return {
    isActive: false,
    status: "expired",
    daysLeft: 0,
    isTrialing: false,
    isPaid: false,
    trialEndsAt: sub.trial_ends_at,
    subscriptionEndsAt: sub.subscription_ends_at,
  };
}

export function useSubscription(userId: string | null | undefined) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setSubscription((data as Subscription | null) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  const state = computeState(subscription);
  return { subscription, state, loading, refresh: fetch };
}
