export type WorkoutTemplate = {
  name: string;
  subtitle: string;
  exercises: {
    name: string;
    muscle: string;
    defaultSets: number;
    hasCrownSet: boolean;
    crownRepRange: string;
    workingRepRange: string;
    notes?: string;
  }[];
};

function work(
  name: string,
  muscle: string,
  sets: number,
  reps: string,
  notes?: string
) {
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

/** Feeder sets are logged as warm-ups (tap W on set #). Notes describe the ramp. */
function feederWork(
  name: string,
  muscle: string,
  workingSets: number,
  reps: string,
  feeders: number,
  intensity: string
) {
  const feederNote =
    feeders === 1
      ? "1 feeder set"
      : `${feeders} feeder sets`;
  return work(
    name,
    muscle,
    workingSets,
    reps,
    `${feederNote} → ${workingSets} working · ${intensity}`
  );
}

/**
 * PPL: Aesthetics Blueprint — 5-day split + optional leg-day swaps.
 * Mon Push A · Tue Pull A · Wed Legs hybrid · Thu Rest · Fri Push B · Sat Pull B · Sun Rest
 */
export const BUILT_IN_WORKOUTS: WorkoutTemplate[] = [
  {
    name: "Push A",
    subtitle: "Mon · chest, shoulders, triceps",
    exercises: [
      feederWork(
        "Incline Barbell or Smith Machine Press",
        "Upper Chest",
        4,
        "6–10",
        3,
        "RPE 9–9.5"
      ),
      feederWork("Flat Dumbbell Press", "Chest", 3, "8–12", 1, "RPE 9"),
      feederWork("Cable Chest Flyes", "Chest", 3, "12–15", 1, "RPE 9"),
      feederWork(
        "Overhead Dumbbell or Barbell Press",
        "Shoulders",
        3,
        "8–10",
        1,
        "RPE 9"
      ),
      feederWork(
        "Dumbbell Lateral Raises",
        "Side Delts",
        4,
        "10–15",
        1,
        "To failure w/ partials"
      ),
      feederWork(
        "Tricep Rope Pushdowns",
        "Triceps",
        4,
        "12–15",
        1,
        "To failure"
      ),
    ],
  },
  {
    name: "Pull A",
    subtitle: "Tue · back width & biceps priority",
    exercises: [
      feederWork(
        "Weighted Pull-Ups or Wide-Grip Lat Pulldowns",
        "Lats",
        4,
        "8–10",
        2,
        "RPE 9"
      ),
      feederWork("Barbell Rows or T-Bar Rows", "Back", 4, "8–10", 2, "RPE 9"),
      feederWork(
        "Seated Cable Rows (Close Neutral Grip)",
        "Back",
        3,
        "10–12",
        1,
        "RPE 9"
      ),
      feederWork("Straight-Arm Pulldowns", "Lats", 3, "12–15", 1, "RPE 8.5"),
      feederWork("Barbell Curls", "Biceps", 4, "8–10", 2, "RPE 9"),
      feederWork("Incline Dumbbell Curls", "Biceps", 3, "10–12", 1, "To failure"),
    ],
  },
  {
    name: "Legs & Back/Arm Pump",
    subtitle: "Wed · legs modified · hybrid pump day",
    exercises: [
      feederWork(
        "Hack Squats or Barbell Back Squats",
        "Quads",
        3,
        "6–10",
        3,
        "To failure"
      ),
      feederWork(
        "Dumbbell Romanian Deadlifts (RDLs)",
        "Hamstrings",
        3,
        "8–10",
        2,
        "RPE 9"
      ),
      feederWork(
        "Leg Extensions",
        "Quads",
        3,
        "10–12",
        1,
        "To failure + partials"
      ),
      feederWork(
        "Standing or Seated Calf Raises",
        "Calves",
        3,
        "10–15",
        1,
        "To failure"
      ),
      feederWork(
        "Chest-Supported Rows (Neutral Grip)",
        "Back",
        3,
        "10–12",
        1,
        "RPE 9"
      ),
      feederWork("Hammer Curls", "Biceps", 3, "10–12", 1, "To failure"),
      feederWork(
        "Overhead Cable Tricep Extensions (Rope)",
        "Triceps",
        3,
        "12–15",
        1,
        "To failure"
      ),
    ],
  },
  {
    name: "Push B",
    subtitle: "Fri · chest, shoulders & triceps volume",
    exercises: [
      feederWork("Flat Barbell Bench Press", "Chest", 3, "6–8", 3, "RPE 9"),
      feederWork("Incline Dumbbell Press", "Upper Chest", 3, "8–12", 1, "RPE 9"),
      feederWork("Pec Deck Flyes", "Chest", 3, "12–15", 1, "To failure"),
      feederWork("Machine Shoulder Press", "Shoulders", 3, "10–12", 1, "RPE 9"),
      feederWork(
        "Cable Lateral Raises (One Arm at a Time)",
        "Side Delts",
        4,
        "12–15",
        2,
        "To failure"
      ),
      feederWork(
        "Overhead Cable Tricep Extensions (Rope)",
        "Triceps",
        4,
        "12–15",
        1,
        "To failure"
      ),
    ],
  },
  {
    name: "Pull B",
    subtitle: "Sat · back thickness & arm volume",
    exercises: [
      feederWork(
        "Chest-Supported Rows (Neutral Grip)",
        "Back",
        4,
        "10–12",
        2,
        "RPE 9"
      ),
      feederWork(
        "Single-Arm Lat Pulldowns",
        "Lats",
        3,
        "10–12",
        1,
        "RPE 9 · per arm"
      ),
      feederWork(
        "Face Pulls or Cable Rear Delt Flyes",
        "Rear Delts",
        4,
        "15–20",
        2,
        "To failure"
      ),
      feederWork("Hammer Curls", "Biceps", 3, "10–12", 2, "RPE 9"),
      feederWork(
        "Cable Concentration or Preacher Curls",
        "Biceps",
        3,
        "15–20",
        1,
        "To failure"
      ),
    ],
  },
  {
    name: "Leg Day A",
    subtitle: "Wed swap · quad & calf emphasis",
    exercises: [
      feederWork("Hack Squats", "Quads", 3, "6–10", 3, "To failure w/ partials"),
      feederWork(
        "Barbell Back Squats or Leg Press",
        "Quads",
        3,
        "8–10",
        2,
        "RPE 9"
      ),
      feederWork(
        "Leg Extensions",
        "Quads",
        4,
        "10–15",
        2,
        "To failure + partials"
      ),
      feederWork("Lying Hamstring Curls", "Hamstrings", 3, "10–12", 2, "RPE 9"),
      feederWork("Standing Calf Raises", "Calves", 4, "10–15", 2, "To failure"),
      feederWork("Seated Calf Raises", "Calves", 3, "12–15", 1, "To failure"),
    ],
  },
  {
    name: "Leg Day B",
    subtitle: "Wed swap · posterior chain & unilateral",
    exercises: [
      feederWork(
        "Conventional Deadlifts or Trap Bar Deadlifts",
        "Hamstrings",
        3,
        "5–8",
        3,
        "RPE 9"
      ),
      feederWork(
        "Dumbbell or Barbell Romanian Deadlifts (RDLs)",
        "Hamstrings",
        3,
        "8–10",
        2,
        "RPE 9"
      ),
      feederWork(
        "Bulgarian Split Squats",
        "Quads",
        3,
        "8–10",
        1,
        "RPE 9 · per leg"
      ),
      feederWork("Seated Leg Curls", "Hamstrings", 3, "10–12", 2, "To failure"),
      feederWork("Standing Calf Raises", "Calves", 4, "12–15", 2, "To failure"),
      work("Hanging Leg Raises (Abs)", "Core", 3, "12–15", "RPE 8.5 · no feeders"),
    ],
  },
];

/** Removed when syncing the PPL program. */
export const OBSOLETE_WORKOUT_NAMES = [
  "Upper",
  "Lower",
  "Upper A",
  "Upper B",
  "Upper C",
  "Lower A",
  "Lower B",
  "Push",
  "Pull",
  "Legs",
  "Chest & Triceps",
  "Back & Biceps",
  "Shoulders & Abs",
  "Back & Rear Delts",
  "Arms & Calves",
] as const;

export function prescriptionLine(ex: {
  defaultSets: number;
  hasCrownSet: boolean;
  crownRepRange: string;
  workingRepRange: string;
}) {
  return formatPrescription(ex).join(" · ");
}

/** Clear, spaced lines for preview / logger. */
export function formatPrescription(ex: {
  defaultSets: number;
  hasCrownSet: boolean;
  crownRepRange: string;
  workingRepRange: string;
  notes?: string;
}): string[] {
  if (ex.notes?.includes("feeder")) {
    const rangeMatch = ex.workingRepRange.match(/×(.+)$/);
    const range = rangeMatch ? cleanRange(rangeMatch[1]) : "";
    return [
      `${ex.defaultSets} working sets${range ? ` · ${range} reps` : ""}`,
      ex.notes,
    ];
  }

  if (ex.hasCrownSet) {
    const c = cleanRange(ex.crownRepRange) || "heavy";
    const w = cleanRange(ex.workingRepRange) || "work";
    const volumeSets = Math.max(1, ex.defaultSets - 1);
    return [
      `${ex.defaultSets} sets`,
      `Set 1 (heavy): ${c} reps · rest ~4 min`,
      `Then ${volumeSets} set${volumeSets === 1 ? "" : "s"} of ${w} reps · rest ~3 min`,
    ];
  }

  const raw = (ex.workingRepRange || "").trim();
  const lower = raw.toLowerCase();

  if (lower.includes("min")) {
    return [raw.replace(/\s*·\s*/g, " · ")];
  }

  if (/fail/i.test(raw) && !/[0-9]+[–\-][0-9]+/.test(raw)) {
    const n = raw.match(/^(\d+)\s*[x×]/i);
    return [
      `${n?.[1] ?? ex.defaultSets} sets`,
      "As many clean reps as you can (to failure)",
    ];
  }

  const drop = raw.match(
    /^(\d+)\s*[x×]\s*([0-9]+[–\-][0-9]+)\s*(?:fail|failure)?\s*\+\s*drop\s*[x×]?\s*~?(\d+)/i
  );
  if (drop) {
    return [
      `${drop[1]} hard sets of ${cleanRange(drop[2])} reps (to failure)`,
      `Then 1 lighter drop set of about ${drop[3]} reps`,
    ];
  }

  const setsReps = raw.match(
    /^(\d+)\s*[x×]\s*([0-9]+[–\-][0-9]+|failure|fail)(.*)$/i
  );
  if (setsReps) {
    const n = setsReps[1];
    const range = setsReps[2];
    const extra = (setsReps[3] || "").toLowerCase();
    const toFail = /fail/.test(extra) || /fail/i.test(range);
    if (/fail/i.test(range)) {
      return [`${n} sets`, "As many clean reps as you can (to failure)"];
    }
    return [
      `${n} sets`,
      `${cleanRange(range)} reps${toFail ? " · push each set to failure" : ""}`,
    ];
  }

  if (/^[0-9]+[–\-][0-9]+$/.test(raw)) {
    return [`${ex.defaultSets} sets`, `${cleanRange(raw)} reps`];
  }

  if (raw) {
    return [humanizeLoose(raw)];
  }

  return [`${ex.defaultSets} sets`];
}

function cleanRange(s: string) {
  return (s || "").replace(/-/g, "–").trim();
}

function humanizeLoose(raw: string) {
  return raw
    .replace(/\s*[x×]\s*/gi, " × ")
    .replace(/\s*·\s*/g, " · ")
    .replace(/\+/g, " + ")
    .replace(/\s+/g, " ")
    .trim();
}

export function setTargetLabel(
  ex: {
    default_sets?: number;
    has_crown_set: boolean;
    crown_rep_range: string;
    working_rep_range: string;
    notes?: string;
  },
  setIndex: number
) {
  if (ex.has_crown_set && setIndex === 0) {
    return `Aim ${cleanRange(ex.crown_rep_range) || "heavy"} reps`;
  }
  const raw = (ex.working_rep_range || "").trim();
  if (/fail/i.test(raw) && !/[0-9]+[–\-][0-9]+/.test(raw)) {
    return "To failure";
  }
  const plus = raw.match(/(\d+)\+/);
  if (plus) {
    return `Aim ${plus[1]}+ reps`;
  }
  const range = raw.match(/([0-9]+[–\-][0-9]+)/);
  if (range) {
    const toFail = /fail/i.test(raw);
    return `Aim ${cleanRange(range[1])} reps${toFail ? " (failure)" : ""}`;
  }
  return "Log your reps";
}
