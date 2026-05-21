import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { createServerSupabase } from "@/lib/supabase-server";

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

  return (
    <div className="min-h-[100dvh] pb-nav">
      {children}
      <BottomNav />
    </div>
  );
}
