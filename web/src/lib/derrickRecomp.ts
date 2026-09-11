import type { WorkoutTemplate } from "@/lib/workouts";

function work(
  name: string,
  muscle: string,
  sets: number,
  reps: string,
  notes?: string
): WorkoutTemplate["exercises"][number] {
  return {
    name,
    muscle,
    defaultSets: sets,
    hasCrownSet: false,
    crownRepRange: "",
    workingRepRange: `${sets}×${reps}`,
    notes,
  };
}

/** Prehab block — log lightly; 8–12 min before every upper day. */
const UPPER_PREHAB: WorkoutTemplate["exercises"] = [
  work("Band Pull-Aparts", "Rear Delts", 2, "15–20", "Prehab · 8–12 min block"),
  work("Face Pulls + External Rotation", "Rear Delts", 2, "12–15", "Prehab"),
  work("Prone Y / T Raise", "Rear Delts", 2, "10–12", "Prehab"),
  work("Side-Lying External Rotation", "Rear Delts", 2, "12–15", "Prehab · per side"),
  work("Scapular Wall Slides", "Shoulders", 2, "10–12", "Prehab"),
];

/**
 * Derrick Recomp Split — 8 weeks (Sep 8 → Nov 2).
 * 5 training days · Wed/Sun off · 2:1 pull-to-press bias · prehab on upper days.
 * Baseline: 2500 kcal · 185P / 280C / 70F · 10–12k steps.
 */
export const DERRICK_RECOMP_WEEKS = 8;
export const DERRICK_RECOMP_START = "2026-09-08";
export const DERRICK_RECOMP_END = "2026-11-02";
export const DERRICK_CHECKPOINT_WEEK = 3; // ~Sep 29 from Tue start

export const DERRICK_RECOMP_BASELINE = {
  target_calories: 2500,
  target_protein: 185,
  target_carbs: 280,
  target_fats: 70,
  steps_low: 10000,
  steps_high: 12000,
} as const;

export const DERRICK_RECOMP_WORKOUTS: WorkoutTemplate[] = [
  {
    name: "Upper A · Horizontal Strength",
    subtitle: "Derrick Recomp · horizontal press/pull + arms",
    exercises: [
      ...UPPER_PREHAB,
      work("DB Floor Press (Neutral)", "Chest", 4, "6–10", "1–3 RIR · add reps before load"),
      work("Chest-Supported DB Row", "Back", 4, "8–12", "1–3 RIR"),
      work("Machine / Cable Chest Press", "Chest", 3, "8–12"),
      work("1-Arm Cable / DB Row", "Back", 3, "10–12", "Per arm"),
      work("Lateral Raise", "Side Delts", 3, "12–15"),
      work("Face Pull", "Rear Delts", 3, "15–20"),
      work("Triceps Pushdown", "Triceps", 3, "10–15"),
    ],
  },
  {
    name: "Lower A · Squat Emphasis",
    subtitle: "Derrick Recomp · squat pattern + posterior",
    exercises: [
      work("Goblet / Safety-Bar / Hack Squat", "Quads", 4, "6–10", "1–3 RIR · add reps before load"),
      work("RDL", "Hamstrings", 3, "8–12", "1–3 RIR"),
      work("Walking Lunge / Split Squat", "Quads", 3, "8–10", "Per leg"),
      work("Leg Curl", "Hamstrings", 3, "10–15"),
      work("Calf Raise", "Calves", 3, "10–15"),
      work("Dead Bug / Pallof Press", "Core", 3, "8–12"),
    ],
  },
  {
    name: "Upper B · Vertical Pull + Shoulders",
    subtitle: "Derrick Recomp · vertical pull + shoulders",
    exercises: [
      ...UPPER_PREHAB,
      work("Neutral Pulldown / Assisted Chin", "Lats", 4, "6–10", "1–3 RIR · add reps before load"),
      work("Seated Cable Row", "Back", 4, "8–12", "1–3 RIR"),
      work("Landmine Press / 30° Incline DB Press", "Shoulders", 3, "8–12"),
      work("Rear-Delt Fly", "Rear Delts", 3, "12–15"),
      work("Lateral Raise", "Side Delts", 3, "12–15"),
      work("Hammer Curl", "Biceps", 3, "8–12"),
      work("Farmer / Suitcase Carry", "Core", 3, "30–40m", "Per set distance"),
    ],
  },
  {
    name: "Lower B · Hinge + Single-Leg",
    subtitle: "Derrick Recomp · hinge + unilateral",
    exercises: [
      work("Trap-Bar Deadlift / DB RDL", "Hamstrings", 4, "5–8", "1–3 RIR · add reps before load"),
      work("Leg Press", "Quads", 3, "8–12"),
      work("Bulgarian Split Squat", "Quads", 3, "8–10", "Per leg"),
      work("Hip Thrust / Glute Bridge", "Glutes", 3, "8–12"),
      work("Leg Extension", "Quads", 3, "10–15"),
      work("Hanging Knee Raise / Cable Crunch", "Core", 3, "8–15"),
    ],
  },
  {
    name: "Optional Day 5 · Arms & Delts",
    subtitle: "Derrick Recomp · optional accessory day (skip anytime)",
    exercises: [
      work("Overhead Rope / DB Extension", "Triceps", 3, "10–15"),
      work("Cable Pushdown", "Triceps", 3, "10–15"),
      work("Rear Delt Fly / Face Pull", "Rear Delts", 3, "12–20"),
      work("Lateral Raise", "Side Delts", 3, "12–15"),
      work("Hammer Curl", "Biceps", 2, "10–12"),
      work("Incline DB Curl", "Biceps", 2, "10–12"),
    ],
  },
];

