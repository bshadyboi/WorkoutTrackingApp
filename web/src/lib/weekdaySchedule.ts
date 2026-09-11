import { dateKey } from "@/lib/protocol";
import {
  resolveScheduledDay,
  type DateOverrides,
  type ScheduleSlots,
} from "@/lib/schedule";

export const PPL_WEEKLY_LABELS = [
  "Sun · Rest",
  "Mon · Push A",
  "Tue · Pull A",
  "Wed · Legs modified (hybrid)",
  "Thu · Push B",
  "Fri · Pull B",
  "Sat · Rest",
] as const;

/** Bridge week ends; full weekly PPL starts this Monday. */
export const WEEKLY_PPL_START_KEY = "2026-08-31";

/**
 * Remaining bridge days before Monday weekly reset.
 * 27 Push A · 28 Pull A · 29 Push B · 30 Pull B · then Mon weekly.
 */
export const BRIDGE_BY_DATE: Record<string, string> = {
  "2026-08-27": "Push A",
  "2026-08-28": "Pull A",
  "2026-08-29": "Push B",
  "2026-08-30": "Pull B",
};

export type WeekdayResolve = {
  scheduled: { id: string; name: string; subtitle: string } | null;
  label: string;
  isRest: boolean;
  doneToday: boolean;
  /** True when still on the short bridge week */
  bridgeWeek?: boolean;
};

function resolveNamedDay(
  name: string | null,
  days: { id: string; name: string; subtitle?: string }[]
): { id: string; name: string; subtitle: string } | null {
  if (!name) return null;
  const day = days.find((d) => d.name === name);
  if (!day) return null;
  return { id: day.id, name: day.name, subtitle: day.subtitle ?? "" };
}

export function resolveWeekdayWorkout(input: {
  asOf?: Date;
  slots: ScheduleSlots;
  days: { id: string; name: string; subtitle?: string }[];
  overrides?: DateOverrides;
  /** Finished sessions (any date) — used to detect done today */
  sessions?: { dayName: string; startedAt: string }[];
}): WeekdayResolve {
  const asOf = input.asOf ?? new Date();
  const asOfKey = dateKey(asOf);
  const overrides = input.overrides ?? {};

  // Explicit makeup / override always wins
  if (Object.prototype.hasOwnProperty.call(overrides, asOfKey)) {
    const id = overrides[asOfKey];
    if (!id) {
      return {
        scheduled: null,
        label: "Rest",
        isRest: true,
        doneToday: isWorkoutDoneToday(null, true, input.sessions ?? [], asOf),
        bridgeWeek: asOfKey < WEEKLY_PPL_START_KEY,
      };
    }
    const day = input.days.find((d) => d.id === id) ?? null;
    const scheduled = day
      ? { id: day.id, name: day.name, subtitle: day.subtitle ?? "" }
      : null;
    return {
      scheduled,
      label: scheduled?.name ?? "Rest",
      isRest: !scheduled,
      doneToday: isWorkoutDoneToday(
        scheduled,
        !scheduled,
        input.sessions ?? [],
        asOf
      ),
      bridgeWeek: asOfKey < WEEKLY_PPL_START_KEY,
    };
  }

  // Bridge days until Mon Aug 31
  if (asOfKey < WEEKLY_PPL_START_KEY) {
    const name = BRIDGE_BY_DATE[asOfKey] ?? null;
    const scheduled = resolveNamedDay(name, input.days);
    return {
      scheduled,
      label: scheduled?.name ?? "Rest",
      isRest: !scheduled,
      doneToday: isWorkoutDoneToday(
        scheduled,
        !scheduled,
        input.sessions ?? [],
        asOf
      ),
      bridgeWeek: true,
    };
  }

  const scheduled = resolveScheduledDay(asOf, input.slots, input.days, null);
  const isRest = !scheduled;

  return {
    scheduled,
    label: scheduled?.name ?? "Rest",
    isRest,
    doneToday: isWorkoutDoneToday(
      scheduled,
      isRest,
      input.sessions ?? [],
      asOf
    ),
  };
}

export function isWorkoutDoneToday(
  scheduled: { id: string; name: string } | null,
  isRest: boolean,
  sessions: { dayName: string; startedAt: string }[],
  asOf: Date = new Date()
): boolean {
  const key = dateKey(asOf);
  const todaySessions = sessions.filter((s) => dateKey(new Date(s.startedAt)) === key);

  if (!todaySessions.length) return false;

  if (isRest) {
    return todaySessions.some((s) => /rest/i.test(s.dayName.trim()));
  }

  if (!scheduled) return false;

  const target = scheduled.name.trim().toLowerCase();
  return todaySessions.some((s) => s.dayName.trim().toLowerCase() === target);
}

export function resolveWeekdayTodayAndTomorrow(input: {
  slots: ScheduleSlots;
  days: { id: string; name: string; subtitle?: string }[];
  overrides?: DateOverrides;
  sessions?: { dayName: string; startedAt: string }[];
}): { today: WeekdayResolve; tomorrow: WeekdayResolve } {
  const today = resolveWeekdayWorkout({
    asOf: new Date(),
    ...input,
  });

  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  tom.setHours(12, 0, 0, 0);

  const tomorrow = resolveWeekdayWorkout({
    asOf: tom,
    ...input,
  });

  return { today, tomorrow };
}
