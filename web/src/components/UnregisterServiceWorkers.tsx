"use client";

import { useEffect } from "react";
import { SW_URL } from "@/lib/restAlert";

/**
 * Drop old Workbox caches (lag source), keep / register lean push SW.
 */
export function UnregisterServiceWorkers() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          const url = r.active?.scriptURL || r.installing?.scriptURL || "";
          // Remove legacy next-pwa / workbox workers only
          if (url.includes("workbox") || url.includes("_next")) {
            await r.unregister();
          }
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((k) => /workbox|next|pages|start-url/i.test(k))
              .map((k) => caches.delete(k))
          );
        }
        // Ensure push + rest SW is registered (bump query to refresh)
        await navigator.serviceWorker.register(SW_URL, { scope: "/" });
        const reg = await navigator.serviceWorker.ready;
        await reg.update();
      } catch {
        /* ignore */
      }
    })();
  }, []);
  return null;
}
