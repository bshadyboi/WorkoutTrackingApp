import type { WorkoutTemplate } from "@/lib/workouts";

function work(
  name: string,
  muscle: string,
  sets: number,
  reps: string,
  extra?: string
): WorkoutTemplate["exercises"][number] {
  const range = extra
    ? `${sets}×${reps} · ${extra}`
    : `${sets}×${reps}`;
  return {
    name,
    muscle,
    defaultSets: sets,
    hasCrownSet: false,
    crownRepRange: "",
    workingRepRange: range,
  };
}

/** Tempo format: eccentric / pause / concentric / pause (X = explosive). */
function tempo(
  name: string,
  muscle: string,
  sets: number,
  reps: string,
  tempoStr: string,
  extra?: string
) {
  const bits = [`Tempo ${tempoStr}`, extra].filter(Boolean).join(" · ");
  return work(name, muscle, sets, reps, bits);
}

/**
 * Elevate Challenge (Chris Bumstead) — Week A (odd weeks 1/3/5).
 * Calendar starts Friday (Day 1) so Thursday is rest from the previous split.
 * Fri D1 Lower Anterior · Sat D2 Back · Sun D3 Chest · Mon D4 Rest · Tue D5 Arms · Wed D6 Posterior · Thu D7 Rest
 */
export const ELEVATE_WEEK_A: WorkoutTemplate[] = [
  {
    name: "Day 1 · Lower Anterior",
    subtitle: "Elevate · quads, glutes, hamstrings, core",
    exercises: [
      tempo("Smith Machine Back Squat", "Quads", 4, "10", "4/0/X/0"),
      tempo("DB Bulgarian Split Squat", "Quads", 4, "12", "3/0/1/0", "Per leg"),
      tempo("Leg Press Narrow Stance", "Quads", 3, "15", "3/0/2/0"),
      work("DB Walking Lunges", "Quads", 1, "AMRAP", "Burnout · ∞"),
    ],
  },
  {
    name: "Day 2 · Back",
    subtitle: "Elevate · back & biceps",
    exercises: [
      tempo("Overhand Lat Pulldown", "Lats", 4, "10", "4/0/X/0"),
      tempo("Chest Supported T-Bar Row", "Back", 4, "12", "3/1/X/0"),
      tempo("Cable Rope Pullover", "Lats", 3, "15", "2/1/1/1"),
      work("Medium Grip Chin Up", "Lats", 1, "AMRAP", "Burnout · ∞"),
    ],
  },
  {
    name: "Day 3 · Chest",
    subtitle: "Elevate · chest, shoulders, arms",
    exercises: [
      tempo("Hammer Strength Flat Chest Press", "Chest", 4, "10", "4/0/X/0"),
      tempo("Incline Pronated DB Bench Press", "Upper Chest", 4, "12", "3/1/X/0"),
      tempo("Cable Chest Fly — Mid", "Chest", 3, "15", "2/1/1/1"),
      work(
        "Hammer Strength Incline Chest Press",
        "Upper Chest",
        3,
        "12",
        "36 total reps"
      ),
    ],
  },
  {
    name: "Day 5 · Arms / Shoulders",
    subtitle: "Elevate · arms, shoulders, forearms",
    exercises: [
      tempo(
        "Incline DB Skull Crushers",
        "Triceps",
        4,
        "10",
        "4/0/X/0",
        "SS w/ EZ Curl"
      ),
      tempo(
        "EZ-Bar Curl Medium Semi-Supinated Grip",
        "Biceps",
        4,
        "10",
        "4/0/X/0",
        "SS w/ Skull Crushers"
      ),
      tempo(
        "Barbell Medium Grip Military Press",
        "Shoulders",
        4,
        "12",
        "3/1/X/0",
        "SS w/ Scott Curl"
      ),
      tempo(
        "Single Arm Neutral DB Scott Curl",
        "Biceps",
        4,
        "12",
        "3/1/1/0",
        "SS w/ Military · per arm"
      ),
      tempo(
        "Seated Dip Machine",
        "Triceps",
        3,
        "15",
        "3/0/X/0",
        "SS w/ Incline Curls"
      ),
      tempo(
        "Incline Supinated DB Curls",
        "Biceps",
        3,
        "15",
        "3/0/1/0",
        "SS w/ Dip Machine"
      ),
      tempo("Standing Side Lateral Raise Machine", "Side Delts", 3, "15", "3/0/1/0"),
    ],
  },
  {
    name: "Day 6 · Posterior Lower",
    subtitle: "Elevate · glutes, hamstrings, lower back",
    exercises: [
      tempo("Barbell RDL", "Hamstrings", 4, "10", "4/0/X/0"),
      tempo(
        "Lying Leg Curl — Neutral (Dorsiflexed)",
        "Hamstrings",
        4,
        "12",
        "3/0/1/0"
      ),
      tempo("Pendulum Squat Medium Stance", "Quads", 3, "15", "3/0/2/0"),
      work("Back Extension", "Lower Back", 1, "AMRAP", "Burnout · ∞"),
    ],
  },
];

/**
 * Elevate Challenge — Week B (even weeks 2/4/6). Alternate exercise selection.
 */
