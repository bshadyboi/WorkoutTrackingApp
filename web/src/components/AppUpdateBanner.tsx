"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fittrack-app-v";
const SW_VERSION = "rest6";

async function hardReload(newVersion: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(newVersion));
  } catch {
    /* ignore */
  }

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }

  const url = new URL(window.location.href);
  url.searchParams.set("_v", String(newVersion));
  window.location.replace(url.toString());
}

/**
 * iOS home-screen PWAs cache old JS bundles. Fetch version.json (no-cache)
 * and prompt reload when a new deploy is live.
 */
export function AppUpdateBanner() {
  const [show, setShow] = useState(false);
  const [serverV, setServerV] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/version.json?${Date.now()}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const text = await res.text();
        const { v } = JSON.parse(text) as { v?: number };
        if (!v || cancelled) return;
        setServerV(v);

        const prev = localStorage.getItem(STORAGE_KEY);
        if (!prev) {
          localStorage.setItem(STORAGE_KEY, String(v));
          return;
        }
        if (prev !== String(v)) {
          setShow(true);
        }
      } catch {
        /* offline or bad response */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show || !serverV) return null;

  return (
    <div
      className="fixed inset-x-0 z-[80] border-t border-[var(--blue)]/40 bg-[#0f1a2e] px-4 py-3 shadow-lg"
      style={{
        bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
      }}
      role="status"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">Update available</p>
          <p className="text-[11px] text-[var(--muted)]">Tap reload to get the latest build</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="text-[11px] font-bold text-[var(--muted)]"
            disabled={busy}
            onClick={() => {
              if (serverV) localStorage.setItem(STORAGE_KEY, String(serverV));
              setShow(false);
            }}
          >
            Later
          </button>
          <button
            type="button"
            className="btn-accent px-4 py-2 text-sm"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void hardReload(serverV);
            }}
          >
            {busy ? "Reloading…" : "Reload app"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { SW_VERSION };
