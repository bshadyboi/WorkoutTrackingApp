import type { WorkoutTemplate } from "@/lib/workouts";
import { UPPER_PREHAB } from "@/lib/derrickRecomp";

/**
 * NT Coaching Split — six days, from Brandon's coach, starting Mon Sep 21 2026.
 *
 * Three identical upper days and two identical lower days: the variation comes
 * from beating last week's numbers, not from rotating exercises. Every upper
 * day opens with the physical therapist's cuff work and 25 minutes on the
 * stairmaster, and Sunday is that stairmaster on its own.
 *
 * Day names carry the program's initials so they never collide with the other
 * programs in the library. Exercise names deliberately match the shared
 * catalogue where the movement is the same, because set history, form videos
 * and swap suggestions are all keyed by exercise name.
 */

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

export const NT_START = "2026-09-21";

const STAIRMASTER = work(
  "Stairmaster (Level 6)",
  "Cardio",
  1,
  "25 min",
  "Level 6 · warm-up, not a finisher"
);

/** Upper A, B and C are the same session. */
const UPPER_WORK: WorkoutTemplate["exercises"] = [
  STAIRMASTER,
  work(
    "Incline Chest Press",
    "Upper Chest",
    2,
    "6–10",
    "Left shoulder: neutral grip or machine if it pinches"
  ),
  work("Pec Deck", "Chest", 2, "10–12"),
  work("T-Bar Row", "Back", 2, "8–12"),
  work("Lat Pulldown", "Lats", 2, "10–12"),
  work("Machine Lateral Raise", "Side Delts", 2, "12–15", "One arm at a time when the machine allows"),
  work("Rear Delt Fly", "Rear Delts", 2, "12–15"),
  work("Single Arm Tricep Pushdown", "Triceps", 2, "10–12", "Per arm"),
  work("Preacher Curl", "Biceps", 2, "10–12"),
];

/** Lower A and B are the same session. */
const LOWER_WORK: WorkoutTemplate["exercises"] = [
  work("Hack Squat", "Quads", 2, "8–12"),
  work("Leg Extension", "Quads", 2, "10–12"),
  work("Lying Leg Curl", "Hamstrings", 2, "10–12"),
  work("Romanian Deadlift", "Hamstrings", 3, "8–12", "Dumbbell or barbell"),
  work("Seated Calf Raise", "Calves", 2, "12–20"),
  work("Hip Abductor Machine", "Glutes", 2, "12–15"),
  work("Cable Crunch", "Core", 2, "12–20", "Finisher · swap for hanging leg raises"),
];

function upper(name: string): WorkoutTemplate {
  return {
    name,
    subtitle: "Chest, back, delts & arms",
    exercises: [...UPPER_PREHAB, ...UPPER_WORK],
  };
}

function lower(name: string): WorkoutTemplate {
  return { name, subtitle: "Quads, hamstrings, calves & core", exercises: [...LOWER_WORK] };
}

export const NT_WORKOUTS: WorkoutTemplate[] = [
  upper("NT Upper A"),
  lower("NT Lower A"),
  upper("NT Upper B"),
  lower("NT Lower B"),
  upper("NT Upper C"),
  {
    name: "NT Active Recovery",
    subtitle: "Stairmaster only",
    exercises: [STAIRMASTER],
  },
];

/** Calendar labels Sun→Sat. */
export const NT_WEEKLY_LABELS = [
  "Sun · Active Recovery",
  "Mon · Upper A",
  "Tue · Lower A",
  "Wed · Rest",
  "Thu · Upper B",
  "Fri · Lower B",
  "Sat · Upper C",
] as const;

export const NT_TIP =
  "Upper A → Lower A → Rest → Upper B → Lower B → Upper C → Active recovery. " +
  "The upper days are identical on purpose: the progression is beating last week's reps or weight, so log every set. " +
  "Cuff prehab before upper work, 25 min stairmaster at level 6 to warm up, 10–12k steps every day, progress photos every two weeks.";
