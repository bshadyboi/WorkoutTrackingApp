/* FitTrack service worker — rest timer + push notifications + offline shell */

let restTimer = null;

/**
 * Offline support, deliberately narrow. A previous next-pwa/workbox setup was
 * removed because it served stale JS to the iOS home-screen PWA, so nothing
 * here may ever answer with a cached copy while the network is reachable:
 *
 *   - /_next/static/* is content-hashed, so a hit can never be stale → cache first.
 *   - Navigations are network-first; the cache only answers once the network has
 *     actually failed, which is the gym-basement case this exists for.
 *   - API and Supabase traffic is never cached — a stale set or session is worse
 *     than an honest error.
 *
 * The cache name must not contain "workbox", "next", "pages" or "start-url":
 * UnregisterServiceWorkers deletes those on boot to clear the legacy caches.
 */
const SHELL_CACHE = "fittrack-shell-v1";

self.addEventListener("install", () => {
  // clients.claim() is only valid during activate — calling it here made
  // installation fail on Safari, so the SW never activated on iOS.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("fittrack-shell-") && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

function isCacheableNavigation(request, url) {
  if (request.mode !== "navigate") return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/auth/")) return false;
  return true;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Supabase, analytics, anything off-origin: leave it entirely alone.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/version.json") return;

  if (isImmutableAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          void cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  if (isCacheableNavigation(request, url)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(SHELL_CACHE);
            void cache.put(request, response.clone());
          }
          return response;
        } catch (err) {
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;
          const train = await caches.match("/train", { ignoreSearch: true });
          if (train) return train;
          throw err;
        }
      })()
    );
  }
});

function notifyRestDone(label, url, endsAt) {
  const body = `Time for your next set · ${label}`;
  void self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: "REST_DONE", label, url, endsAt });
    }
  });
  return self.registration.showNotification("Rest done", {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "fittrack-rest",
    requireInteraction: true,
    data: { url },
  });
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SCHEDULE_REST") {
    if (restTimer) clearTimeout(restTimer);
    const endsAt = Number(data.endsAt);
    if (!Number.isFinite(endsAt)) return;
    const delay = Math.max(0, endsAt - Date.now());
    const label = data.label || "Next set";
    const url = data.url || "/train";
    restTimer = setTimeout(() => {
      restTimer = null;
      void notifyRestDone(label, url, endsAt);
    }, delay);
    return;
  }

  if (data.type === "CANCEL_REST") {
    if (restTimer) {
      clearTimeout(restTimer);
      restTimer = null;
    }
  }
});

self.addEventListener("push", (event) => {
  let payload = { title: "FitTrack", body: "", url: "/train" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag || "fittrack-push",
      requireInteraction: payload.requireInteraction === true,
      data: { url: payload.url || "/train" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/train";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
