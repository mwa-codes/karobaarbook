import type { SubscriptionState } from "@/types/subscription";

const STORAGE_KEY = "karobaarbook_subscription_state";

export function cacheSubscriptionState(state: SubscriptionState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode
  }
}

export function readCachedSubscriptionState(): SubscriptionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SubscriptionState;
  } catch {
    return null;
  }
}
