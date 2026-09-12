"use client";

import { useEffect, useState } from "react";

const LAST_OPEN_KEY = "fittrack-last-open";
const DISMISS_KEY = "fittrack-keepalive-dismissed";
const GAP_DAYS = 5;

/**
 * Soft reminder after a long absence so free Supabase doesn't pause again.
 * Also stamps last-open on every mount (any authenticated screen).
 */
export function KeepAliveBanner() {
  const [gapDays, setGapDays] = useState<number | null>(null);
  const [gapStamp, setGapStamp] = useState<string | null>(null);

  useEffect(() => {
    const now = Date.now();
    try {
      const prevRaw = localStorage.getItem(LAST_OPEN_KEY);
      const prev = prevRaw ? Number(prevRaw) : NaN;
      if (Number.isFinite(prev) && prev > 0) {
        const days = Math.floor((now - prev) / 86400000);
        const dismissed = localStorage.getItem(DISMISS_KEY);
        // Show once per absence gap (keyed by previous last-open stamp)
        if (days >= GAP_DAYS && dismissed !== String(prev)) {
          setGapDays(days);
          setGapStamp(String(prev));
        }
      }
      localStorage.setItem(LAST_OPEN_KEY, String(now));
    } catch {
      /* ignore */
    }
  }, []);

  if (gapDays == null) return null;

  return (
    <div
      className="mb-3 rounded-md border px-3 py-2.5"
      style={{
        borderColor: "rgba(255, 204, 102, 0.4)",
        background: "rgba(255, 204, 102, 0.08)",
      }}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--yellow)]">
            Welcome back
          </p>
          <p className="text-sm font-semibold text-[var(--text)]">
            {gapDays} day{gapDays === 1 ? "" : "s"} since last open
          </p>
          <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">
            Free Supabase can pause after inactivity (that’s what broke the app). Open
            FitTrack a few times a week to keep it awake.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-bold text-[var(--muted)]"
          onClick={() => {
            try {
              if (gapStamp) localStorage.setItem(DISMISS_KEY, gapStamp);
            } catch {
              /* ignore */
            }
            setGapDays(null);
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
