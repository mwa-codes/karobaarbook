/**
 * Extra service-worker logic (imported by next-pwa).
 * Caches main tab HTML on install/update and RSC flight requests for offline nav.
 */

const TAB_ROUTES = ["/dashboard", "/khata", "/karigar", "/roznamcha"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("others").then(async (cache) => {
      await Promise.all(
        TAB_ROUTES.map(async (path) => {
          try {
            const response = await fetch(path, { credentials: "include" });
            if (response.ok) {
              await cache.put(path, response);
            }
          } catch {
            // install may run offline — skip
          }
        })
      );
    })
  );
});

function isRscRequest(request) {
  return (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1" ||
    request.headers.get("Next-Router-State-Tree") != null
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!isRscRequest(request)) return;

  event.respondWith(
    caches.open("next-rsc").then(async (cache) => {
      const cached = await cache.match(request);
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        if (cached) return cached;
        throw new Error("offline");
      }
    })
  );
});
