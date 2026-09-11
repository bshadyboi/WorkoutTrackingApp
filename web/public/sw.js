/* FitTrack service worker — rest timer + push notifications */

let restTimer = null;

self.addEventListener("install", () => {
  // clients.claim() is only valid during activate — calling it here made
  // installation fail on Safari, so the SW never activated on iOS.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
