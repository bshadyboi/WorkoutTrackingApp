"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildLiftSeries,
  formatLiftWeight,
  type LiftSeries,
} from "@/lib/liftProgress";

function Sparkline({
  points,
}: {
  points: { weight: number }[];
}) {
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

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-14 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polygon points={area} fill="rgba(48, 209, 89, 0.12)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--green)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--green)" />
    </svg>
  );
}

export function LiftProgressCard() {
  const [series, setSeries] = useState<LiftSeries[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("workout_sessions")
        .select("started_at, set_logs(exercise_name, weight, reps, is_completed, is_warmup)")
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(60);

      if (cancelled) return;
      const built = buildLiftSeries(data ?? []);
      setSeries(built);
      setSelected((prev) => prev ?? built[0]?.name ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="h-36 animate-pulse rounded-2xl bg-[#1c212b]" />;
  }

  if (series.length === 0) {
    return (
      <div className="card space-y-1 !py-3.5">
        <p className="text-sm font-semibold">Lift progress</p>
        <p className="text-xs text-[var(--muted)]">
          Finish a few sessions of the same lifts and your top-set trend shows up here.
        </p>
      </div>
    );
  }

  const active = series.find((s) => s.name === selected) ?? series[0];
  const delta = active.deltaLb;
  const deltaLabel =
    Math.abs(delta) < 0.05
      ? "flat"
      : `${delta > 0 ? "+" : ""}${formatLiftWeight(delta)} lb`;

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Lift progress</p>
          <p className="text-[11px] text-[var(--muted)]">Top set over recent sessions</p>
        </div>
        <span
          className={`text-xs font-bold ${
            delta > 0.05
              ? "text-[var(--green)]"
              : delta < -0.05
                ? "text-[var(--yellow)]"
                : "text-[var(--muted)]"
          }`}
        >
          {deltaLabel}
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {series.map((s) => {
          const on = s.name === active.name;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => setSelected(s.name)}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                on
                  ? "bg-[var(--green)] text-black"
                  : "bg-[#252b38] text-[var(--muted)]"
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      <Sparkline points={active.points} />

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase text-[var(--muted)]">Latest</p>
          <p className="text-xl font-bold tabular-nums">
            {formatLiftWeight(active.latest.weight)}
            <span className="text-sm font-semibold text-[var(--muted)]">
              {" "}
              × {active.latest.reps}
            </span>
          </p>
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          {active.points.length} sessions · {active.points[0].date.slice(5)} →{" "}
          {active.latest.date.slice(5)}
        </p>
      </div>
    </div>
  );
}
