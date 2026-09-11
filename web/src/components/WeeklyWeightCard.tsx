"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateKey } from "@/lib/protocol";
import { DEFAULT_TARGETS, type MacroTargets } from "@/lib/targets";

export type WeightPoint = { date: string; weight: number };

function Sparkline({ points }: { points: WeightPoint[] }) {
  if (points.length < 2) return null;

  const w = 280;
  const h = 56;
  const pad = 4;
  const vals = points.map((p) => p.weight);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.weight - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  const last = coords[coords.length - 1];
  const delta = vals[vals.length - 1] - vals[0];
  const deltaLabel =
    Math.abs(delta) < 0.05
      ? "flat"
      : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} lb`;

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-14 w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <polygon points={area} fill="rgba(91, 168, 255, 0.12)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--green)" />
      </svg>
      <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
        <span>
          {points[0].date.slice(5)} → {points[points.length - 1].date.slice(5)}
        </span>
        <span
          className={
            delta < -0.05
              ? "font-semibold text-[var(--green)]"
              : delta > 0.05
                ? "font-semibold text-[var(--yellow)]"
                : "font-semibold"
          }
        >
          {deltaLabel} · {points.length} days
        </span>
      </div>
    </div>
  );
}

/** Daily fasted morning weight (replaces Monday-only weekly weigh-in). */
export function DailyWeightCard({
  date = dateKey(),
  initial,
  history = [],
  targets = DEFAULT_TARGETS,
}: {
  date?: string;
  initial: number;
  history?: WeightPoint[];
  targets?: MacroTargets;
}) {
  const [weight, setWeight] = useState(initial ? String(initial) : "");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [points, setPoints] = useState(history);

  async function save() {
    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setMsg("Sign in required");
      return;
    }
    const value = Number(weight) || 0;
    const { error } = await supabase.from("daily_logs").upsert(
      {
        user_id: user.id,
        date,
        morning_weight: value,
        ...targets,
      },
      { onConflict: "user_id,date" }
    );
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Saved");
    if (value > 0) {
      setPoints((prev) => {
        const without = prev.filter((p) => p.date !== date);
        return [...without, { date, weight: value }].sort((a, b) =>
          a.date.localeCompare(b.date)
        );
      });
    }
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Morning weight</p>
        <span className="rounded-full bg-[var(--raised)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
          Daily
        </span>
      </div>

      {points.length >= 2 ? <Sparkline points={points} /> : null}

      <div className="flex gap-2">
        <input
          className="field flex-1 !py-2.5"
          inputMode="decimal"
          placeholder="0.0 lb"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <button
          type="button"
          className="btn-green px-5"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? "…" : "Save"}
        </button>
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        Fasted AM — after the bathroom, before food or water.
      </p>
      {msg ? (
        <p
          className={`text-xs ${
            msg === "Saved" ? "text-[var(--green)]" : "text-[var(--yellow)]"
          }`}
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}

/** @deprecated use DailyWeightCard */
export const WeeklyWeightCard = DailyWeightCard;
