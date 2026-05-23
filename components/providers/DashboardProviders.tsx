"use client";

import type { User } from "@supabase/supabase-js";
import { AuthProvider } from "@/components/providers/AuthProvider";

export function DashboardProviders({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return <AuthProvider initialUser={user}>{children}</AuthProvider>;
}
