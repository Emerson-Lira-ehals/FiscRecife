// Guarded service-worker registration for FiscRecife.
//
// The service worker MUST NOT register inside the Lovable editor/preview
// (iframe + preview hostnames) or in dev — it would serve stale HTML/chunks.
// Offline support therefore only works on the published app.
//
// `?sw=off` is a kill switch: it unregisters any existing worker.

const SW_URL = "/sw.js";

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  // Only ever register in a production build.
  if (!import.meta.env.PROD) return true;
  // Kill switch.
  try {
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  } catch {
    return true;
  }
  // Never inside an iframe (Lovable preview embeds the app in an iframe).
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true; // cross-origin frame access throws -> we are framed
  }
  const host = window.location.hostname;
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  ) {
    return true;
  }
  return false;
}

async function unregisterAll(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.map((r) => (r.active?.scriptURL.endsWith(SW_URL) ? r.unregister() : Promise.resolve(false))),
    );
  } catch {
    /* ignore */
  }
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (isRefusedContext()) {
    // Make sure no stale worker keeps serving cached assets in preview/dev.
    void unregisterAll();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {
      /* registration failures should never break the app */
    });
  });
}
