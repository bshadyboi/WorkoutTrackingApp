/** Top-set history per lift for progress charts. */

export type LiftPoint = {
  date: string;
  weight: number;
  reps: number;
};

export type LiftSeries = {
  name: string;
  points: LiftPoint[];
  latest: LiftPoint;
  /** Latest top weight minus first charted top weight */
  deltaLb: number;
};

type SessionRow = {
  started_at: string;
  set_logs:
    | {
        exercise_name: string;
        weight: number;
        reps: number;
        is_completed: boolean;
        is_warmup?: boolean;
      }[]
    | null;
};

import { dateKey } from "@/lib/protocol";

function score(weight: number, reps: number) {
  return weight * 1000 + reps;
}

function dateKeyFromIso(iso: string) {
  return dateKey(new Date(iso));
}

/**
 * Build lift progress from finished sessions (newest first or any order).
 * Uses the heaviest completed working set each session as the data point.
 */
export function buildLiftSeries(sessions: SessionRow[], maxLifts = 8): LiftSeries[] {
  const byName = new Map<string, LiftPoint[]>();

  const ordered = [...sessions].sort((a, b) =>
    a.started_at.localeCompare(b.started_at)
  );

  for (const session of ordered) {
    const date = dateKeyFromIso(session.started_at);
    const logs = (session.set_logs ?? []).filter(
      (l) => l.is_completed && l.weight > 0 && !l.is_warmup
    );
    const bestByEx = new Map<string, { weight: number; reps: number }>();
    for (const log of logs) {
      const prev = bestByEx.get(log.exercise_name);
      if (!prev || score(log.weight, log.reps) > score(prev.weight, prev.reps)) {
        bestByEx.set(log.exercise_name, { weight: log.weight, reps: log.reps });
      }
    }
    for (const [name, best] of bestByEx) {
      const list = byName.get(name) ?? [];
      // One point per calendar day (keep best if same day)
      const last = list[list.length - 1];
      if (last && last.date === date) {
        if (score(best.weight, best.reps) > score(last.weight, last.reps)) {
          list[list.length - 1] = { date, ...best };
        }
      } else {
        list.push({ date, ...best });
      }
      byName.set(name, list);
    }
  }

  const series: LiftSeries[] = [];
  for (const [name, points] of byName) {
    if (points.length < 2) continue;
    const latest = points[points.length - 1];
    const first = points[0];
    series.push({
      name,
      points,
      latest,
      deltaLb: latest.weight - first.weight,
    });
  }

  series.sort((a, b) => b.points.length - a.points.length || a.name.localeCompare(b.name));
  return series.slice(0, maxLifts);
}

export function formatLiftWeight(w: number) {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}
