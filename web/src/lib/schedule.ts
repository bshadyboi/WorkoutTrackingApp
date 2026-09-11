import { scheduledWorkoutName, dateKey } from "@/lib/protocol";

/** Index 0 = Sunday … 6 = Saturday (matches Date.getDay()). null = Rest. */
export type ScheduleSlots = (string | null)[];

/** Per calendar date → workout_day id or null (Rest). */
export type DateOverrides = Record<string, string | null>;

export const EMPTY_SLOTS: ScheduleSlots = [null, null, null, null, null, null, null];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function parseSlots(raw: unknown): ScheduleSlots {
  if (!Array.isArray(raw) || raw.length !== 7) return [...EMPTY_SLOTS];
  return raw.map((v) => (typeof v === "string" && v.length > 0 ? v : null));
}

export function parseOverrides(raw: unknown): DateOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: DateOverrides = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === null) out[k] = null;
    else if (typeof v === "string" && v.length > 0) out[k] = v;
  }
  return out;
}

export function shortDayLabel(name: string) {
  const n = name.trim();
  if (n === "Push A") return "PuA";
  if (n === "Push B") return "PuB";
  if (n === "Pull A") return "PlA";
  if (n === "Pull B") return "PlB";
  if (n === "Legs & Back/Arm Pump") return "Hyb";
  if (n === "Leg Day A") return "LgA";
  if (n === "Leg Day B") return "LgB";
  if (n.startsWith("Day 1")) return "D1";
  if (n.startsWith("Day 2")) return "D2";
  if (n.startsWith("Day 3")) return "D3";
  if (n.startsWith("Day 5")) return "D5";
  if (n.startsWith("Day 6")) return "D6";
  if (n.startsWith("Upper A")) return "UpA";
  if (n.startsWith("Upper B")) return "UpB";
  if (n.startsWith("Lower A")) return "LoA";
  if (n.startsWith("Lower B")) return "LoB";
  if (n.startsWith("Optional Day 5")) return "Opt5";
  if (n.startsWith("Arms")) return "Arm";
  if (n === "Lower Anterior" || n === "Lower Anterior B") return "LA";
  if (n === "Back" || n === "Back B") return "Bk";
  if (n === "Chest" || n === "Chest B") return "Ch";
  if (n === "Arms / Shoulders" || n === "Arms / Shoulders B") return "A/S";
  if (n === "Posterior Lower" || n === "Posterior Lower B") return "PL";
  if (n === "Rest" || n === "Rest day") return "R";
  if (n === "Chest & Triceps") return "C/T";
  if (n === "Back & Biceps") return "B/B";
  if (n === "Legs") return "Lg";
  if (n === "Shoulders & Abs") return "Sh";
  if (n === "Back & Rear Delts") return "Bk";
  if (n === "Arms & Calves") return "Ar";
  if (n === "Upper") return "U";
  if (n === "Lower") return "L";
  return n
    .replace("Upper", "U")
    .replace("Lower", "L")
    .replace("Chest", "C")
    .replace("Back", "B")
    .replace("Shoulders", "S")
    .replace("Arms", "A")
    .slice(0, 4);
}

/**
 * Resolve scheduled workout for a calendar date.
 * 1) date override  2) weekly slots  3) legacy ROTATION by name
 */
export function resolveScheduledDay(
  date: Date,
  slots: ScheduleSlots | null,
  days: { id: string; name: string; subtitle?: string }[],
  overrides: DateOverrides | null = null
): { id: string; name: string; subtitle: string } | null {
  const key = dateKey(date);

  if (overrides && Object.prototype.hasOwnProperty.call(overrides, key)) {
    const id = overrides[key];
    if (!id) return null;
    const day = days.find((d) => d.id === id);
    if (!day) return null;
    return {
      id: day.id,
      name: day.name,
      subtitle: day.subtitle ?? "",
    };
  }

  if (slots) {
    const id = slots[date.getDay()];
    if (!id) return null;
    const day = days.find((d) => d.id === id);
    if (!day) return null;
    return {
      id: day.id,
      name: day.name,
      subtitle: day.subtitle ?? "",
    };
  }

  const todayName = scheduledWorkoutName(date);
  if (!todayName) return null;
  const day = days.find((d) => d.name === todayName);
  if (!day) return null;
  return {
    id: day.id,
    name: day.name,
    subtitle: day.subtitle ?? "",
  };
}

