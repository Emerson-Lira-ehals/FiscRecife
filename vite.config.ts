// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        // The registration wrapper in src/lib/pwa.ts is the only registrar.
        injectRegister: null,
        registerType: "autoUpdate",
        // Never emit/serve a service worker in dev (and Lovable preview).
        devOptions: { enabled: false },
        filename: "sw.js",
        // We ship our own manifest.webmanifest from /public.
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          navigateFallback: "/",
          // OAuth callback must never be served from cache.
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // HTML navigations: always try the network first, fall back to cache offline.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "fiscrecife-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 14 },
              },
            },
            {
              // Hashed same-origin static assets.
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin &&
                ["style", "script", "worker", "font"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "fiscrecife-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Images (icons, logos, uploaded thumbnails on same origin).
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "fiscrecife-images",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Supabase GET reads: serve cached data when the network is unavailable.
              urlPattern: ({ url, request }) =>
                request.method === "GET" &&
                /supabase\.co|supabase\.in/.test(url.hostname),
              handler: "NetworkFirst",
              options: {
                cacheName: "fiscrecife-api",
                networkTimeoutSeconds: 5,
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
          ],
        },
      }),
    ],
  },
});
