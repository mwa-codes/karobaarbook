"use client";

import Link from "next/link";
import { formatPKR } from "@/lib/format";
import type { KarigarPendingWage } from "@/types/database";

export function KarigarCard({ karigar }: { karigar: KarigarPendingWage }) {
  const pending = Number(karigar.total_pending ?? 0);

  return (
    <Link href={`/karigar/${karigar.employee_id}`} className="block">
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "14px 16px",
          marginBottom: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          borderLeft: `4px solid ${pending > 0 ? "#f59e0b" : "#e2e8f0"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ fontWeight: "600", fontSize: "15px", margin: 0 }}>
            {karigar.name}
          </p>
          <p style={{ color: "#64748b", fontSize: "12px", margin: "2px 0 0" }}>
            {karigar.role || "Karigar"} •{" "}
            {karigar.entry_count > 0
              ? `${karigar.entry_count} kaam pending`
              : "Koi kaam pending nahi"}
            {Number(karigar.total_kharcha ?? 0) > 0
              ? ` · Kharcha Rs. ${formatPKR(karigar.total_kharcha)}`
              : ""}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontWeight: "700",
              fontSize: "16px",
              color: pending > 0 ? "#d97706" : "#94a3b8",
              margin: 0,
              fontFamily: "monospace",
            }}
          >
            Rs. {formatPKR(pending)}
          </p>
          {pending > 0 ? (
            <span style={{ fontSize: "11px", color: "#d97706" }}>baaki hai</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
