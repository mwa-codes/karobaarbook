"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { pullFromSupabase, pushToSupabase, getPendingCount } from "@/lib/sync";

type OfflineCtxType = {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  triggerSync: (ownerId: string) => Promise<void>;
  refreshPending: () => Promise<void>;
};

const OfflineCtx = createContext<OfflineCtxType>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  triggerSync: async () => {},
  refreshPending: async () => {},
});

export function OfflineProvider({
  children,
  ownerId,
}: {
  children: ReactNode;
  ownerId: string | null;
}) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    if (!ownerId) {
      setPendingCount(0);
      return;
    }
    const count = await getPendingCount(ownerId);
    setPendingCount(count);
  }, [ownerId]);

  const triggerSync = useCallback(
    async (owId: string) => {
      if (!navigator.onLine || isSyncing) return;
      setIsSyncing(true);
      try {
        await pushToSupabase(owId);
        await pullFromSupabase(owId);
        await refreshPendingCount();
      } finally {
        setIsSyncing(false);
      }
    },
    [isSyncing, refreshPendingCount]
  );

  useEffect(() => {
    if (!ownerId) return;

    const onOnline = async () => {
      setIsOnline(true);
      await triggerSync(ownerId);
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    pullFromSupabase(ownerId).then(refreshPendingCount);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [ownerId, triggerSync, refreshPendingCount]);

  useEffect(() => {
    if (!ownerId) return;
    const interval = setInterval(refreshPendingCount, 30_000);
    return () => clearInterval(interval);
  }, [ownerId, refreshPendingCount]);

  return (
    <OfflineCtx.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        triggerSync,
        refreshPending: refreshPendingCount,
      }}
    >
      {children}
    </OfflineCtx.Provider>
  );
}

export const useOffline = () => useContext(OfflineCtx);
