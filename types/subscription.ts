export type SubscriptionStatus = "trial" | "active" | "expired" | "suspended";
export type SubscriptionPlan = "monthly" | "annual" | null;

export interface Subscription {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  status: SubscriptionStatus;
  trial_ends_at: string;
  subscription_ends_at: string | null;
  plan: SubscriptionPlan;
  amount_pkr: number | null;
  notes: string | null;
  created_at: string;
}

export interface SubscriptionState {
  isActive: boolean;
  status: SubscriptionStatus;
  daysLeft: number;
  isTrialing: boolean;
  isPaid: boolean;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
}
