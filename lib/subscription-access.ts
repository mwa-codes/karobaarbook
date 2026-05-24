import type { SubscriptionState, SubscriptionStatus } from "@/types/subscription";

type SubRow = {
  status: string;
  trial_ends_at: string;
  subscription_ends_at: string | null;
};

export function evaluateSubscription(sub: SubRow | null): {
  hasAccess: boolean;
  state: SubscriptionState;
} {
  const now = new Date();
  let hasAccess = false;

  if (sub) {
    if (sub.status === "trial") {
      hasAccess = new Date(sub.trial_ends_at) > now;
    } else if (sub.status === "active") {
      hasAccess =
        !sub.subscription_ends_at ||
        new Date(sub.subscription_ends_at) > now;
    }
  }

  let daysLeft = 0;
  let isTrialing = false;
  if (sub?.status === "trial") {
    isTrialing = true;
    daysLeft = Math.max(
      0,
      Math.ceil(
        (new Date(sub.trial_ends_at).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  }

  const state: SubscriptionState = {
    isActive: hasAccess,
    status: (sub?.status ?? "expired") as SubscriptionStatus,
    daysLeft,
    isTrialing,
    isPaid: sub?.status === "active",
    trialEndsAt: sub?.trial_ends_at ?? null,
    subscriptionEndsAt: sub?.subscription_ends_at ?? null,
  };

  return { hasAccess, state };
}

/** Used when subscription row cannot be loaded (e.g. offline). */
export function offlineSubscriptionFallback(): SubscriptionState {
  return {
    isActive: true,
    status: "active",
    daysLeft: 0,
    isTrialing: false,
    isPaid: true,
    trialEndsAt: null,
    subscriptionEndsAt: null,
  };
}
