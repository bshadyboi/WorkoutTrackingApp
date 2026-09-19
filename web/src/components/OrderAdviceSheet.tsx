"use client";

import { useState } from "react";
import type { MealItem } from "@/components/FoodSearchModal";

/**
 * "I'm at Chick-fil-A — what fits?" The day's remaining macros go out with the
 * restaurant's name; two or three real orders come back, each loggable.
 */

type Pick = {
  title: string;
  /** Set when the pick came from a location search. */
  place?: string;
  distance_mi?: number;
  items: {
    name: string;
    serving_label: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  verdict: "best" | "ok" | "avoid";
  why: string;
};

type Advice = { picks: Pick[]; checked: boolean; note: string };

const VERDICT = {
  best: { label: "Best pick", color: "var(--green)" },
  ok: { label: "Workable", color: "var(--yellow)" },
  avoid: { label: "Skip", color: "var(--red)" },
} as const;

function total(p: Pick) {
  return p.items.reduce(
    (t, i) => ({
      calories: t.calories + i.calories,
      protein: t.protein + i.protein,
      carbs: t.carbs + i.carbs,
      fat: t.fat + i.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function OrderAdviceSheet({
  remaining,
  slot,
  onClose,
  onLog,
}: {
  remaining: { calories: number; protein: number; carbs: number; fat: number };
  slot: MealItem["meal"];
  onClose: () => void;
  onLog: (items: MealItem[], label: string) => void;
}) {
  const [place, setPlace] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [advice, setAdvice] = useState<Advice | null>(null);

  /**
   * Ask what's nearby. The phone's coordinates go to the server, which finds
   * the restaurants around them — Claude never sees the location itself, only
   * the list of places that came back.
   */
  async function askNearby() {
    if (locating || busy) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("This device won't share a location — type the place instead.");
      return;
    }
    setLocating(true);
    setError("");
    setAdvice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/foods/nearby", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              remaining,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error || "Could not work that out");
          setAdvice(data as Advice);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not work that out");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError("Location permission denied — type the place instead.");
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 120_000 }
    );
  }

  async function ask() {
    const restaurant = place.trim();
    if (!restaurant || busy) return;
    setBusy(true);
    setError("");
    setAdvice(null);
    try {
      const res = await fetch("/api/foods/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant, remaining }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not work that out");
      setAdvice(data as Advice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not work that out");
    } finally {
      setBusy(false);
    }
  }

  function log(p: Pick) {
    const stamp = Date.now();
    onLog(
      p.items.map((i, n) => ({
        id: `${stamp}-${n}-order`,
        meal: slot,
        name: i.name,
        brand: p.place || place.trim() || undefined,
        calories: Math.round(i.calories),
        protein: Math.round(i.protein),
        carbs: Math.round(i.carbs),
        fat: Math.round(i.fat),
        servingLabel: i.serving_label || "1 serving",
      })),
      `Logged ${p.title} to ${slot}`
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-md border border-[var(--border)] bg-[var(--card)] sm:rounded-md">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <p className="font-bold">What should I order?</p>
          <button type="button" className="text-[var(--muted)]" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-3">
          <div className="rounded-md bg-[var(--surface)] p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
              Left today
            </p>
            <p className="mt-0.5 font-mono text-[13px] font-bold tabular-nums">
              {Math.max(0, Math.round(remaining.calories))} cal ·{" "}
              {Math.max(0, Math.round(remaining.protein))}p ·{" "}
              {Math.max(0, Math.round(remaining.carbs))}c ·{" "}
              {Math.max(0, Math.round(remaining.fat))}f
            </p>
          </div>

          <div className="flex gap-2">
            <input
              className="field min-w-0 flex-1 !py-2.5"
              placeholder="Chick-fil-A, Chipotle, Panda Express…"
              value={place}
              autoFocus
              onChange={(e) => setPlace(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void ask();
              }}
            />
            <button
              type="button"
              className="btn-accent shrink-0 !px-4 !py-2.5 text-sm"
              disabled={busy || !place.trim()}
              onClick={() => void ask()}
            >
              {busy ? "Thinking…" : "Ask"}
            </button>
          </div>

          <button
            type="button"
            className="w-full rounded-md border border-dashed border-[var(--border-solid)] py-2.5 text-[12.5px] font-bold text-[var(--blue)] disabled:opacity-50"
            disabled={locating || busy}
            onClick={() => void askNearby()}
          >
            {locating ? "Finding what's around you…" : "📍 What's near me?"}
          </button>

          {error ? <p className="text-sm text-[var(--yellow)]">{error}</p> : null}

          {advice?.picks.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              {advice.note || "Don't know that menu — try the chain's full name."}
            </p>
          ) : null}

          {advice?.picks.map((p) => {
            const t = total(p);
            const v = VERDICT[p.verdict];
            return (
              <div
                key={p.title}
                className="space-y-2 rounded-md border border-[var(--border-solid)] bg-[var(--surface)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {p.place ? (
                      <p className="truncate text-[12px] font-bold text-[var(--blue)]">
                        {p.place}
                        {typeof p.distance_mi === "number" ? ` · ${p.distance_mi} mi` : ""}
                      </p>
                    ) : null}
                    <p className="min-w-0 text-[14.5px] font-bold">{p.title}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
                    style={{ color: v.color, background: `color-mix(in srgb, ${v.color} 16%, transparent)` }}
                  >
                    {v.label}
                  </span>
                </div>

                <p className="font-mono text-[12.5px] font-bold tabular-nums text-[var(--blue)]">
                  {Math.round(t.calories)} cal · {Math.round(t.protein)}p · {Math.round(t.carbs)}c ·{" "}
                  {Math.round(t.fat)}f
                </p>
                <p className="text-[12px] text-[var(--muted)]">{p.why}</p>

                <div className="space-y-0.5">
                  {p.items.map((i) => (
                    <p key={i.name} className="text-[11.5px] text-[var(--dim)]">
                      {i.name} · {i.serving_label} · {Math.round(i.calories)} cal
                    </p>
                  ))}
                </div>

                {p.verdict === "avoid" ? null : (
                  <button
                    type="button"
                    className="w-full rounded-[4px] bg-[var(--raised)] py-2 text-[12.5px] font-bold text-[var(--text)]"
                    onClick={() => log(p)}
                  >
                    Log this to {slot}
                  </button>
                )}
              </div>
            );
          })}

          {advice && advice.picks.length > 0 ? (
            <p className="pb-3 text-[11px] text-[var(--dim)]">
              {advice.checked
                ? "Numbers from your saved menu data."
                : "Menu numbers are from memory — chains change them, so treat as close, not exact."}
              {advice.note ? ` ${advice.note}` : ""}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
