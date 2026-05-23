"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AuthState {
  loading: boolean;
  user: User | null;
  session: Session | null;
}

type AuthContextValue = AuthState & { signOut: () => Promise<void> };

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  /** User from server layout — skips an extra client getSession() on mount. */
  initialUser?: User | null;
  children: ReactNode;
}

export function AuthProvider({ initialUser, children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => ({
    loading: initialUser === undefined,
    user: initialUser ?? null,
    session: null,
  }));

  useEffect(() => {
    let isMounted = true;

    if (initialUser === undefined) {
      supabase.auth.getSession().then(({ data }) => {
        if (!isMounted) return;
        setState({
          loading: false,
          session: data.session,
          user: data.session?.user ?? null,
        });
      });
    } else {
      setState((prev) => ({
        ...prev,
        loading: false,
        user: initialUser,
      }));
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        loading: false,
        session,
        user: session?.user ?? null,
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initialUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ ...state, signOut }),
    [state, signOut]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue | null {
  return useContext(AuthContext);
}