/** Label only (even if library day missing) — for coach brief / “coming soon”. */
export function resolveScheduledLabel(
  date: Date,
  slots: ScheduleSlots | null,
  days: { id: string; name: string }[],
  overrides: DateOverrides | null = null
): string | null {
  const key = dateKey(date);
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, key)) {
    const id = overrides[key];
    if (!id) return null;
    const day = days.find((d) => d.id === id);
    return day ? day.name : "Missing day";
  }

  const resolved = resolveScheduledDay(date, slots, days, null);
  if (resolved) return resolved.name;
  if (slots) {
    const id = slots[date.getDay()];
    if (!id) return null;
    return "Missing day";
  }
  return scheduledWorkoutName(date);
}

/** Seed slots from legacy ROTATION + current library (by name). */
export function seedSlotsFromRotation(
  days: { id: string; name: string }[]
): ScheduleSlots {
  const slots: ScheduleSlots = [...EMPTY_SLOTS];
  const ref = new Date("2026-07-19T12:00:00"); // Sunday
  for (let i = 0; i < 7; i++) {
    const d = new Date(ref);
    d.setDate(ref.getDate() + i);
    const name = scheduledWorkoutName(d);
    if (!name) {
      slots[i] = null;
      continue;
    }
    const match = days.find((x) => x.name === name);
    slots[i] = match?.id ?? null;
  }
  return slots;
}

/** Derrick Recomp — 4-day Upper/Lower starting Tuesday:
 * Sun Rest · Mon Rest · Tue Upper A · Wed Lower A · Thu Rest · Fri Upper B · Sat Lower B
 * Optional Day 5 stays in library for makeup only.
 */
export function seedDerrickRecompSlots(
  days: { id: string; name: string }[]
): ScheduleSlots {
  const idFor = (...names: string[]) => {
    for (const name of names) {
      const hit = days.find((d) => d.name === name);
      if (hit) return hit.id;
    }
    return null;
  };
  return [
    null,
    null,
    idFor("Upper A · Horizontal Strength"),
    idFor("Lower A · Squat Emphasis"),
    null,
    idFor("Upper B · Vertical Pull + Shoulders"),
    idFor("Lower B · Hinge + Single-Leg"),
  ];
}

/** PPL Aesthetics — Sun Rest · Mon Push A · Tue Pull A · Wed hybrid · Thu Push B · Fri Pull B · Sat Rest */
export function seedPplAestheticsSlots(
  days: { id: string; name: string }[]
): ScheduleSlots {
  const idFor = (name: string) => days.find((d) => d.name === name)?.id ?? null;
  return [
    null,
    idFor("Push A"),
    idFor("Pull A"),
    idFor("Legs & Back/Arm Pump"),
    idFor("Push B"),
    idFor("Pull B"),
    null,
  ];
}

/**
 * Elevate Challenge — Friday start (Day 1).
 * Sun D3 Chest · Mon D4 Rest · Tue D5 Arms · Wed D6 Posterior · Thu D7 Rest · Fri D1 Lower Anterior · Sat D2 Back
 */
export function seedElevateChallengeSlots(
  days: { id: string; name: string }[],
  week: "A" | "B" = "A"
): ScheduleSlots {
  const idFor = (...names: string[]) => {
    for (const name of names) {
      const hit = days.find((d) => d.name === name);
      if (hit) return hit.id;
    }
    return null;
  };
  if (week === "B") {
    return [
      idFor("Day 3 · Chest B", "Chest B"),
      null,
      idFor("Day 5 · Arms / Shoulders B", "Arms / Shoulders B"),
      idFor("Day 6 · Posterior Lower B", "Posterior Lower B"),
      null,
      idFor("Day 1 · Lower Anterior B", "Lower Anterior B"),
      idFor("Day 2 · Back B", "Back B"),
    ];
  }
  return [
    idFor("Day 3 · Chest", "Chest"),
    null,
    idFor("Day 5 · Arms / Shoulders", "Arms / Shoulders"),
    idFor("Day 6 · Posterior Lower", "Posterior Lower"),
    null,
    idFor("Day 1 · Lower Anterior", "Lower Anterior"),
    idFor("Day 2 · Back", "Back"),
  ];
}

/** @deprecated use seedPplAestheticsSlots */
export function seedUpperLowerSlots(
  days: { id: string; name: string }[]
): ScheduleSlots {
  const idFor = (name: string) => days.find((d) => d.name === name)?.id ?? null;
  return [
    null,
    idFor("Upper A"),
    idFor("Lower A"),
    idFor("Upper B"),
    null,
    idFor("Lower B"),
    idFor("Upper C"),
  ];
}

/** @deprecated use seedUpperLowerSlots */
export function seedPplSlots(days: { id: string; name: string }[]): ScheduleSlots {
  return seedUpperLowerSlots(days);
}

export function slotsAreEmpty(slots: ScheduleSlots | null | undefined) {
  if (!slots) return true;
  return slots.every((s) => !s);
}
