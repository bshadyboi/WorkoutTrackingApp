/**
 * How far the left side trails the right, lift by lift, over time.
 *
 * One-arm work is logged per side, so every session quietly records the gap
 * the physical therapy is meant to close. On its own that sits buried in
 * history; gathered up it answers the only question that matters — is the left
 * shoulder catching up, or standing still?
 */

import { dateKey } from "@/lib/protocol";

export type SidePoint = {
  date: string;
  left: number;
  right: number;
  /** How far behind the left side is, as a share of the right. */
  gapPct: number;
};

export type SideSeries = {
  name: string;
  points: SidePoint[];
  latest: SidePoint;
  /** Latest gap minus the oldest charted gap — negative means the gap is closing. */
  changePct: number;
};

type SetRow = {
  exercise_name: string;
  weight: number;
  reps: number;
  is_completed: boolean;
  is_warmup?: boolean;
  side?: "L" | "R" | null;
};

type SessionRow = { started_at: string; set_logs: SetRow[] | null };

function score(weight: number, reps: number) {
  return weight * 1000 + reps;
}

/**
 * Sessions must arrive newest first. Only sessions that logged both sides of a
 * lift count — a day where one side went unrecorded says nothing about balance.
 */
export function buildSideBalance(sessions: SessionRow[], maxLifts = 6): SideSeries[] {
  const byLift = new Map<string, Map<string, { left?: SetRow; right?: SetRow }>>();

  for (const session of sessions) {
    const day = dateKey(new Date(session.started_at));
    for (const row of session.set_logs ?? []) {
      if (!row.is_completed || row.is_warmup) continue;
      if (row.side !== "L" && row.side !== "R") continue;
      if (!(row.weight > 0)) continue;

      const days = byLift.get(row.exercise_name) ?? new Map();
      byLift.set(row.exercise_name, days);
      const best = days.get(day) ?? {};
      days.set(day, best);

      const key = row.side === "L" ? "left" : "right";
      const held = best[key];
      if (!held || score(row.weight, row.reps) > score(held.weight, held.reps)) {
        best[key] = row;
      }
    }
  }

  const out: SideSeries[] = [];
  for (const [name, days] of byLift) {
    const points: SidePoint[] = [];
    for (const [date, best] of days) {
      if (!best.left || !best.right) continue;
      const left = best.left.weight;
      const right = best.right.weight;
      const heavier = Math.max(left, right);
      if (!heavier) continue;
      points.push({
        date,
        left,
        right,
        gapPct: Math.round(((right - left) / heavier) * 100),
      });
    }
    if (points.length === 0) continue;

    points.sort((a, b) => a.date.localeCompare(b.date));
    const trimmed = points.slice(-8);
    const latest = trimmed[trimmed.length - 1];
    out.push({
      name,
      points: trimmed,
      latest,
      changePct: latest.gapPct - trimmed[0].gapPct,
    });
  }

  // Widest gap first — that's the side worth working on.
  return out
    .sort((a, b) => Math.abs(b.latest.gapPct) - Math.abs(a.latest.gapPct))
    .slice(0, maxLifts);
}

/** Plain-English summary of where a lift stands. */
export function sideBalanceLine(s: SideSeries): string {
  const gap = s.latest.gapPct;
  if (gap === 0) return "Even";
  const behind = gap > 0 ? "Left" : "Right";
  const pct = Math.abs(gap);
  if (s.points.length < 2) return `${behind} ${pct}% behind`;
  if (s.changePct === 0) return `${behind} ${pct}% behind · unchanged`;
  const closing = (gap > 0 && s.changePct < 0) || (gap < 0 && s.changePct > 0);
  return `${behind} ${pct}% behind · ${closing ? "closing" : "widening"}`;
}
