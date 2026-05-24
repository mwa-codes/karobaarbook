// Additional runtime caching for Supabase API calls (cache for 5 minutes)
// This lets the app load faster even with slow internet

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.hostname.includes("supabase.co") &&
    event.request.method === "GET"
  ) {
    event.respondWith(
      caches.open("supabase-cache").then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request).then((res) => {
          cache.put(event.request, res.clone());
          return res;
        });
        return cached ?? networkFetch;
      })
    );
  }
});