export const ELEVATE_WEEK_B: WorkoutTemplate[] = [
  {
    name: "Day 1 · Lower Anterior B",
    subtitle: "Elevate even week · quads emphasis",
    exercises: [
      tempo("Smith Machine Front Squat", "Quads", 4, "10", "4/0/X/0"),
      tempo(
        "Front Foot Elevated DB Split Squat",
        "Quads",
        4,
        "12",
        "3/0/1/0",
        "Per leg"
      ),
      tempo("Leg Press Wide Stance", "Quads", 3, "15", "3/0/2/0"),
      work("Leg Extensions", "Quads", 6, "15/AMRAP", "15, ∞, ∞, 15, ∞, ∞"),
    ],
  },
  {
    name: "Day 2 · Back B",
    subtitle: "Elevate even week · back thickness",
    exercises: [
      tempo(
        "Seated Semi-Supinated Close Grip Cable Row",
        "Back",
        4,
        "10",
        "4/0/X/0"
      ),
      tempo("Underhand Lat Pulldown", "Lats", 4, "12", "3/0/X/1"),
      tempo(
        "Single Arm Hammer Strength Neutral Row",
        "Back",
        3,
        "15",
        "2/1/1/1",
        "Per arm"
      ),
      work(
        "Cross Body Rear Delt Cable Fly",
        "Rear Delts",
        6,
        "15/AMRAP",
        "15, ∞, ∞, 15, ∞, ∞"
      ),
    ],
  },
  {
    name: "Day 3 · Chest B",
    subtitle: "Elevate even week · chest volume",
    exercises: [
      tempo("Smith Machine Incline Bench Press", "Upper Chest", 4, "10", "4/0/X/0"),
      tempo("Decline Pronated DB Chest Press", "Chest", 4, "12", "3/1/X/0"),
      tempo("Pec Deck", "Chest", 3, "15", "3/0/1/1"),
      work(
        "Flat Pronated DB Bench Press",
        "Chest",
        6,
        "12/AMRAP",
        "12, ∞, ∞, 12, ∞, ∞"
      ),
    ],
  },
  {
    name: "Day 5 · Arms / Shoulders B",
    subtitle: "Elevate even week · arms & delts",
    exercises: [
      tempo(
        "Decline DB Skull Crushers",
        "Triceps",
        4,
        "10",
        "4/0/X/0",
        "SS w/ Underhand Pulldown"
      ),
      tempo(
        "Underhand Lat Pulldown",
        "Lats",
        4,
        "10",
        "2/1/X/1",
        "SS w/ Skull Crushers"
      ),
      tempo(
        "Cable Rope French Press",
        "Triceps",
        4,
        "12",
        "3/0/X/0",
        "SS w/ Rope Hammer Curl"
      ),
      tempo(
        "Cable Rope Hammer Curl",
        "Biceps",
        4,
        "12",
        "4/0/1/0",
        "SS w/ French Press"
      ),
      tempo(
        "Straight Bar Cable Pushdown",
        "Triceps",
        3,
        "15",
        "2/0/1/1",
        "SS w/ Incline Hammer Curls"
      ),
      tempo(
        "Incline DB Hammer Curls",
        "Biceps",
        3,
        "15",
        "3/0/1/0",
        "SS w/ Pushdowns"
      ),
      tempo("Standing DB Side Lateral Raise", "Side Delts", 3, "15", "3/0/1/0"),
    ],
  },
  {
    name: "Day 6 · Posterior Lower B",
    subtitle: "Elevate even week · posterior chain",
    exercises: [
      tempo(
        "Lying Leg Curl — Neutral (Dorsiflexed)",
        "Hamstrings",
        4,
        "10",
        "4/0/X/0"
      ),
      tempo("Barbell Walking Lunges", "Quads", 4, "12", "3/0/1/0", "Per leg"),
      tempo("Machine Hip Thrust", "Glutes", 3, "15", "3/0/2/0"),
      work("Leg Press Wide Stance", "Quads", 3, "12", "36 total reps"),
    ],
  },
];

export const ELEVATE_ALL_WORKOUTS: WorkoutTemplate[] = [
  ...ELEVATE_WEEK_A,
  ...ELEVATE_WEEK_B,
];

/** Calendar labels Sun→Sat. Program clock starts Friday = Day 1. */
export const ELEVATE_WEEKLY_LABELS = [
  "Sun · Day 3 · Chest",
  "Mon · Day 4 · Rest",
  "Tue · Day 5 · Arms / Shoulders",
  "Wed · Day 6 · Posterior Lower",
  "Thu · Day 7 · Rest",
  "Fri · Day 1 · Lower Anterior",
  "Sat · Day 2 · Back",
] as const;

export const ELEVATE_PROGRESSION_NOTE =
  "Starts Friday as Day 1 (Thursday is rest). " +
  "Weeks 1/3/5 = A days · Weeks 2/4/6 = B days. " +
  "Progression: W3/4 drop reps one notch + ∞ on B series; W5/6 drop again + two ∞ sets.";

/** Unlabeled names from the first Elevate seed — cleaned up on re-apply. */
export const LEGACY_ELEVATE_DAY_NAMES = [
  "Lower Anterior",
  "Back",
  "Chest",
  "Arms / Shoulders",
  "Posterior Lower",
  "Lower Anterior B",
  "Back B",
  "Chest B",
  "Arms / Shoulders B",
  "Posterior Lower B",
];
