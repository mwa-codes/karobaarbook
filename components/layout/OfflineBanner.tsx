"use client";

import { useOffline } from "@/context/OfflineContext";

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <div
        role="status"
        style={{
          background: "#1e293b",
          color: "white",
          textAlign: "center",
          padding: "8px 16px",
          fontSize: "13px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        <span>📵</span>
        <span>
          Internet nahi hai — data local save ho raha hai
          {pendingCount > 0 ? ` (${pendingCount} pending)` : ""}
        </span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div
        role="status"
        style={{
          background: "#1d4ed8",
          color: "white",
          textAlign: "center",
          padding: "8px 16px",
          fontSize: "13px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            animation: "spin 1s linear infinite",
            display: "inline-block",
          }}
        >
          🔄
        </span>
        <span>Sync ho raha hai…</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div
        role="status"
        style={{
          background: "#d97706",
          color: "white",
          textAlign: "center",
          padding: "8px 16px",
          fontSize: "13px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        <span>⏳</span>
        <span>{pendingCount} entries sync hona baaki hain</span>
      </div>
    );
  }

  return null;
}
