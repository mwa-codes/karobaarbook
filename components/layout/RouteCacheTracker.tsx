"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const LAST_ROUTE_KEY = "karobaarbook_last_route";

const TRACKED_PREFIXES = ["/dashboard", "/khata", "/karigar", "/roznamcha"];

export function RouteCacheTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (!TRACKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return;
    }
    try {
      localStorage.setItem(LAST_ROUTE_KEY, pathname);
    } catch {
      // ignore
    }
  }, [pathname]);

  return null;
}
