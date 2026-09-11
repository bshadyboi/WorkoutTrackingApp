import {
  formatSet,
  type LiftCompare,
  type SessionBrief,
  type SessionSet,
} from "@/lib/checkin";

export type WinKind =
  | "pr"
  | "beat_last"
  | "first"
  | "streak"
  | "comeback"
  | "complete";

export type Win = {
  id: string;
  kind: WinKind;
  /** Short headline, e.g. "New best · Incline DB Press" */
  title: string;
  /** Optional detail, e.g. "185 × 6 (was 175 × 6)" */
  detail?: string;
};

export type BestSet = { weight: number; reps: number };

function score(s: { weight: number; reps: number }) {
  return s.weight * 1000 + s.reps;
}

function topSet(sets: SessionSet[]): SessionSet | null {
  const working = sets.filter((s) => !s.is_warmup);
  const pool = working.length ? working : sets;
  if (!pool.length) return null;
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

function setsForExercise(session: SessionBrief, name: string) {
  return session.sets.filter((s) => s.exercise_name === name);
}

export function kindLabel(kind: WinKind) {
  switch (kind) {
    case "pr":
      return "Personal record";
    case "beat_last":
      return "Up from last time";
    case "first":
      return "First time";
    case "streak":
      return "Consistency";
    case "comeback":
      return "Back at it";
    case "complete":
      return "Session done";
  }
}

/**
 * Detect celebration-worthy moments for any finished session.
 * Reusable anywhere you have session + history context.
 */
export function detectSessionWins(input: {
  session: SessionBrief;
  previousSameDay: SessionBrief | null;
  /** All-time best top set per exercise (before this session) */
  allTimeBest: Record<string, BestSet>;
  /** Completed sessions before this one */
  priorSessionCount: number;
  /** Completed sessions in the last 7 days including this one */
  sessionsThisWeek: number;
  /** Days since previous session ended; null if none */
  daysSinceLastSession: number | null;
  liftLog?: LiftCompare[];
}): Win[] {
  const dayName = input.session.dayName || "";
  const wins: Win[] = [];
  const names = [
    ...new Set(input.session.sets.map((s) => s.exercise_name)),
  ];

  // Personal records (all-time)
  for (const name of names) {
    const todayTop = topSet(setsForExercise(input.session, name));
    if (!todayTop || todayTop.weight <= 0) continue;
    const prior = input.allTimeBest[name];
    if (!prior) {
      // First logged set for this lift — soft PR
      wins.push({
        id: `pr-first-${name}`,
        kind: "pr",
        title: `First log · ${name}`,
        detail: formatSet(todayTop.weight, todayTop.reps),
      });
      continue;
    }
    if (score(todayTop) > score(prior)) {
      wins.push({
        id: `pr-${name}`,
        kind: "pr",
        title: `New best · ${name}`,
        detail: `${formatSet(todayTop.weight, todayTop.reps)} (was ${formatSet(
          prior.weight,
          prior.reps
        )})`,
      });
    }
  }

  // Beat last same-day session (when not already counted as PR)
  const prNames = new Set(
    wins.filter((w) => w.kind === "pr").map((w) => w.title.split(" · ")[1])
  );
  const liftLog = input.liftLog ?? [];
  for (const row of liftLog) {
    if (row.tag !== "up" || !row.last) continue;
    if (prNames.has(row.name)) continue;
    wins.push({
      id: `up-${row.name}`,
      kind: "beat_last",
      title: `Stronger · ${row.name}`,
      detail: `${row.last} → ${row.today}`,
    });
  }

  // First time completing this day type
  if (!input.previousSameDay && input.priorSessionCount > 0) {
    wins.push({
      id: `first-${dayName}`,
      kind: "first",
      title: `First ${dayName} in the books`,
      detail: "Baseline set — next time you can compare.",
    });
  }

  // Comeback after a gap
  if (
    input.daysSinceLastSession != null &&
    input.daysSinceLastSession >= 4
  ) {
    wins.push({
      id: "comeback",
      kind: "comeback",
      title: "Back after a break",
      detail: `${input.daysSinceLastSession} days since last session`,
    });
  }

  // Weekly consistency
  if (input.sessionsThisWeek >= 3) {
    wins.push({
      id: `streak-${input.sessionsThisWeek}`,
      kind: "streak",
      title: `${input.sessionsThisWeek} sessions this week`,
      detail: "Consistency compounds.",
    });
  }

  // Always celebrate finishing if nothing else fired
  if (wins.length === 0) {
    wins.push({
      id: "complete",
      kind: "complete",
      title: `${dayName} complete`,
      detail: "Logged. Nice work.",
    });
  }

  // Cap noise: PRs first, then beat_last, then meta (max ~6)
  const order: WinKind[] = [
    "pr",
    "beat_last",
    "first",
    "comeback",
    "streak",
    "complete",
  ];
  wins.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return wins.slice(0, 6);
}

/** Build all-time best map from prior set logs. */
export function buildAllTimeBest(
  rows: {
    exercise_name: string;
    weight: number;
    reps: number;
    is_warmup?: boolean;
  }[]
): Record<string, BestSet> {
  const out: Record<string, BestSet> = {};
  for (const r of rows) {
    if (r.is_warmup) continue;
    if (!r.exercise_name || !(Number(r.weight) > 0)) continue;
    const cur = { weight: Number(r.weight), reps: Number(r.reps) || 0 };
    const prev = out[r.exercise_name];
    if (!prev || score(cur) > score(prev)) out[r.exercise_name] = cur;
  }
  return out;
}

export function winsCopyBlock(wins: Win[]) {
  const meaningful = wins.filter((w) => w.kind !== "complete");
  if (!meaningful.length) return [];
  return [
    "",
    "Wins",
    ...meaningful.map((w) =>
      w.detail ? `${w.title} — ${w.detail}` : w.title
    ),
  ];
}
