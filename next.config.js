/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: "/dashboard",
  reloadOnOnline: false,
  fallbacks: {
    document: "/offline",
  },
  runtimeCaching: [
    // Next.js App Router RSC / prefetch requests (client-side tab nav)
    {
      urlPattern: ({ url, request }) => {
        if (request.method !== "GET") return false;
        if (typeof self === "undefined") return false;
        if (url.origin !== self.location.origin) return false;
        return (
          request.headers.get("RSC") === "1" ||
          request.headers.get("Next-Router-Prefetch") === "1" ||
          request.headers.get("Next-Router-State-Tree") != null
        );
      },
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-rsc",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Same-origin HTML pages (must use cacheName "others" for cacheOnFrontEndNav)
    {
      urlPattern: ({ url, request }) => {
        if (request.method !== "GET") return false;
        if (typeof self === "undefined") return false;
        if (url.origin !== self.location.origin) return false;
        if (request.mode === "navigate") return false;
        if (url.pathname.startsWith("/api/")) return false;
        if (
          request.headers.get("RSC") === "1" ||
          request.headers.get("Next-Router-Prefetch") === "1"
        ) {
          return false;
        }
        return true;
      },
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "others",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Supabase REST / RPC (GET only)
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "supabase-api",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 5 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "nextjs-static-assets",
        expiration: {
          maxEntries: 300,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "nextjs-images",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
