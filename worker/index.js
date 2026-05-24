/**
 * Extra service-worker logic (imported by next-pwa).
 * Handles document navigations offline-first; RSC/HTML assets use Workbox rules in next.config.js.
 */

const TAB_ROUTES = ["/dashboard", "/khata", "/karigar", "/roznamcha"];

function navigationRequest(pathname) {
  return new Request(pathname, {
    credentials: "same-origin",
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("others").then(async (cache) => {
      await Promise.all(
        TAB_ROUTES.map(async (path) => {
          try {
            const request = navigationRequest(path);
            const response = await fetch(request);
            if (response.ok && response.type !== "opaqueredirect") {
              await cache.put(request, response);
            }
          } catch {
            // install may run offline — skip
          }
        })
      );
    })
  );
});

async function handleNavigation(request) {
  const cache = await caches.open("others");
  const cached = await cache.match(request, { ignoreSearch: true });

  try {
    const response = await fetch(request);
    if (response.ok && response.type !== "opaqueredirect") {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (cached) return cached;

    for (const path of TAB_ROUTES) {
      const hit = await cache.match(navigationRequest(path), {
        ignoreSearch: true,
      });
      if (hit) return hit;
    }

    const offline = await caches.match("/offline", { ignoreSearch: true });
    if (offline) return offline;

    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.mode !== "navigate") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(handleNavigation(request));
});
