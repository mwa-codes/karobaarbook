"use client";

import { useEffect, useState } from "react";
import { LAST_ROUTE_KEY } from "@/components/layout/RouteCacheTracker";

export default function OfflinePage() {
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const target =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(LAST_ROUTE_KEY) ?? "/khata"
        : "/khata";

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setRedirecting(false);
    }, 2500);

    window.location.replace(target);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        textAlign: "center",
        background: "#f8fafc",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>📵</div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#0f172a",
          margin: "0 0 8px",
        }}
      >
        {redirecting ? "App load ho rahi hai…" : "Internet Nahi Hai"}
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "#64748b",
          margin: "0 0 32px",
          lineHeight: 1.5,
          maxWidth: 300,
        }}
      >
        {redirecting
          ? "Cached pages se app khol rahe hain."
          : "Pehle app online kholen, Khata / Karigar / Roznamcha visit karen — phir offline bhi kaam karega."}
      </p>

      {!redirecting ? (
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "#1a56db",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Dobara Try Karen
        </button>
      ) : null}
    </div>
  );
}
