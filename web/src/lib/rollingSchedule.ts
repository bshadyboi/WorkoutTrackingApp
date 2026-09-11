import { dateKey } from "@/lib/protocol";

/**
 * Modified bro split — 6 on / 1 off.
 * Not tied to weekdays; advances one step per calendar day from last session.
 */
export const ROLLING_SEQUENCE = [
  "Chest & Triceps",
  "Back & Biceps",
  "Legs",
  "Shoulders & Abs",
  "Back & Rear Delts",
  "Arms & Calves",
  "Rest",
] as const;

export type RollingPhase = (typeof ROLLING_SEQUENCE)[number];

export const FIRST_TRAINING_DAY: RollingPhase = "Chest & Triceps";

/** Calendar day Day 1 (Chest & Triceps) begins — local YYYY-MM-DD. */
export const PROGRAM_START_KEY = "2026-08-26";

export type LibraryDay = {
  id: string;
  name: string;
  subtitle?: string;
  exerciseCount?: number;
};

export type SessionAnchor = {
  dayName: string;
  startedAt: string;
};

export type RollingResolve = {
  phase: RollingPhase;
  label: string;
  doneToday: boolean;
  libraryDay: LibraryDay | null;
  /** True when asOf is before PROGRAM_START_KEY */
  preStart?: boolean;
};

