"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { KarigarPendingWage } from "@/types/database";

export function useKarigars(userId: string | null | undefined) {
  const [karigars, setKarigars] = useState<KarigarPendingWage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const fetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("karigar_pending_wages")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (!alive.current) return;
    if (err) setError(err.message);
    else setKarigars((data ?? []) as KarigarPendingWage[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    alive.current = true;
    fetch();
    return () => {
      alive.current = false;
    };
  }, [fetch]);

  return { karigars, loading, error, refresh: fetch };
}
