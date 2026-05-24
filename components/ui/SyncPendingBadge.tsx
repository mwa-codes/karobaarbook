"use client";

export function SyncPendingBadge({ pending }: { pending?: boolean }) {
  if (!pending) return null;
  return (
    <span
      title="Sync pending"
      aria-label="Sync pending"
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "#f59e0b",
        marginLeft: 4,
        flexShrink: 0,
      }}
    />
  );
}

export function isSyncPending(
  row: { _synced?: 0 | 1 } | null | undefined
): boolean {
  return row?._synced === 0;
}
