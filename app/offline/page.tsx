"use client";

import { useEffect, useState } from "react";
import { LAST_ROUTE_KEY } from "@/components/layout/RouteCacheTracker";

const TAB_ROUTES = ["/dashboard", "/khata", "/karigar", "/roznamcha"] as const;

function navigationRequest(path: string): Request {
  return new Request(path, {
    credentials: "same-origin",
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  });
}

async function findCachedRoute(): Promise<string | null> {
  if (!("caches" in window)) return null;
  const cache = await caches.open("others");
  const preferred =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(LAST_ROUTE_KEY)
      : null;

  const candidates = preferred
    ? [preferred, ...TAB_ROUTES.filter((r) => r !== preferred)]
    : [...TAB_ROUTES];

  for (const path of candidates) {
    const hit = await cache.match(navigationRequest(path), {
      ignoreSearch: true,
    });
    if (hit) return path;
  }
  return null;
}

export default function OfflinePage() {
  const [redirecting, setRedirecting] = useState(true);
  const [message, setMessage] = useState(
    "Cached pages se app khol rahe hain."
  );

  useEffect(() => {
    let cancelled = false;

    async function tryCachedApp() {
      const target = await findCachedRoute();
      if (cancelled) return;

      if (target) {
        window.location.replace(target);
        return;
      }

      setRedirecting(false);
      setMessage(
        "Pehle app online kholen, neeche wale tabs visit karen, phir offline bhi kaam karega."
      );
    }

    const timer = window.setTimeout(() => {
      if (!cancelled) setRedirecting(false);
    }, 3000);

    void tryCachedApp();

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
        {message}
      </p>

      {!redirecting ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TAB_ROUTES.map((href) => (
            <a
              key={href}
              href={href}
              style={{
                background: "#1a56db",
                color: "white",
                borderRadius: 10,
                padding: "12px 24px",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {href === "/dashboard" ? "Dashboard" : href.slice(1)}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