/** Calendar labels Sun→Sat. Core 4-day: Tue Upper A · Wed Lower A · Fri Upper B · Sat Lower B */
export const DERRICK_RECOMP_WEEKLY_LABELS = [
  "Sun · Rest",
  "Mon · Rest (Optional Day 5 available)",
  "Tue · Upper A · Horizontal",
  "Wed · Lower A · Squat",
  "Thu · Rest",
  "Fri · Upper B · Vertical + Shoulders",
  "Sat · Lower B · Hinge + SL",
] as const;

export const DERRICK_RECOMP_TIP =
  "4-day Upper/Lower (Tue start): Upper A → Lower A → Rest → Upper B → Lower B → Rest ×2. " +
  "Optional Day 5 (Arms & Delts) is available anytime via Makeup — not required. " +
  "8 weeks from Sep 8. Baseline 2500 · 185P/280C/70F · 10–12k steps. " +
  "Add reps before weight · 1–3 RIR. Week 1 glycogen bump is normal. " +
  "From Week 3: weekly waist + strength check adjusts calories.";

/** Old template name cleaned up on re-apply */
export const LEGACY_DERRICK_DAY_NAMES = ["Arms & Delts · Accessory"];

/** Week number 1–10 from program start (local date key YYYY-MM-DD). */
export function derrickRecompWeek(asOfKey: string): number {
  const start = new Date(`${DERRICK_RECOMP_START}T12:00:00`);
  const asOf = new Date(`${asOfKey}T12:00:00`);
  const days = Math.floor((asOf.getTime() - start.getTime()) / 86400000);
  if (days < 0) return 0;
  return Math.min(DERRICK_RECOMP_WEEKS, Math.floor(days / 7) + 1);
}

export type WeekGuidance = {
  /** Short phase name for the header chip. */
  phase: string;
  /** What to do differently this week, in the lifter's terms. */
  note: string;
  /** True during the planned deload, which the UI calls out rather than hides. */
  deload: boolean;
};

/**
 * How hard to push, by week. The written plan ramps effort rather than holding
 * it flat: learn the positions well short of failure, spend the middle weeks
 * adding reps, take a lighter week, then push closest to failure at the end.
 * None of this reached the app before — the per-exercise RIR note is not
 * persisted to workout_exercises, so it was never shown anywhere.
 */
export function derrickRecompGuidance(week: number): WeekGuidance | null {
  if (week < 1 || week > DERRICK_RECOMP_WEEKS) return null;

  if (week <= 2) {
    return {
      phase: "Learn the positions",
      note: "Stay 3 reps in reserve — stop well short of failure while the positions are new. Film a set of floor press and rows.",
      deload: false,
    };
  }
  if (week <= 5) {
    return {
      phase: "Build",
      note: "Add 1–2 reps per set until the top of the range, then add the smallest plate and drop reps back. Keep 1–3 in reserve on compounds.",
      deload: false,
    };
  }
  if (week === 6) {
    return {
      phase: "Deload week",
      note: "Optional lighter week: cut your sets by about 40% and keep the loads moderate. Same exercises, less work — it lets fatigue clear so weeks 7–8 land harder.",
      deload: true,
    };
  }
  return {
    phase: "Push",
    note: "Push closer to 1–2 reps in reserve — but only on lifts that are completely pain-free. Anything that pinches stays where it is.",
    deload: false,
  };
}

export type RecompDecision = {
  condition: "A" | "B" | "C";
  calorieDelta: number;
  message: string;
};

/**
 * Checkpoint rules (Week 3+):
 * A — waist stable/down AND strength climbing → no change
 * B — waist climbing → −200 kcal
 * C — waist down BUT strength falling → +150 kcal + recovery prompt
 */
export function evaluateRecompCheckin(input: {
  waistTrend: "down" | "stable" | "up";
  strengthTrend: "climbing" | "flat" | "falling";
}): RecompDecision {
  if (input.waistTrend === "up") {
    return {
      condition: "B",
      calorieDelta: -200,
      message:
        "Waist climbing — possible excess fat or water. Cutting 200 kcal from daily target.",
    };
  }
  if (input.waistTrend === "down" && input.strengthTrend === "falling") {
    return {
      condition: "C",
      calorieDelta: 150,
      message:
        "Waist down but top-set strength falling — likely undereating. Adding 150 kcal. Check sleep & recovery.",
    };
  }
  return {
    condition: "A",
    calorieDelta: 0,
    message: "Waist stable/down and strength holding or climbing — recomp is working. No change.",
  };
}

/** Apply calorie delta: keep protein/fat, shift carbs by ~4 kcal/g. */
export function applyCalorieDelta(
  current: {
    target_calories: number;
    target_protein: number;
    target_carbs: number;
    target_fats: number;
  },
  delta: number
) {
  if (!delta) return { ...current };
  const nextCal = Math.max(1800, current.target_calories + delta);
  const carbDelta = Math.round(delta / 4);
  return {
    target_calories: nextCal,
    target_protein: current.target_protein,
    target_carbs: Math.max(150, current.target_carbs + carbDelta),
    target_fats: current.target_fats,
  };
}
