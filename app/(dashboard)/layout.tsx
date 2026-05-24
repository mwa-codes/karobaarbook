import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { DashboardProviders } from "@/components/providers/DashboardProviders";
import { createServerSupabase } from "@/lib/supabase-server";
import type { SubscriptionState, SubscriptionStatus } from "@/types/subscription";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, subscription_ends_at")
    .eq("user_id", user.id)
    .maybeSingle();

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

  if (!hasAccess) {
    redirect("/subscribe");
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

  const subscriptionState: SubscriptionState = {
    isActive: hasAccess,
    status: (sub?.status ?? "expired") as SubscriptionStatus,
    daysLeft,
    isTrialing,
    isPaid: sub?.status === "active",
    trialEndsAt: sub?.trial_ends_at ?? null,
    subscriptionEndsAt: sub?.subscription_ends_at ?? null,
  };

  return (
    <DashboardProviders user={user}>
      <div className="min-h-[100dvh] pb-nav">
        <TrialBanner state={subscriptionState} />
        <OfflineBanner />
        {children}
        <BottomNav />
      </div>
    </DashboardProviders>
  );
}
