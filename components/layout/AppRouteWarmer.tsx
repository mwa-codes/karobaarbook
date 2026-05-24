"use client";

import { useEffect } from "react";

/** Fetches main tab URLs while online so the service worker can cache HTML shells. */
const APP_TAB_ROUTES = ["/dashboard", "/khata", "/karigar", "/roznamcha"] as const;

function navigationRequest(path: string): Request {
  return new Request(path, {
    credentials: "same-origin",
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  });
}

async function warmTabRoutes() {
  const cache = await caches.open("others");
  await Promise.all(
    APP_TAB_ROUTES.map(async (route) => {
      const request = navigationRequest(route);
      try {
        const existing = await cache.match(request, { ignoreSearch: true });
        if (existing) return;
        const response = await fetch(request);
        if (response.ok && response.type !== "opaqueredirect") {
          await cache.put(request, response);
        }
      } catch {
        // offline or auth redirect — skip
      }
    })
  );
}

export function AppRouteWarmer() {
  useEffect(() => {
    if (!navigator.onLine || !("caches" in window)) return;

    const warm = () => {
      void warmTabRoutes();
    };

    warm();
    window.addEventListener("online", warm);
    return () => window.removeEventListener("online", warm);
  }, []);

  return null;
}
