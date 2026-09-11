import { dateKey } from "@/lib/protocol";
import { weekStartKey } from "@/lib/checkin";

/** Derrick Recomp compounds tracked for weekly strength trend. */
export const DERRICK_KEY_LIFTS = [
  {
    id: "floor-press",
    label: "Floor Press",
    day: "Upper A",
    match: (name: string) => /floor press/i.test(name),
  },
  {
    id: "pulldown",
    label: "Pulldown / Chin",
    day: "Upper B",
    match: (name: string) =>
      /pulldown|chin/i.test(name) && !/pushdown|push.?down/i.test(name),
  },
  {
    id: "squat",
    label: "Squat",
    day: "Lower A",
    match: (name: string) =>
      /goblet|safety.?bar|hack squat/i.test(name) ||
      (/squat/i.test(name) && !/split|bulgarian|leg press/i.test(name)),
  },
  {
    id: "hinge",
    label: "Trap-Bar / RDL",
    day: "Lower B",
    match: (name: string) => /trap.?bar|db rdl|^rdl\b|deadlift/i.test(name),
  },
] as const;

export type KeyLiftId = (typeof DERRICK_KEY_LIFTS)[number]["id"];

export type KeyLiftTop = {
  id: KeyLiftId;
  label: string;
  day: string;
  weight: number;
  reps: number;
  date: string;
  exerciseName: string;
};

export type KeyLiftWeekCompare = {
  id: KeyLiftId;
  label: string;
  day: string;
  thisWeek: KeyLiftTop | null;
  lastWeek: KeyLiftTop | null;
  /** this − last top score; null if either missing */
  deltaScore: number | null;
  trend: "up" | "flat" | "down" | "new";
};

type Log = {
  exercise_name: string;
  weight: number;
  reps: number;
  is_completed?: boolean;
  is_warmup?: boolean;
};

type SessionRow = {
  started_at: string;
  set_logs: Log[] | null;
};

function score(weight: number, reps: number) {
  return weight * 1000 + reps;
}

function bestInSessions(
  sessions: SessionRow[],
  lift: (typeof DERRICK_KEY_LIFTS)[number]
): KeyLiftTop | null {
  let best: KeyLiftTop | null = null;
  for (const s of sessions) {
    const date = dateKey(new Date(s.started_at));
    for (const log of s.set_logs ?? []) {
      if (log.is_warmup) continue;
      if (log.is_completed === false) continue;
      const w = Number(log.weight) || 0;
      const r = Number(log.reps) || 0;
      if (w <= 0 || r <= 0) continue;
      if (!lift.match(log.exercise_name || "")) continue;
      const cand: KeyLiftTop = {
        id: lift.id,
        label: lift.label,
        day: lift.day,
        weight: w,
        reps: r,
        date,
        exerciseName: log.exercise_name,
      };
      if (!best || score(w, r) > score(best.weight, best.reps)) best = cand;
    }
  }
  return best;
}

function sessionsInRange(
  sessions: SessionRow[],
  startKey: string,
  endKeyExclusive: string
) {
  return sessions.filter((s) => {
    const k = dateKey(new Date(s.started_at));
    return k >= startKey && k < endKeyExclusive;
  });
}

function addDaysKey(key: string, days: number) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/**
 * Compare this week's top sets vs last week for Derrick key lifts.
 */
export function compareKeyLiftsWeek(
  sessions: SessionRow[],
  asOf: Date = new Date()
): KeyLiftWeekCompare[] {
  const thisStart = weekStartKey(asOf);
  const nextStart = addDaysKey(thisStart, 7);
  const lastStart = addDaysKey(thisStart, -7);

  const thisSessions = sessionsInRange(sessions, thisStart, nextStart);
  const lastSessions = sessionsInRange(sessions, lastStart, thisStart);

  return DERRICK_KEY_LIFTS.map((lift) => {
    const thisWeek = bestInSessions(thisSessions, lift);
    const lastWeek = bestInSessions(lastSessions, lift);
    let trend: KeyLiftWeekCompare["trend"] = "new";
    let deltaScore: number | null = null;
    if (thisWeek && lastWeek) {
      deltaScore =
        score(thisWeek.weight, thisWeek.reps) -
        score(lastWeek.weight, lastWeek.reps);
      if (deltaScore > 0) trend = "up";
      else if (deltaScore < 0) trend = "down";
      else trend = "flat";
    } else if (thisWeek && !lastWeek) {
      trend = "new";
    } else {
      trend = "flat";
    }
    return {
      id: lift.id,
      label: lift.label,
      day: lift.day,
      thisWeek,
      lastWeek,
      deltaScore,
      trend,
    };
  });
}

/** Majority vote across lifts that have both weeks of data. */
export function strengthTrendFromKeyLifts(
  compares: KeyLiftWeekCompare[]
): "climbing" | "flat" | "falling" | null {
  const paired = compares.filter((c) => c.thisWeek && c.lastWeek);
  if (paired.length === 0) return null;
  let up = 0;
  let down = 0;
  for (const c of paired) {
    if (c.trend === "up") up += 1;
    else if (c.trend === "down") down += 1;
  }
  if (up > down) return "climbing";
  if (down > up) return "falling";
  return "flat";
}

export function formatTopSet(t: KeyLiftTop | null) {
  if (!t) return "—";
  const w = Number.isInteger(t.weight) ? String(t.weight) : t.weight.toFixed(1);
  return `${w}×${t.reps}`;
}
