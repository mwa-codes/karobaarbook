"use client";

import { useEffect } from "react";

/** Fetches main tab URLs while online so the service worker can cache HTML shells. */
const APP_TAB_ROUTES = ["/dashboard", "/khata", "/karigar", "/roznamcha"] as const;

export function AppRouteWarmer() {
  useEffect(() => {
    if (!navigator.onLine) return;

    const warm = () => {
      for (const route of APP_TAB_ROUTES) {
        void fetch(route, { credentials: "include", cache: "reload" }).catch(
          () => undefined
        );
      }
    };

    warm();
    window.addEventListener("online", warm);
    return () => window.removeEventListener("online", warm);
  }, []);

  return null;
}
