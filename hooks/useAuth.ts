"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

export interface AuthState {
  loading: boolean;
  user: User | null;
  session: Session | null;
}

export function useAuth(): AuthState & { signOut: () => Promise<void> } {
  const ctx = useAuthContext();
  const [standalone, setStandalone] = useState<AuthState>({
    loading: ctx === null,
    user: null,
    session: null,
  });

  useEffect(() => {
    if (ctx) return;
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setStandalone({
        loading: false,
        session: data.session,
        user: data.session?.user ?? null,
      });
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setStandalone({
        loading: false,
        session,
        user: session?.user ?? null,
      });
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [ctx]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  if (ctx) return { ...ctx, signOut: ctx.signOut };
  return { ...standalone, signOut };
}
