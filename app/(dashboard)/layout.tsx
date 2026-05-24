import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { DashboardProviders } from "@/components/providers/DashboardProviders";
import {
  evaluateSubscription,
  offlineSubscriptionFallback,
} from "@/lib/subscription-access";
import { createServerSupabase } from "@/lib/supabase-server";
import type { SubscriptionState } from "@/types/subscription";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabase();

  // getSession reads the auth cookie locally — works offline after first login.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) {
    redirect("/login");
  }

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, subscription_ends_at")
    .eq("user_id", user.id)
    .maybeSingle();

  let subscriptionState: SubscriptionState;
  let hasAccess: boolean;

  if (subError) {
    // Offline or transient network — allow app shell; client restores cached trial state.
    subscriptionState = offlineSubscriptionFallback();
    hasAccess = true;
  } else if (!sub) {
    hasAccess = false;
    subscriptionState = evaluateSubscription(null).state;
  } else {
    const evaluated = evaluateSubscription(sub);
    hasAccess = evaluated.hasAccess;
    subscriptionState = evaluated.state;
  }

  if (!hasAccess) {
    redirect("/subscribe");
  }

  return (
    <DashboardProviders user={user} subscriptionState={subscriptionState}>
      <div className="min-h-[100dvh] pb-nav">
        <TrialBanner state={subscriptionState} />
        <OfflineBanner />
        {children}
        <BottomNav />
      </div>
    </DashboardProviders>
  );
}
