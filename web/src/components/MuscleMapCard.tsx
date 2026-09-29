"use client";

import { useMemo, useState } from "react";
import {
  BAND_COLORS,
  BAND_LABELS,
  BODY_BACK,
  BODY_FRONT,
  setsBand,
  shapeTotals,
  type MuscleShape,
} from "@/lib/muscleMap";

/**
 * Where the week's work actually went.
 *
 * A set count per muscle is a table nobody reads; the same numbers on a body
 * are read in a glance — a pale shoulder next to a bright chest says more about
 * a program than the table underneath it does.
 */
export function MuscleMapCard({
  setsByMuscle,
  days = 7,
}: {
  setsByMuscle: Record<string, number>;
  /** How many days of training the counts cover. */
  days?: number;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const { sets, labels } = useMemo(() => shapeTotals(setsByMuscle), [setsByMuscle]);

  const total = Object.values(setsByMuscle).reduce((n, v) => n + v, 0);
  if (!total) return null;

  const ranked = Object.entries(setsByMuscle).sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  const readout = picked
    ? picked
    : `${top[0]} leads with ${top[1]} ${top[1] === 1 ? "set" : "sets"}`;

  function figure(shapes: MuscleShape[], title: string) {
    return (
      <div className="flex min-w-0 flex-col items-center gap-1.5">
        <svg viewBox="0 0 1000 2200" className="h-auto w-full max-w-[150px]" aria-label={title}>
          {shapes.map((group) =>
            group.points.map((points, i) => {
              const count = sets[group.muscle] ?? 0;
              const label = labels[group.muscle];
              return (
                <polygon
                  key={`${group.muscle}-${i}`}
                  points={points}
                  fill={BAND_COLORS[setsBand(count)]}
                  stroke="var(--bg)"
                  strokeWidth={4}
                  onClick={() =>
                    setPicked(
                      label
                        ? `${label} · ${count} ${count === 1 ? "set" : "sets"}`
                        : null
                    )
                  }
                />
              );
            })
          )}
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--dim)]">
          {title}
        </span>
      </div>
    );
  }

  return (
    <section className="space-y-2.5">
      <div>
        <h2 className="text-[15px] font-bold">Muscle map</h2>
        <p className="text-[11.5px] text-[var(--muted)]">
          Working sets in the last {days} days · tap a muscle
        </p>
      </div>

      <div className="card p-3.5">
        <div className="flex justify-center gap-3">
          {figure(BODY_FRONT, "Front")}
          {figure(BODY_BACK, "Back")}
        </div>

        <p className="mt-2 text-center font-mono text-[12px] text-[var(--blue)]">{readout}</p>

        <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5 border-t border-[var(--border)] pt-2.5">
          {BAND_LABELS.map((label, i) => (
            <span key={label} className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <i
                className="inline-block h-3 w-3 rounded-[3px]"
                style={{ background: BAND_COLORS[i] }}
              />
              {label}
            </span>
          ))}
        </div>

        <div className="mt-3 space-y-1">
          {ranked.slice(0, 6).map(([muscle, count]) => (
            <div key={muscle} className="flex items-center gap-2.5">
              <span className="w-[92px] shrink-0 truncate text-[12px] text-[var(--muted)]">
                {muscle}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--raised)]">
                <i
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((count / Math.max(12, top[1])) * 100))}%`,
                    background: BAND_COLORS[setsBand(count)],
                  }}
                />
              </span>
              <span className="w-6 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-[var(--text)]">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