export function programStartLabel() {
  const d = parseDateKeyLocal(PROGRAM_START_KEY);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

const NAME_ALIASES: Record<string, RollingPhase> = {
  rest: "Rest",
  "rest day": "Rest",
  "chest & triceps": "Chest & Triceps",
  "chest and triceps": "Chest & Triceps",
  chest: "Chest & Triceps",
  "back & biceps": "Back & Biceps",
  "back and biceps": "Back & Biceps",
  legs: "Legs",
  "legs (quads & calves)": "Legs",
  "shoulders & abs": "Shoulders & Abs",
  "shoulders and abs": "Shoulders & Abs",
  shoulders: "Shoulders & Abs",
  "back & rear delts": "Back & Rear Delts",
  "back and rear delts": "Back & Rear Delts",
  "arms & calves": "Arms & Calves",
  "arms and calves": "Arms & Calves",
  arms: "Arms & Calves",
};

/** Map a logged day_name onto the bro-split sequence. */
export function classifyRollingPhase(dayName: string): RollingPhase | null {
  const n = dayName.trim().toLowerCase();
  if (!n) return null;
  if (NAME_ALIASES[n]) return NAME_ALIASES[n];
  if (/(^|[^a-z])rest([^a-z]|$)/i.test(n)) return "Rest";

  for (const phase of ROLLING_SEQUENCE) {
    if (phase === "Rest") continue;
    if (n === phase.toLowerCase()) return phase;
    if (n.startsWith(phase.toLowerCase())) return phase;
  }

  // Legacy U/L → map into nearby bro days so history still advances
  if (n.startsWith("upper")) return "Chest & Triceps";
  if (n.startsWith("lower")) return "Legs";
  if (n.startsWith("push")) return "Chest & Triceps";
  if (n.startsWith("pull")) return "Back & Biceps";

  return null;
}

export function nextRollingPhase(phase: RollingPhase): RollingPhase {
  const i = ROLLING_SEQUENCE.indexOf(phase);
  return ROLLING_SEQUENCE[(i + 1) % ROLLING_SEQUENCE.length];
}

export function advanceRollingPhase(phase: RollingPhase, steps: number): RollingPhase {
  const i = ROLLING_SEQUENCE.indexOf(phase);
  const len = ROLLING_SEQUENCE.length;
  const s = ((steps % len) + len) % len;
  return ROLLING_SEQUENCE[(i + s) % len];
}

export function calendarDaysBetween(fromKey: string, toKey: string): number {
  const from = parseDateKeyLocal(fromKey);
  const to = parseDateKeyLocal(toKey);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function parseDateKeyLocal(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function findLibraryDayForPhase(
  phase: RollingPhase,
  days: LibraryDay[]
): LibraryDay | null {
  if (phase === "Rest") return null;
  const exact = days.find((d) => d.name.trim().toLowerCase() === phase.toLowerCase());
  if (exact) return exact;
  return days.find((d) => classifyRollingPhase(d.name) === phase) ?? null;
}

/**
 * Resolve today's (or any date's) workout in the 6-on / 1-off cycle.
 *
 * - Before PROGRAM_START_KEY → Rest / pre-start (program begins that morning)
 * - On/after start with no post-start history → count days from start (Day 1 = Chest)
 * - Otherwise advance one phase per calendar day from last completed session
 */
export function resolveRollingDay(input: {
  asOf?: Date;
  lastSession: SessionAnchor | null;
  days: LibraryDay[];
  override?: { active: boolean; dayId: string | null };
}): RollingResolve {
  const asOf = input.asOf ?? new Date();
  const asOfKey = dateKey(asOf);

  if (input.override?.active) {
    const id = input.override.dayId;
    if (!id) {
      return { phase: "Rest", label: "Rest", doneToday: false, libraryDay: null };
    }
    const day = input.days.find((d) => d.id === id) ?? null;
    const phase = day
      ? classifyRollingPhase(day.name) ?? FIRST_TRAINING_DAY
      : FIRST_TRAINING_DAY;
    return {
      phase: day ? phase : "Rest",
      label: day?.name ?? "Rest",
      doneToday: false,
      libraryDay: day,
    };
  }

  // Program has not started yet — off day until start morning
  if (asOfKey < PROGRAM_START_KEY) {
    return {
      phase: "Rest",
      label: `Starts ${programStartLabel()}`,
      doneToday: false,
      libraryDay: null,
      preStart: true,
    };
  }

  const last = input.lastSession;
  const lastKey = last ? dateKey(new Date(last.startedAt)) : null;
  const lastPhase = last ? classifyRollingPhase(last.dayName) : null;
  const lastIsPostStart = Boolean(lastKey && lastKey >= PROGRAM_START_KEY && lastPhase);

  // Fresh cycle from program start (ignore pre-start history)
  if (!lastIsPostStart) {
    const steps = calendarDaysBetween(PROGRAM_START_KEY, asOfKey);
    const phase = advanceRollingPhase(FIRST_TRAINING_DAY, Math.max(0, steps));
    const libraryDay = findLibraryDayForPhase(phase, input.days);
    return {
      phase,
      label: phase === "Rest" ? "Rest" : libraryDay?.name ?? phase,
      doneToday: false,
      libraryDay: phase === "Rest" ? null : libraryDay,
    };
  }

  if (lastKey === asOfKey) {
    const libraryDay = findLibraryDayForPhase(lastPhase!, input.days);
    return {
      phase: lastPhase!,
      label: lastPhase === "Rest" ? "Rest" : libraryDay?.name ?? lastPhase!,
      doneToday: true,
      libraryDay: lastPhase === "Rest" ? null : libraryDay,
    };
  }

  const steps = calendarDaysBetween(lastKey!, asOfKey);
  const phase = advanceRollingPhase(lastPhase!, Math.max(0, steps));
  const libraryDay = findLibraryDayForPhase(phase, input.days);

  return {
    phase,
    label: phase === "Rest" ? "Rest" : libraryDay?.name ?? phase,
    doneToday: false,
    libraryDay: phase === "Rest" ? null : libraryDay,
  };
}

export function resolveRollingTodayAndTomorrow(input: {
  lastSession: SessionAnchor | null;
  days: LibraryDay[];
  todayOverride?: { active: boolean; dayId: string | null };
  tomorrowOverride?: { active: boolean; dayId: string | null };
}): { today: RollingResolve; tomorrow: RollingResolve } {
  const today = resolveRollingDay({
    asOf: new Date(),
    lastSession: input.lastSession,
    days: input.days,
    override: input.todayOverride,
  });

  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  tom.setHours(12, 0, 0, 0);

  const tomorrow = resolveRollingDay({
    asOf: tom,
    lastSession: input.lastSession,
    days: input.days,
    override: input.tomorrowOverride,
  });

  return { today, tomorrow };
}
