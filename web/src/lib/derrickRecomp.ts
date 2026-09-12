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
 * Program block — 8 weeks (Sep 14 → Nov 8).
 * 5 training days · Wed/Sun off · 2:1 pull-to-press bias · prehab on upper days.
 * Baseline: 2500 kcal · 185P / 280C / 70F · 10–12k steps.
 */
export const DERRICK_RECOMP_WEEKS = 8;
export const DERRICK_RECOMP_START = "2026-09-14";
export const DERRICK_RECOMP_END = "2026-11-08";
export const DERRICK_CHECKPOINT_WEEK = 3; // Sep 28

export const DERRICK_RECOMP_BASELINE = {
  target_calories: 2500,
  target_protein: 185,
  target_carbs: 280,
  target_fats: 70,
  steps_low: 10000,
  steps_high: 12000,
} as const;

/**
 * Shoulder-Safe Aesthetics — Adam Yu's Aesthetics Blueprint push/pull/legs
 * structure and delt priority, run under Derrick's shoulder rules: no barbell
 * bench, wide-grip pulls, overhead barbell pressing or back squats; neutral
 * grips; more pulling than pressing; prehab before every upper day.
 *
 * Names match the previous Upper/Lower days wherever the movement is the same,
 * because set history is keyed by exercise name — renaming a lift would start
 * its "last time" numbers over. Isolation work carries "to failure" in the rep
 * text so the logger shows it; compounds follow the phase RIR on the Train tab.
 */
export const DERRICK_RECOMP_WORKOUTS: WorkoutTemplate[] = [
  {
    name: "Push A · Chest, Delts & Triceps",
    subtitle: "Shoulder-Safe Aesthetics · incline chest + side delts",
    exercises: [
      ...UPPER_PREHAB,
      work("30° Incline DB Press (Neutral)", "Upper Chest", 4, "6–10"),
      work("DB Floor Press (Neutral)", "Chest", 3, "8–12"),
      work("Landmine Press", "Shoulders", 3, "8–10"),
      work("Lateral Raise", "Side Delts", 4, "10–15 · to failure"),
      work("Face Pull", "Rear Delts", 3, "15–20 · to failure"),
      work("Triceps Pushdown", "Triceps", 4, "12–15 · to failure"),
    ],
  },
  {
    name: "Pull A · Back Width & Biceps",
    subtitle: "Shoulder-Safe Aesthetics · lats + biceps",
    exercises: [
      ...UPPER_PREHAB,
      work("Neutral Pulldown / Assisted Chin", "Lats", 4, "8–10"),
      work("Chest-Supported T-Bar Row", "Back", 4, "8–10"),
      work("Seated Cable Row", "Back", 3, "10–12"),
      work("Straight-Arm Pulldown", "Lats", 3, "12–15 · to failure"),
      work("EZ-Bar Curl", "Biceps", 4, "8–10 · to failure"),
      work("Incline DB Curl", "Biceps", 3, "10–12 · to failure"),
    ],
  },
  {
    name: "Legs + Pump · One Hard Leg Day",
    subtitle: "Shoulder-Safe Aesthetics · legs, back & arms",
    exercises: [
      work("Hack Squat", "Quads", 3, "6–10"),
      work("RDL", "Hamstrings", 3, "8–10"),
      work("Leg Extension", "Quads", 3, "10–12 · to failure"),
      work("Calf Raise", "Calves", 3, "10–15 · to failure"),
      work("Chest-Supported DB Row", "Back", 3, "10–12"),
      work("Hammer Curl", "Biceps", 3, "10–12 · to failure"),
      work("Overhead Rope Extension", "Triceps", 3, "12–15 · to failure"),
    ],
  },
  {
    name: "Push B · Delts & Triceps Volume",
    subtitle: "Shoulder-Safe Aesthetics · incline press + delt volume",
    exercises: [
      ...UPPER_PREHAB,
      work("Incline Machine / Cable Chest Press", "Upper Chest", 3, "8–12"),
      work("Cable Fly (Short of Stretch)", "Chest", 2, "12–15 · to failure"),
      work("One-Arm Cable Lateral Raise", "Side Delts", 4, "12–15 · to failure"),
      work("Rear-Delt Fly", "Rear Delts", 3, "12–15 · to failure"),
      work("Overhead Rope Extension", "Triceps", 4, "12–15 · to failure"),
    ],
  },
  {
    name: "Pull B · Back Thickness & Arms",
    subtitle: "Shoulder-Safe Aesthetics · rows + rear delts + arms",
    exercises: [
      ...UPPER_PREHAB,
      work("Chest-Supported DB Row", "Back", 4, "10–12"),
      work("Single-Arm Pulldown", "Lats", 3, "10–12"),
      work("Face Pull", "Rear Delts", 4, "15–20 · to failure"),
      work("Hammer Curl", "Biceps", 3, "10–12 · to failure"),
      work("Preacher Curl", "Biceps", 3, "15–20 · to failure"),
    ],
  },
];

/** Calendar labels Sun→Sat. */
export const DERRICK_RECOMP_WEEKLY_LABELS = [
  "Sun · Rest",
  "Mon · Push A",
  "Tue · Pull A",
  "Wed · Legs + Pump",
  "Thu · Rest",
  "Fri · Push B",
  "Sat · Pull B",
] as const;

export const DERRICK_RECOMP_TIP =
  "5 days: Push A → Pull A → Legs + Pump → Rest → Push B → Pull B → Rest. " +
  "Shoulder prehab before every upper day. To failure on isolation work; follow the week's RIR on presses, rows and squats.";

/**
 * Days from earlier layouts of this program. Removing them only clears the
 * workout library — logged sessions store the day's name, not a link to the
 * day, so history is untouched.
 */
export const LEGACY_DERRICK_DAY_NAMES = [
  "Arms & Delts · Accessory",
  "Upper A · Horizontal Strength",
  "Lower A · Squat Emphasis",
  "Upper B · Vertical Pull + Shoulders",
  "Lower B · Hinge + Single-Leg",
  "Optional Day 5 · Arms & Delts",
];

/** Week number 1–8 from program start (local date key YYYY-MM-DD). */
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
