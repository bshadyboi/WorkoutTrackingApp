import { isContraindicated } from "@/lib/contraindicated";

export type ExerciseCatalogEntry = {
  name: string;
  muscle: string;
  notes?: string;
  youtubeUrl?: string;
  alternatives: string[];
};

/** Workout exercise database — swaps + cues + optional form videos. */
export const EXERCISE_CATALOG: ExerciseCatalogEntry[] = [
  // —— Upper / Lower program lifts ——
  {
    name: "Chest Press",
    muscle: "Chest",
    notes: "Handles at mid-chest. Shoulder blades pinned. Stop short of lockout.",
    youtubeUrl: "https://www.youtube.com/watch?v=zgP-UCKGe24",
    alternatives: [
      "DB Bench Press",
      "Barbell Bench Press",
      "Smith Bench Press",
      "Push-Up",
      "Floor Press",
    ],
  },
  {
    name: "Incline Chest Press",
    muscle: "Upper Chest",
    notes: "Slight incline. Control the stretch. No bouncing.",
    youtubeUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    alternatives: [
      "Incline DB Bench",
      "Incline Smith Press",
      "Incline Machine Press",
      "Low-to-High Cable Fly",
    ],
  },
  {
    name: "Incline DB Bench",
    muscle: "Upper Chest",
    notes: "2 hard sets 4–8 to failure, then lighter backoff 8–12 to failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    alternatives: [
      "Incline Chest Press",
      "Incline Smith Press",
      "Incline Machine Press",
      "Incline Barbell Bench",
      "Incline Cable Press",
      "Low-to-High Cable Fly",
      "Push-Up (feet elevated)",
    ],
  },
  {
    name: "Triceps Pushdown",
    muscle: "Triceps",
    notes: "Elbows pinned. Full lockout squeeze. No swinging.",
    youtubeUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU",
    alternatives: [
      "Rope Pushdown",
      "Single Arm Pushdown",
      "V-Bar Pushdown",
      "Overhead Triceps Extension",
      "Dip (assisted OK)",
    ],
  },
  {
    name: "Wide Grip Lat Pulldown",
    muscle: "Lats",
    notes: "Pull to upper chest. Lead with elbows. No momentum.",
    youtubeUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
    alternatives: [
      "Lat Pulldown",
      "Pull-Ups",
      "Close-Grip Lat Pulldown",
      "Straight-Arm Pulldown",
    ],
  },
  {
    name: "Lat Pulldown",
    muscle: "Lats",
    notes:
      "Shoulder-width to wide grip. No momentum — strict form. Lower the weight if needed so you actually hit lats.",
    youtubeUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
    alternatives: [
      "Wide Grip Lat Pulldown",
      "Pull-Ups",
      "Straight-Arm Pulldown",
      "Single Arm Lat Pulldown",
      "Mag Grip Lat Pulldown",
      "Close-Grip Lat Pulldown",
      "Cable Pullover",
    ],
  },
  {
    name: "Lateral Raise (Cable)",
    muscle: "Side Delts",
    notes: "Lead with elbow. Soft lockout. Controlled to failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
    alternatives: [
      "Single Arm Cable Lateral Raise",
      "DB Lateral Raise",
      "Machine Lateral Raise",
      "Cable Y-Raise",
      "Lean-Away Cable Lateral",
    ],
  },
  {
    name: "Single Arm Cable Lateral Raise",
    muscle: "Side Delts",
    notes: "Lead with elbow. Controlled to failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
    alternatives: [
      "Lateral Raise (Cable)",
      "DB Lateral Raise",
      "Machine Lateral Raise",
      "Cable Y-Raise",
      "Lean-Away Cable Lateral",
      "Band Lateral Raise",
    ],
  },
  {
    name: "Preacher Curl",
    muscle: "Biceps",
    notes: "Full stretch at bottom. Control the negative.",
    youtubeUrl: "https://www.youtube.com/watch?v=fIWP-FRFNU0",
    alternatives: [
      "Single Arm Preacher Curl",
      "Machine Preacher Curl",
      "Concentration Curl",
      "Spider Curl",
      "Incline Curl",
    ],
  },
  {
    name: "Single Arm Preacher Curl",
    muscle: "Biceps",
    notes: "Full stretch at bottom. Control the negative.",
    youtubeUrl: "https://www.youtube.com/watch?v=fIWP-FRFNU0",
    alternatives: [
      "Preacher Curl",
      "Concentration Curl",
      "Spider Curl",
      "Incline Curl",
      "Machine Preacher Curl",
      "Bayesian Cable Curl",
    ],
  },
  {
    name: "Leg Press",
    muscle: "Quads",
    notes: "Feet mid-platform. Don’t lock knees hard. Full controlled depth.",
    youtubeUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
    alternatives: ["Belt Squat", "Hack Squat", "Goblet Squat", "DB Bulgarian Split Squat"],
  },
  {
    name: "Belt Squat",
    muscle: "Quads",
    notes: "Upright torso. Drive through mid-foot. Full depth you can control.",
    youtubeUrl: "https://www.youtube.com/watch?v=9fEloOw3hTo",
    alternatives: ["Leg Press", "Hack Squat", "Goblet Squat", "Safety Bar Squat"],
  },
  {
    name: "Seated Leg Curl",
    muscle: "Hamstrings",
    notes: "Hips glued to pad. Squeeze at the bottom. Slow negative.",
    youtubeUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
    alternatives: ["Lying Leg Curl", "Nordic Curl", "DB Romanian Deadlift"],
  },
  {
    name: "Lying Leg Curl",
    muscle: "Hamstrings",
    notes: "Hips down. Full squeeze. No hyperextending the low back.",
    youtubeUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
    alternatives: ["Seated Leg Curl", "Nordic Curl", "DB Romanian Deadlift"],
  },
  {
    name: "Leg Extension",
    muscle: "Quads",
    notes: "Pad on lower shin. Squeeze at the top. Controlled lower.",
    youtubeUrl: "https://www.youtube.com/watch?v=YyvSfVjQeL0",
    alternatives: ["Sissy Squat", "Spanish Squat", "Step-Up"],
  },
  {
    name: "Standing Calf Raise",
    muscle: "Calves",
    notes: "Full stretch at bottom. Pause at top. No bouncing.",
    youtubeUrl: "https://www.youtube.com/watch?v=gwLzBJYoWlI",
    alternatives: ["Seated Calf Raise", "Leg Press Calf Raise", "Donkey Calf Raise"],
  },
  {
    name: "Cable Crunch",
    muscle: "Core",
    notes: "Round the spine — don’t hip hinge. Squeeze abs hard.",
    youtubeUrl: "https://www.youtube.com/watch?v=dkGwcfo9zto",
    alternatives: ["Hanging Leg Raise", "Ab Wheel", "Decline Crunch", "Dead Bug"],
  },
  {
    name: "Hanging Leg Raise",
    muscle: "Core",
    notes: "Posterior pelvic tilt. Raise legs with abs, not swing.",
    youtubeUrl: "https://www.youtube.com/watch?v=EYe6dc_i4L0",
    alternatives: ["Cable Crunch", "Captain’s Chair Leg Raise", "Lying Leg Raise"],
  },
  {
    name: "Seated Cable Row",
    muscle: "Back",
    notes: "Chest up. Pull to midsection. Squeeze mid-back — no shrugging.",
    youtubeUrl: "https://www.youtube.com/watch?v=GZbfZ033f74",
    alternatives: [
      "Mid-Back Rows",
      "Chest-Supported Row",
      "Machine Row",
      "One-Arm DB Row",
      "T-Bar Row",
    ],
  },
  {
    name: "Mid-Back Rows",
    muscle: "Back",
    notes: "Squeeze mid-back. No shrugging.",
    youtubeUrl: "https://www.youtube.com/watch?v=GZbfZ033f74",
    alternatives: [
      "Seated Cable Row",
      "Chest-Supported Row",
      "Machine Row",
      "DB Bent-Over Row",
      "T-Bar Row",
      "Pendlay Row",
      "One-Arm DB Row",
    ],
  },
  {
    name: "Reverse Fly",
    muscle: "Rear Delts",
    notes: "Soft elbows. Lead with rear delts, not traps.",
    youtubeUrl: "https://www.youtube.com/watch?v=EA7u4Q_8HQ0",
    alternatives: [
      "Rear Delt Raise",
      "Rear Delt Pulls",
      "Reverse Pec Deck",
      "Face Pull",
      "Cable Rear Delt Fly",
    ],
  },
  {
    name: "Rear Delt Raise",
    muscle: "Rear Delts",
    notes: "Soft elbows, no momentum.",
    youtubeUrl: "https://www.youtube.com/watch?v=EA7u4Q_8HQ0",
    alternatives: [
      "Reverse Fly",
      "Rear Delt Pulls",
      "Reverse Pec Deck",
      "Face Pull",
      "Cable Rear Delt Fly",
      "Band Pull-Apart",
    ],
  },
  {
    name: "Rear Delt Pulls",
    muscle: "Rear Delts",
    notes: "High elbows. Pull apart / back — squeeze rear delts.",
    youtubeUrl: "https://www.youtube.com/watch?v=ljgqer1ZpXg",
    alternatives: ["Face Pull", "Reverse Fly", "Rear Delt Raise", "Band Pull-Apart"],
  },
  {
    name: "Overhead Triceps Extension",
    muscle: "Triceps",
    notes: "Elbows high and still. Full stretch at the bottom.",
    youtubeUrl: "https://www.youtube.com/watch?v=b5le--KkyH0",
    alternatives: [
      "Cable Overhead Extension",
      "DB Overhead Extension",
      "EZ-Bar Skull Crusher",
      "Triceps Extension",
    ],
  },
  {
    name: "Cable Overhead Extension",
    muscle: "Triceps",
    notes: "Cable. Single arm or both. Stay strict.",
    youtubeUrl: "https://www.youtube.com/watch?v=b5le--KkyH0",
    alternatives: [
      "Overhead Triceps Extension",
      "DB Overhead Extension",
      "EZ-Bar Skull Crusher",
      "Cable Skull Crusher",
    ],
  },
  {
    name: "Triceps Extension",
    muscle: "Triceps",
    notes: "Keep elbows tucked. Control the stretch.",
    youtubeUrl: "https://www.youtube.com/watch?v=b5le--KkyH0",
    alternatives: [
      "Overhead Triceps Extension",
      "Triceps Pushdown",
      "Skull Crusher",
      "Dip (assisted OK)",
    ],
  },
  {
    name: "Hammer Curl",
    muscle: "Biceps",
    notes: "Neutral grip. No swinging.",
    youtubeUrl: "https://www.youtube.com/watch?v=zC3nLlEvin4",
    alternatives: [
      "Rope Hammer Curl",
      "Cross-Body Hammer Curl",
      "DB Curl",
      "EZ-Bar Curl",
      "Cable Curl",
    ],
  },
  {
    name: "Incline Curl",
    muscle: "Biceps",
    notes: "Arms hang behind torso. Full stretch. No swinging.",
    youtubeUrl: "https://www.youtube.com/watch?v=soxrZlIl35U",
    alternatives: ["Incline DB Curl", "Preacher Curl", "Bayesian Cable Curl", "Spider Curl"],
  },
  {
    name: "Hip Thrust",
    muscle: "Glutes",
    notes: "Chin tucked. Drive through heels. Pause at lockout.",
    youtubeUrl: "https://www.youtube.com/watch?v=xDmFkJxPzeM",
    alternatives: ["Glute Bridge", "Cable Pull-Through", "Romanian Deadlift"],
  },
  {
    name: "Chest Fly",
    muscle: "Chest",
    notes: "Soft elbows. Big stretch. Squeeze without slamming plates.",
    youtubeUrl: "https://www.youtube.com/watch?v=a9vQ_hwIksU",
    alternatives: ["Pec Deck", "Cable Fly", "DB Fly", "Machine Chest Fly"],
  },
  {
    name: "Pec Deck",
    muscle: "Chest",
    notes: "Squeeze at peak. Control the stretch.",
    youtubeUrl: "https://www.youtube.com/watch?v=a9vQ_hwIksU",
    alternatives: [
      "Chest Fly",
      "Cable Fly",
      "DB Fly",
      "Machine Chest Fly",
      "Push-Up",
      "Floor Press",
    ],
  },

  // —— Extra catalog / swaps ——
  {
    name: "Pull-Ups",
    muscle: "Lats",
    notes: "Strict reps to failure. Full hang + chin over bar.",
    youtubeUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g",
    alternatives: [
      "Lat Pulldown",
      "Assisted Pull-Up",
      "Band-Assisted Pull-Up",
      "Neutral-Grip Pull-Up",
      "Chin-Up",
      "Machine Assisted Chin-Up",
      "Inverted Row",
    ],
  },
  {
    name: "Cable Overhead Press",
    muscle: "Shoulders",
    notes: "Seat ~75–80° if seated. Skip if shoulder pain.",
    youtubeUrl: "https://www.youtube.com/watch?v=QAQ64hK4Xxs",
    alternatives: [
      "DB Seated Press",
      "Smith Overhead Press",
      "Landmine Press",
      "Machine Shoulder Press",
      "Arnold Press",
      "Push Press",
      "Pike Push-Up",
    ],
  },
  {
    name: "Single Arm Pushdown",
    muscle: "Triceps",
    notes: "Elbow pinned. Full lockout squeeze.",
    youtubeUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU",
    alternatives: [
      "Triceps Pushdown",
      "Rope Pushdown",
      "Straight-Bar Pushdown",
      "V-Bar Pushdown",
      "Kickback",
      "Close-Grip Bench",
      "Dip (assisted OK)",
    ],
  },
  {
    name: "Forearm Reverse Curl",
    muscle: "Forearms",
    notes: "End of session — 3 sets to failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=ypfd1kaI1AU",
    alternatives: [
      "Wrist Curl",
      "Reverse Wrist Curl",
      "Farmer Carry",
      "Plate Pinch",
      "Dead Hang",
    ],
  },
  {
    name: "Incline Walk Cardio",
    muscle: "Cardio",
    notes: "30 minutes. Pick a challenging speed + incline and hold it.",
    youtubeUrl: "https://www.youtube.com/watch?v=C-IwH2Z06IU",
    alternatives: [
      "Stair Climber",
      "Bike",
      "Elliptical",
      "Rowing Machine",
      "Outdoor Walk (hills)",
      "Jacob's Ladder",
    ],
  },

  // —— Modified bro split (exact program names) ——
  {
    name: "Incline Smith Machine Press",
    muscle: "Upper Chest",
    notes:
      "Set bench ~30–45°. Wrists stacked over elbows. Control the stretch, then drive up. Do light feeder sets first; working sets to failure + partials.",
    youtubeUrl: "https://www.youtube.com/watch?v=VXaBbUYMfIs",
    alternatives: ["Incline DB Bench", "Incline Machine Press", "Incline Barbell Bench"],
  },
  {
    name: "Flat Dumbbell Press",
    muscle: "Chest",
    notes:
      "Shoulder blades pinned. Lower DBs with control to a deep stretch, press without slamming together. Working sets to failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=mTaiQemkEpU",
    alternatives: ["Barbell Bench Press", "Chest Press", "Push-Up"],
  },
  {
    name: "Cable Fly / Pec Deck",
    muscle: "Chest",
    notes:
      "Soft elbows, big stretch at the bottom, squeeze at the middle without locking out hard. Failure + partials.",
    youtubeUrl: "https://www.youtube.com/watch?v=a9vQ_hwIksU",
    alternatives: ["Pec Deck", "Cable Fly", "DB Fly"],
  },
  {
    name: "Overhead Tricep Extension",
    muscle: "Triceps",
    notes:
      "Elbows high and still. Full stretch at the bottom, squeeze lockout. Failure + partials.",
    youtubeUrl: "https://www.youtube.com/watch?v=b5le--KkyH0",
    alternatives: ["Cable Overhead Extension", "DB Overhead Extension", "Skull Crusher"],
  },
  {
    name: "Tricep Pushdown",
    muscle: "Triceps",
    notes:
      "Elbows pinned to sides. Full lockout squeeze, controlled return. Last set: failure + drop set.",
    youtubeUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU",
    alternatives: ["Rope Pushdown", "Single-Hand Cable Pushdown", "V-Bar Pushdown"],
  },
  {
    name: "Tricep Cable Pushdown (Warm-up)",
    muscle: "Triceps",
    notes: "Warm-up only · 50–60% working weight. Grease the elbows, don’t chase pump yet.",
    youtubeUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU",
    alternatives: ["Tricep Pushdown"],
  },
  {
    name: "Weighted Pull-Up / Lat Pulldown",
    muscle: "Lats",
    notes:
      "Full hang → pull chest to bar / handle to upper chest. Lead with elbows, no kipping. RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g",
    alternatives: ["Lat Pulldown", "Assisted Pull-Up", "Wide Grip Lat Pulldown"],
  },
  {
    name: "Barbell Row / T-Bar Row",
    muscle: "Back",
    notes:
      "Hinge, flat back, pull to lower chest / upper abs. Squeeze mid-back — don’t shrug. RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=qXrTDQG1oUQ",
    alternatives: ["T-Bar Row", "Seated Cable Row", "Chest-Supported Row"],
  },
  {
    name: "Straight-Arm Pulldown",
    muscle: "Lats",
    notes:
      "Slight hinge, arms almost straight. Sweep the bar to thighs with lats — not arms. RPE 8.5.",
    youtubeUrl: "https://www.youtube.com/watch?v=hAMcfubonDc",
    alternatives: ["Cable Pullover", "Lat Pullover", "Straight-Arm Cable Pulldown"],
  },
  {
    name: "Barbell Curl",
    muscle: "Biceps",
    notes:
      "Elbows glued to sides. No swinging. Full stretch at bottom, squeeze at top. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=54x2WF1_Suc",
    alternatives: ["EZ-Bar Curl", "Cable Curl", "DB Curl"],
  },
  {
    name: "Hack Squat / Barbell Squat",
    muscle: "Quads",
    notes:
      "Feet mid-platform, knees track over toes. Full controlled depth. Feeder sets first → working sets to failure + partials.",
    youtubeUrl: "https://www.youtube.com/watch?v=g9i05umL5vc",
    alternatives: ["Leg Press", "Belt Squat", "Goblet Squat"],
  },
  {
    name: "Seated Overhead Press",
    muscle: "Shoulders",
    notes:
      "Brace core. Press overhead without excessive lower-back arch. Soft lockout. Failure + partials.",
    youtubeUrl: "https://www.youtube.com/watch?v=k6tzKisR3NY",
    alternatives: ["DB Seated Press", "Smith Overhead Press", "Cable Overhead Press"],
  },
  {
    name: "Dumbbell Lateral Raise",
    muscle: "Side Delts",
    notes:
      "Lead with elbows, slight lean if needed. Raise to ~shoulder height — no shrugging. Failure + partials.",
    youtubeUrl: "https://www.youtube.com/watch?v=Kl3LEzQ5Zqs",
    alternatives: ["Cable Lateral Raise", "Machine Lateral Raise", "Lateral Raise (Cable)"],
  },
  {
    name: "Cable Lateral Raise",
    muscle: "Side Delts",
    notes: "Constant tension. Lead with elbow; don’t let the stack rest between reps.",
    youtubeUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
    alternatives: ["Dumbbell Lateral Raise", "Lateral Raise (Cable)", "Machine Lateral Raise"],
  },
  {
    name: "Rear Delt Fly / Face Pull",
    muscle: "Rear Delts",
    notes:
      "Pull apart / back with high elbows. Squeeze rear delts — not traps. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=ljgqer1ZpXg",
    alternatives: ["Face Pull", "Cable Rear Delt Fly", "Reverse Fly", "Rear Delt Pulls"],
  },
  {
    name: "Weighted Cable Crunch",
    muscle: "Core",
    notes:
      "Round the spine — don’t hip-hinge. Ribs toward pelvis. Squeeze abs hard. RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=dkGwcfo9zto",
    alternatives: ["Cable Crunch", "Ab Crunch Machine", "Decline Crunch"],
  },
  {
    name: "Single-Arm Lat Pulldown",
    muscle: "Lats",
    notes:
      "Pull elbow to hip. Pause squeeze. Control the stretch up. To failure each arm.",
    youtubeUrl: "https://www.youtube.com/watch?v=8zA8DjHRaq0",
    alternatives: ["Lat Pulldown", "Wide Grip Lat Pulldown", "Straight-Arm Pulldown"],
  },
  {
    name: "Chest-Supported Row",
    muscle: "Back",
    notes:
      "Chest glued to pad. Pull elbows back, squeeze mid-back. Failure + partials.",
    youtubeUrl: "https://www.youtube.com/watch?v=2ByilQ4NaAs",
    alternatives: ["Seated Cable Row", "Machine Row", "One-Arm DB Row"],
  },
  {
    name: "Cable Rear Delt Fly",
    muscle: "Rear Delts",
    notes: "Soft elbows. Sweep arms wide — rear delts do the work, not traps. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=EA7u4Q_8HQ0",
    alternatives: ["Rear Delt Fly / Face Pull", "Reverse Fly", "Face Pull"],
  },
  {
    name: "Shrug",
    muscle: "Traps",
    notes: "Stand tall. Elevate shoulders straight up — don’t roll. Squeeze hard at top. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=rFsSeClGnNA",
    alternatives: ["Dumbbell Shrug", "Barbell Shrug", "Trap Bar Shrug"],
  },
  {
    name: "Machine Preacher Curl",
    muscle: "Biceps",
    notes:
      "Arm flat on pad. Full stretch at bottom, don’t bounce. Failure + partials.",
    youtubeUrl: "https://www.youtube.com/watch?v=S4dDLfp3e8w",
    alternatives: ["Preacher Curl", "Single Arm Preacher Curl", "Concentration Curl"],
  },
  {
    name: "Incline Dumbbell Curl",
    muscle: "Biceps",
    notes:
      "Arms hang behind torso for max stretch. No swinging. Curl with control. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=XhIsIcjIbCw",
    alternatives: ["Incline Curl", "Bayesian Cable Curl", "Spider Curl"],
  },
  {
    name: "Incline Skull Crusher",
    muscle: "Triceps",
    notes:
      "Slight incline. Lower bar/DBs toward forehead or behind head with elbows still. Failure + partials.",
    youtubeUrl: "https://www.youtube.com/watch?v=gUOBvp0oWV8",
    alternatives: ["Skull Crusher", "Overhead Tricep Extension", "Cable Skull Crusher"],
  },
  {
    name: "Single-Hand Cable Pushdown",
    muscle: "Triceps",
    notes: "Elbow pinned. Full lockout. Equal work each arm. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU",
    alternatives: ["Tricep Pushdown", "Rope Pushdown", "Kickback"],
  },
  {
    name: "Seated Calf Raise",
    muscle: "Calves",
    notes:
      "Full stretch at bottom, pause squeeze at top. No bouncing. Failure + partials.",
    youtubeUrl: "https://www.youtube.com/watch?v=ORY-ke6vcgk",
    alternatives: ["Standing Calf Raise", "Leg Press Calf Raise"],
  },
  {
    name: "Lateral Raise (Warm-up)",
    muscle: "Side Delts",
    notes: "Warm-up only · 50–60% working weight. Light laterals to wake up side delts.",
    youtubeUrl: "https://www.youtube.com/watch?v=Kl3LEzQ5Zqs",
    alternatives: ["Dumbbell Lateral Raise", "Cable Lateral Raise"],
  },
  {
    name: "Lat Pullover (Warm-up)",
    muscle: "Lats",
    notes: "Warm-up only · 50–60% working weight. Feel the lats stretch and pull — don’t turn it into a tricep push.",
    youtubeUrl: "https://www.youtube.com/watch?v=zokTHF8a9Z8",
    alternatives: ["Straight-Arm Pulldown", "Cable Pullover"],
  },
  {
    name: "Bent-Over Lateral Raise (Warm-up)",
    muscle: "Rear Delts",
    notes: "Warm-up only · 50–60% working weight. Soft elbows, sweep wide for rear delts.",
    youtubeUrl: "https://www.youtube.com/watch?v=SWjzFaH9QXA",
    alternatives: ["Cable Rear Delt Fly", "Rear Delt Raise"],
  },
  {
    name: "Leg Extension (Warm-up)",
    muscle: "Quads",
    notes: "Warm-up · hold briefly at the top. 50–60% working weight — don’t smoke quads yet.",
    youtubeUrl: "https://www.youtube.com/watch?v=YyvSfVjQeL0",
    alternatives: ["Leg Extension"],
  },
  {
    name: "Hamstring Curl (Warm-up)",
    muscle: "Hamstrings",
    notes: "Warm-up only · 50–60% working weight. Smooth squeeze, no slamming.",
    youtubeUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
    alternatives: ["Seated Leg Curl", "Lying Leg Curl"],
  },
  {
    name: "Adductor / Sus Machine (Warm-up)",
    muscle: "Adductors",
    notes: "Warm-up only · 50–60% working weight. Controlled squeeze — don’t force extreme ROM cold.",
    youtubeUrl: "https://www.youtube.com/watch?v=fwpMYCWdUNY",
    alternatives: ["Adductor Machine", "Copenhagen Plank"],
  },

  // —— PPL Aesthetics Blueprint ——
  {
    name: "Incline Barbell or Smith Machine Press",
    muscle: "Upper Chest",
    notes:
      "30–45° incline. Feeder sets: 50% × 10 → 70% × 6 → 85% × 3 (45–60s rest). Then 4 working sets RPE 9–9.5.",
    youtubeUrl: "https://www.youtube.com/watch?v=VXaBbUYMfIs",
    alternatives: ["Incline Smith Machine Press", "Incline Barbell Bench", "Incline DB Bench"],
  },
  {
    name: "Cable Chest Flyes",
    muscle: "Chest",
    notes: "Soft elbows, deep stretch, squeeze mid-chest. 1 feeder → 3 working · RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=a9vQ_hwIksU",
    alternatives: ["Cable Fly / Pec Deck", "Pec Deck Flyes", "DB Fly"],
  },
  {
    name: "Overhead Dumbbell or Barbell Press",
    muscle: "Shoulders",
    notes: "Stack wrists over elbows. No excessive lean-back. 1 feeder → 3 working · RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=B-aV0yvRHhw",
    alternatives: ["Seated Overhead Press", "Machine Shoulder Press", "Arnold Press"],
  },
  {
    name: "Tricep Rope Pushdowns",
    muscle: "Triceps",
    notes: "Elbows pinned. Spread rope at lockout. 1 feeder → 4 working to failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU",
    alternatives: ["Tricep Pushdown", "V-Bar Pushdown", "Single-Hand Cable Pushdown"],
  },
  {
    name: "Weighted Pull-Ups or Wide-Grip Lat Pulldowns",
    muscle: "Lats",
    notes: "Full stretch → pull to upper chest. 2 feeders → 4 working · RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g",
    alternatives: ["Weighted Pull-Up / Lat Pulldown", "Wide Grip Lat Pulldown"],
  },
  {
    name: "Barbell Rows or T-Bar Rows",
    muscle: "Back",
    notes: "Hinge, neutral spine, pull to lower ribs. 2 feeders → 4 working · RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=9efgcAjQe7E",
    alternatives: ["Barbell Row / T-Bar Row", "Chest-Supported Row", "Seated Cable Row"],
  },
  {
    name: "Seated Cable Rows (Close Neutral Grip)",
    muscle: "Back",
    notes: "Chest tall, pull handle to belly. Squeeze lats — don’t yank with arms. RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=GZbf-zSl0qI",
    alternatives: ["Seated Cable Row", "Chest-Supported Row", "T-Bar Row"],
  },
  {
    name: "Barbell Curls",
    muscle: "Biceps",
    notes: "Elbows slightly forward of hips. No hip swing. 2 feeders → 4 working · RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=kwG2ipFRgTo",
    alternatives: ["Barbell Curl", "EZ-Bar Curl", "Cable Curl"],
  },
  {
    name: "Incline Dumbbell Curls",
    muscle: "Biceps",
    notes: "Arms hang behind torso for max stretch. Control the negative. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=soxrZlIl35U",
    alternatives: ["Incline Dumbbell Curl", "Incline Curl", "Hammer Curl"],
  },
  {
    name: "Hack Squats or Barbell Back Squats",
    muscle: "Quads",
    notes: "3 feeders ramping up. Working sets to failure in the 6–10 rep range.",
    youtubeUrl: "https://www.youtube.com/watch?v=0tn5K9NlCfo",
    alternatives: ["Hack Squat / Barbell Squat", "Leg Press", "Barbell Back Squats or Leg Press"],
  },
  {
    name: "Dumbbell Romanian Deadlifts (RDLs)",
    muscle: "Hamstrings",
    notes: "Soft knee bend, hips back, feel hamstring stretch. 2 feeders → 3 working · RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=jEy_czb3RKA",
    alternatives: ["Romanian Deadlift", "Dumbbell or Barbell Romanian Deadlifts (RDLs)"],
  },
  {
    name: "Standing or Seated Calf Raises",
    muscle: "Calves",
    notes: "Full ROM, pause at stretch and peak. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
    alternatives: ["Standing Calf Raise", "Seated Calf Raise"],
  },
  {
    name: "Chest-Supported Rows (Neutral Grip)",
    muscle: "Back",
    notes: "Chest pinned to pad. Pull elbows back, squeeze mid-back. RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=GZbf-zSl0qI",
    alternatives: ["Chest-Supported Row", "Seated Cable Rows (Close Neutral Grip)"],
  },
  {
    name: "Overhead Cable Tricep Extensions (Rope)",
    muscle: "Triceps",
    notes: "Face away from stack. Elbows fixed, full stretch overhead. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=b5le--KkyH0",
    alternatives: ["Overhead Tricep Extension", "Cable Overhead Extension"],
  },
  {
    name: "Flat Barbell Bench Press",
    muscle: "Chest",
    notes: "3 feeders ramping. 3 working sets 6–8 reps · RPE 9. Leg drive, shoulder blades pinned.",
    youtubeUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
    alternatives: ["Barbell Bench Press", "Flat Dumbbell Press", "Smith Bench Press"],
  },
  {
    name: "Incline Dumbbell Press",
    muscle: "Upper Chest",
    notes: "30–45° bench. Deep stretch, press without clanking DBs. RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    alternatives: ["Incline DB Bench", "Incline Barbell or Smith Machine Press"],
  },
  {
    name: "Pec Deck Flyes",
    muscle: "Chest",
    notes: "Soft elbows, squeeze at mid-chest. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=a9vQ_hwIksU",
    alternatives: ["Cable Fly / Pec Deck", "Cable Chest Flyes"],
  },
  {
    name: "Machine Shoulder Press",
    muscle: "Shoulders",
    notes: "Seat height so handles start at chin. Full ROM, no lockout slam. RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=W6sV2MpJ2xE",
    alternatives: ["Seated Overhead Press", "Overhead Dumbbell or Barbell Press"],
  },
  {
    name: "Cable Lateral Raises (One Arm at a Time)",
    muscle: "Side Delts",
    notes: "Lead with elbow, slight forward lean. Constant tension. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
    alternatives: ["Cable Lateral Raise", "Dumbbell Lateral Raise"],
  },
  {
    name: "Face Pulls or Cable Rear Delt Flyes",
    muscle: "Rear Delts",
    notes: "External rotation at end. Rear delts + mid traps. To failure 15–20 reps.",
    youtubeUrl: "https://www.youtube.com/watch?v=rep-qVOkpg0",
    alternatives: ["Rear Delt Fly / Face Pull", "Cable Rear Delt Fly"],
  },
  {
    name: "Cable Concentration or Preacher Curls",
    muscle: "Biceps",
    notes: "Eliminate momentum. Peak squeeze at top. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=0AUGkch3tzc",
    alternatives: ["Machine Preacher Curl", "Concentration Curl", "Preacher Curl"],
  },
  {
    name: "Hack Squats",
    muscle: "Quads",
    notes: "Feet mid-platform, full depth. 3 feeders → 3 working to failure w/ partials.",
    youtubeUrl: "https://www.youtube.com/watch?v=0tn5K9NlCfo",
    alternatives: ["Hack Squat / Barbell Squat", "Leg Press"],
  },
  {
    name: "Barbell Back Squats or Leg Press",
    muscle: "Quads",
    notes: "Controlled depth, knees track toes. 2 feeders → 3 working · RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8",
    alternatives: ["Hack Squats or Barbell Back Squats", "Leg Press", "Barbell Squat"],
  },
  {
    name: "Lying Hamstring Curls",
    muscle: "Hamstrings",
    notes: "Hips pinned. Full stretch, squeeze at top. RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
    alternatives: ["Seated Leg Curls", "Hamstring Curl (Warm-up)"],
  },
  {
    name: "Conventional Deadlifts or Trap Bar Deadlifts",
    muscle: "Hamstrings",
    notes: "Brace hard, bar close. 3 feeders → 3 working 5–8 · RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=op9kgs9nnF8",
    alternatives: ["Deadlift", "Trap Bar Deadlift", "Romanian Deadlift"],
  },
  {
    name: "Dumbbell or Barbell Romanian Deadlifts (RDLs)",
    muscle: "Hamstrings",
    notes: "Same as DB RDL — hip hinge, hamstring stretch. RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=jEy_czb3RKA",
    alternatives: ["Dumbbell Romanian Deadlifts (RDLs)", "Barbell RDL"],
  },
  {
    name: "Bulgarian Split Squats",
    muscle: "Quads",
    notes: "Rear foot elevated. Torso slightly forward for quads. 8–10 per leg · RPE 9.",
    youtubeUrl: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
    alternatives: ["Split Squat", "Walking Lunge", "Goblet Squat"],
  },
  {
    name: "Seated Leg Curls",
    muscle: "Hamstrings",
    notes: "Full stretch at bottom, squeeze at top. To failure.",
    youtubeUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
    alternatives: ["Lying Hamstring Curls", "Hamstring Curl (Warm-up)"],
  },
  {
    name: "Hanging Leg Raises (Abs)",
    muscle: "Core",
    notes: "Posterior pelvic tilt at top. Control swing. RPE 8.5.",
    youtubeUrl: "https://www.youtube.com/watch?v=JB2oyAF4L30",
    alternatives: ["Hanging Leg Raise", "Captain's Chair Leg Raise"],
  },

  // —— Elevate Challenge lifts ——
  {
    name: "Smith Machine Back Squat",
    muscle: "Quads",
    notes: "Tempo 4/0/X/0. Control the eccentric. Depth you can own.",
    youtubeUrl: "https://www.youtube.com/watch?v=bEv6CCg_XbE",
    alternatives: [
      "Leg Press Medium Stance",
      "Barbell Back Squat",
      "DB Goblet Squat",
    ],
  },
  {
    name: "Smith Machine Front Squat",
    muscle: "Quads",
    notes: "Tempo 4/0/X/0. Elbows high. Stay tall.",
    youtubeUrl: "https://www.youtube.com/watch?v=m4yVlPqeZwo",
    alternatives: [
      "Smith Machine Back Squat",
      "Hack Squat / Barbell Squat",
      "Leg Press Narrow Stance",
      "Goblet Squat",
    ],
  },
  {
    name: "DB Bulgarian Split Squat",
    muscle: "Quads",
    notes: "Tempo 3/0/1/0. Per leg. Slight forward lean.",
    youtubeUrl: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
    alternatives: [
      "Smith Machine Bulgarian Split Squat",
      "Barbell Split Squat",
      "DB Split Squat",
    ],
  },
  {
    name: "Front Foot Elevated DB Split Squat",
    muscle: "Quads",
    notes: "Tempo 3/0/1/0. Per leg.",
    youtubeUrl: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
    alternatives: [
      "DB Bulgarian Split Squat",
      "Bulgarian Split Squats",
      "DB Walking Lunges",
    ],
  },
  {
    name: "Leg Press Narrow Stance",
    muscle: "Quads",
    notes: "Tempo 3/0/2/0. Feet lower on the pad for quads.",
    youtubeUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
    alternatives: [
      "Leg Press Low Narrow Stance",
    ],
  },
  {
    name: "Leg Press Wide Stance",
    muscle: "Quads",
    notes: "Tempo 3/0/2/0. Sit into the hips.",
    youtubeUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
    alternatives: [
      "Leg Press Narrow Stance",
      "Hack Squat / Barbell Squat",
      "Machine Hip Thrust",
    ],
  },
  {
    name: "DB Walking Lunges",
    muscle: "Quads",
    notes: "Burnout · as many quality steps as you can.",
    youtubeUrl: "https://www.youtube.com/watch?v=D7Ka2H3qr1M",
    alternatives: [
      "Smith Machine Split Squat",
      "Barbell Walking Lunges",
      "Alternating DB Drop Lunges",
    ],
  },
  {
    name: "Barbell Walking Lunges",
    muscle: "Quads",
    notes: "Tempo 3/0/1/0. Per leg. Short steps, upright torso.",
    youtubeUrl: "https://www.youtube.com/watch?v=D7Ka2H3qr1M",
    alternatives: [
      "DB Walking Lunges",
      "DB Bulgarian Split Squat",
      "Front Foot Elevated DB Split Squat",
    ],
  },
  {
    name: "Overhand Lat Pulldown",
    muscle: "Lats",
    notes: "Tempo 4/0/X/0. Pull to upper chest. No swing.",
    youtubeUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
    alternatives: [
      "Wide Grip Lat Pulldown",
      "Bent Over Barbell Row",
      "Single Arm DB Row",
    ],
  },
  {
    name: "Underhand Lat Pulldown",
    muscle: "Lats",
    notes: "Tempo 3/0/X/1. Squeeze lats at the bottom.",
    youtubeUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
    alternatives: [
      "Overhand Lat Pulldown",
      "Medium Grip Chin Up",
      "Lat Pulldown",
      "Close-Grip Lat Pulldown",
    ],
  },
  {
    name: "Chest Supported T-Bar Row",
    muscle: "Back",
    notes: "Tempo 3/1/X/0. Pause on the chest pad.",
    youtubeUrl: "https://www.youtube.com/watch?v=j3Q2pYhQk1Q",
    alternatives: [
      "Hammer Strength High Row",
      "Bent Over Barbell Row",
      "Bent Over Pronated DB Row",
    ],
  },
  {
    name: "Cable Rope Pullover",
    muscle: "Lats",
    notes: "Tempo 2/1/1/1. Soft elbows. Stretch at the top.",
    youtubeUrl: "https://www.youtube.com/watch?v=3VwO8DmKqAg",
    alternatives: [
      "Vulken Grip Pullover",
      "Bent Over Barbell Row",
      "DB Pullover",
    ],
  },
  {
    name: "Medium Grip Chin Up",
    muscle: "Lats",
    notes: "Burnout · as many clean reps as you can.",
    youtubeUrl: "https://www.youtube.com/watch?v=brhRXlOhsAM",
    alternatives: [
      "Wide Grip Lat Pulldown",
      "Bent Over Barbell Row",
      "Single Arm DB Row",
    ],
  },
  {
    name: "Hammer Strength Flat Chest Press",
    muscle: "Chest",
    notes: "Tempo 4/0/X/0. Shoulder blades pinned.",
    youtubeUrl: "https://www.youtube.com/watch?v=zgP-UCKGe24",
    alternatives: [
      "Hammer Strength Decline Chest Press",
      "Barbell Flat Bench Press",
      "Flat Pronated DB Bench Press",
    ],
  },
  {
    name: "Incline Pronated DB Bench Press",
    muscle: "Upper Chest",
    notes: "Tempo 3/1/X/0. Pause at the stretch.",
    youtubeUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    alternatives: [
      "Incline Pronated Cable Press",
      "Incline Barbell Bench Press",
      "65° Incline Barbell Bench Press",
    ],
  },
  {
    name: "Cable Chest Fly — Mid",
    muscle: "Chest",
    notes: "Tempo 2/1/1/1. Hands meet at sternum height.",
    youtubeUrl: "https://www.youtube.com/watch?v=Iwe6AmxVf7o",
    alternatives: [
      "Pec Deck",
      "Barbell Flat Bench Press",
      "Flat Bench Pronated DB Press",
    ],
  },
  {
    name: "Hammer Strength Incline Chest Press",
    muscle: "Upper Chest",
    notes: "36 total reps · cluster or unbroken.",
    youtubeUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    alternatives: [
      "Hammer Strength Flat Chest Press",
      "Incline Barbell Bench Press",
      "65° Incline Barbell Bench Press",
    ],
  },
  {
    name: "Smith Machine Incline Bench Press",
    muscle: "Upper Chest",
    notes: "Tempo 4/0/X/0. Path over upper chest.",
    youtubeUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    alternatives: [
      "Incline Pronated DB Bench Press",
      "Incline Dumbbell Press",
      "Hammer Strength Incline Chest Press",
      "Incline Smith Press",
    ],
  },
  {
    name: "Decline Pronated DB Chest Press",
    muscle: "Chest",
    notes: "Tempo 3/1/X/0. Slight decline. Control the stretch.",
    youtubeUrl: "https://www.youtube.com/watch?v=LfyQBUKR8SE",
    alternatives: [
      "Flat Pronated DB Bench Press",
      "Flat Dumbbell Press",
      "Hammer Strength Flat Chest Press",
      "Pec Deck",
    ],
  },
  {
    name: "Flat Pronated DB Bench Press",
    muscle: "Chest",
    notes: "Pattern: 12, ∞, ∞, 12, ∞, ∞.",
    youtubeUrl: "https://www.youtube.com/watch?v=VmB1G1K7v94",
    alternatives: [
      "Flat Dumbbell Press",
      "Decline Pronated DB Chest Press",
      "Hammer Strength Flat Chest Press",
      "Flat Barbell Bench Press",
    ],
  },
  {
    name: "Pec Deck",
    muscle: "Chest",
    notes: "Tempo 3/0/1/1. Soft elbows. Squeeze at the midline.",
    youtubeUrl: "https://www.youtube.com/watch?v=Z57_tQ3vjX8",
    alternatives: [
      "Pec Deck Flyes",
      "Cable Chest Fly — Mid",
      "Cable Chest Flyes",
      "Cable Fly / Pec Deck",
    ],
  },
  {
    name: "Barbell RDL",
    muscle: "Hamstrings",
    notes: "Tempo 4/0/X/0. Soft knees. Bar close to legs.",
    youtubeUrl: "https://www.youtube.com/watch?v=2tjrt_DxgNE",
    alternatives: [
      "Hyperextensions",
      "Barbell Stiff Leg Deadlift",
      "DB RDL",
    ],
  },
  {
    name: "Lying Leg Curl — Neutral (Dorsiflexed)",
    muscle: "Hamstrings",
    notes: "Toes pulled toward shins. Full squeeze at the top.",
    youtubeUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
    alternatives: [
      "Lying Leg Curl Neutral",
      "Barbell RDL",
      "Lying DB Hamstring Curl",
    ],
  },
  {
    name: "Pendulum Squat Medium High Stance",
    muscle: "Quads",
    notes: "Feet slightly higher on the platform than medium stance.",
    youtubeUrl: "https://www.youtube.com/watch?v=bEv6CCg_XbE",
    alternatives: ["Pendulum Squat Medium Stance", "Barbell Back Squat", "DB Goblet Squat"],
  },
  {
    name: "Pendulum Squat Medium Stance",
    muscle: "Quads",
    notes: "Tempo 3/0/2/0. Sit into the machine, don’t collapse.",
    youtubeUrl: "https://www.youtube.com/watch?v=bEv6CCg_XbE",
    alternatives: [
      "Pendulum Squat Medium High Stance",
      "Barbell Back Squat",
      "DB Goblet Squat",
    ],
  },
  {
    name: "Back Extension",
    muscle: "Lower Back",
    notes: "Burnout · squeeze glutes at the top. Don’t hyperextend the neck.",
    youtubeUrl: "https://www.youtube.com/watch?v=phlwqR4pGj8",
    alternatives: [
      "Horizontal Back Extension",
      "Barbell Medium Stance Good Morning",
      "45° DB Back Extension",
    ],
  },
  {
    name: "Machine Hip Thrust",
    muscle: "Glutes",
    notes: "Tempo 3/0/2/0. Pause at lockout. Ribs down.",
    youtubeUrl: "https://www.youtube.com/watch?v=LM8XHLYJBCs",
    alternatives: [
      "Barbell RDL",
      "Leg Press Wide Stance",
      "Back Extension",
    ],
  },
  {
    name: "Incline DB Skull Crushers",
    muscle: "Triceps",
    notes: "Superset with EZ-Bar curl. Tempo 4/0/X/0.",
    youtubeUrl: "https://www.youtube.com/watch?v=ir5PsbniVSc",
    alternatives: [
      "Cable Rope Overhead Extension",
      "Incline EZ-Bar Skull Crusher",
      "Flat Bench DB Skull Crusher",
    ],
  },
  {
    name: "Decline DB Skull Crushers",
    muscle: "Triceps",
    notes: "Superset with underhand pulldown. Tempo 4/0/X/0.",
    youtubeUrl: "https://www.youtube.com/watch?v=ir5PsbniVSc",
    alternatives: [
      "Incline DB Skull Crushers",
      "Cable Rope French Press",
      "Straight Bar Cable Pushdown",
    ],
  },
  {
    name: "EZ-Bar Curl Medium Semi-Supinated Grip",
    muscle: "Biceps",
    notes: "Superset with skull crushers. Tempo 4/0/X/0.",
    youtubeUrl: "https://www.youtube.com/watch?v=zG2v77qzzW8",
    alternatives: [
      "Mid Semi-Supinated Cable Curl",
      "Barbell Curl Medium Grip",
      "Incline Supinated DB Curls",
    ],
  },
  {
    name: "Barbell Medium Grip Military Press",
    muscle: "Shoulders",
    notes: "Superset with Scott curl. Tempo 3/1/X/0.",
    youtubeUrl: "https://www.youtube.com/watch?v=QAQ64hK4Xxs",
    alternatives: [
      "Hammer Strength Seated Shoulder Press",
      "Seated Barbell Shoulder Press",
      "Seated DB Shoulder Press",
    ],
  },
  {
    name: "Single Arm Neutral DB Scott Curl",
    muscle: "Biceps",
    notes: "Superset with military press. Per arm.",
    youtubeUrl: "https://www.youtube.com/watch?v=fIWP-FRFNU0",
    alternatives: [
      "Machine Preacher Curl",
      "EZ-Bar Semi-Supinated Curl",
      "Neutral DB Preacher Curl",
    ],
  },
  {
    name: "Seated Dip Machine",
    muscle: "Triceps",
    notes: "Superset with incline curls. Tempo 3/0/X/0.",
    youtubeUrl: "https://www.youtube.com/watch?v=2z8JmcrW-As",
    alternatives: [
      "Dips Mid Grip",
      "Close Grip Barbell Bench Press",
    ],
  },
  {
    name: "Incline Supinated DB Curls",
    muscle: "Biceps",
    notes: "Superset with dip machine. Tempo 3/0/1/0.",
    youtubeUrl: "https://www.youtube.com/watch?v=soxrZlIl35U",
    alternatives: [
      "Mid Semi-Supinated Cable Curl",
      "EZ-Bar Curl Medium Semi-Supinated Grip",
    ],
  },
  {
    name: "Standing Side Lateral Raise Machine",
    muscle: "Side Delts",
    notes: "Tempo 3/0/1/0. Lead with elbows.",
    youtubeUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
    alternatives: [
      "Single Arm Leaning Cable Lateral Raise",
      "Wide Grip Barbell Upright Row",
      "Standing DB Side Lateral Raise",
    ],
  },
  {
    name: "Standing DB Side Lateral Raise",
    muscle: "Side Delts",
    notes: "Tempo 3/0/1/0. Soft elbows. No swing.",
    youtubeUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
    alternatives: [
      "Standing Side Lateral Raise Machine",
      "Dumbbell Lateral Raises",
      "DB Lateral Raise",
    ],
  },
  {
    name: "Cable Rope French Press",
    muscle: "Triceps",
    notes: "Superset with rope hammer curl.",
    youtubeUrl: "https://www.youtube.com/watch?v=ir5PsbniVSc",
    alternatives: [
      "Overhead Cable Tricep Extensions (Rope)",
      "Incline DB Skull Crushers",
      "Straight Bar Cable Pushdown",
    ],
  },
  {
    name: "Cable Rope Hammer Curl",
    muscle: "Biceps",
    notes: "Superset with French press. Tempo 4/0/1/0.",
    youtubeUrl: "https://www.youtube.com/watch?v=z4vRLbUsE4I",
    alternatives: [
      "Hammer Curls",
      "Incline DB Hammer Curls",
      "EZ-Bar Curl Medium Semi-Supinated Grip",
    ],
  },
  {
    name: "Straight Bar Cable Pushdown",
    muscle: "Triceps",
    notes: "Superset with incline hammer curls. Tempo 2/0/1/1.",
    youtubeUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU",
    alternatives: [
      "Tricep Rope Pushdowns",
      "Triceps Pushdown",
      "Seated Dip Machine",
    ],
  },
  {
    name: "Incline DB Hammer Curls",
    muscle: "Biceps",
    notes: "Superset with pushdowns. Tempo 3/0/1/0.",
    youtubeUrl: "https://www.youtube.com/watch?v=z4vRLbUsE4I",
    alternatives: [
      "Hammer Curls",
      "Cable Rope Hammer Curl",
      "Incline Dumbbell Curls",
    ],
  },
  {
    name: "Seated Semi-Supinated Close Grip Cable Row",
    muscle: "Back",
    notes: "Tempo 4/0/X/0. Pull to the waist. Pause.",
    youtubeUrl: "https://www.youtube.com/watch?v=GZbfZ033f74",
    alternatives: [
      "Seated Cable Rows (Close Neutral Grip)",
      "Seated Cable Row",
      "Chest Supported T-Bar Row",
    ],
  },
  {
    name: "Single Arm Hammer Strength Neutral Row",
    muscle: "Back",
    notes: "Tempo 2/1/1/1. Per arm.",
    youtubeUrl: "https://www.youtube.com/watch?v=j3Q2pYhQk1Q",
    alternatives: [
      "Chest-Supported Rows (Neutral Grip)",
      "Chest Supported T-Bar Row",
      "Seated Cable Row",
    ],
  },
  {
    name: "Cross Body Rear Delt Cable Fly",
    muscle: "Rear Delts",
    notes: "Pattern: 15, ∞, ∞, 15, ∞, ∞.",
    youtubeUrl: "https://www.youtube.com/watch?v=-t7kVMdJQ4A",
    alternatives: [
      "Face Pulls or Cable Rear Delt Flyes",
      "Cable Rear Delt Fly",
      "Rear Delt Fly / Face Pull",
    ],
  },
  {
    name: "Smith Machine Bulgarian Split Squat",
    muscle: "Quads",
    notes: "Rear foot elevated. Control the descent.",
    youtubeUrl: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
    alternatives: ["DB Bulgarian Split Squat", "Barbell Split Squat", "DB Split Squat"],
  },
  {
    name: "Barbell Split Squat",
    muscle: "Quads",
    notes: "Both feet on the floor. Stay tall.",
    youtubeUrl: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
    alternatives: ["DB Split Squat", "Smith Machine Bulgarian Split Squat"],
  },
  {
    name: "DB Split Squat",
    muscle: "Quads",
    notes: "Both feet on the floor. Per side.",
    youtubeUrl: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
    alternatives: ["Barbell Split Squat", "DB Bulgarian Split Squat"],
  },
  {
    name: "Smith Machine Split Squat",
    muscle: "Quads",
    notes: "Smith path keeps you upright.",
    youtubeUrl: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
    alternatives: ["DB Walking Lunges", "Barbell Walking Lunges"],
  },
  {
    name: "Alternating DB Drop Lunges",
    muscle: "Quads",
    notes: "Step back and drop the rear knee.",
    youtubeUrl: "https://www.youtube.com/watch?v=D7Ka2H3qr1M",
    alternatives: ["DB Walking Lunges", "Barbell Walking Lunges"],
  },
  {
    name: "Leg Press Low Narrow Stance",
    muscle: "Quads",
    notes: "Feet low and close on the sled.",
    youtubeUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
    alternatives: ["Leg Press Narrow Stance", "Leg Press Wide Stance"],
  },
  {
    name: "Bent Over Barbell Row",
    muscle: "Back",
    notes: "Hinge, pull to the hip. No bounce.",
    youtubeUrl: "https://www.youtube.com/watch?v=kBWAon7ItDw",
    alternatives: ["Chest Supported T-Bar Row", "Bent Over Pronated DB Row"],
  },
  {
    name: "Bent Over Pronated DB Row",
    muscle: "Back",
    notes: "Palms down. Pull elbows high.",
    youtubeUrl: "https://www.youtube.com/watch?v=roCP6wCXPqo",
    alternatives: ["Bent Over Barbell Row", "Single Arm DB Row"],
  },
  {
    name: "Hammer Strength High Row",
    muscle: "Back",
    notes: "Chest on the pad. Pull high to the ribs.",
    youtubeUrl: "https://www.youtube.com/watch?v=j3Q2pYhQk1Q",
    alternatives: ["Chest Supported T-Bar Row", "Bent Over Barbell Row"],
  },
  {
    name: "Vulken Grip Pullover",
    muscle: "Back",
    notes: "Neutral Vulken / rope handle. Soft elbows.",
    youtubeUrl: "https://www.youtube.com/watch?v=3VwO8DmKqAg",
    alternatives: ["Cable Rope Pullover", "DB Pullover"],
  },
  {
    name: "DB Pullover",
    muscle: "Back",
    notes: "Upper back on the bench. Stretch overhead.",
    youtubeUrl: "https://www.youtube.com/watch?v=FK4rHfWKObA",
    alternatives: ["Cable Rope Pullover", "Vulken Grip Pullover"],
  },
  {
    name: "Single Arm DB Row",
    muscle: "Back",
    notes: "Hand and knee on the bench. Pull to the hip.",
    youtubeUrl: "https://www.youtube.com/watch?v=roCP6wCXPqo",
    alternatives: ["Bent Over Pronated DB Row", "Chest Supported T-Bar Row"],
  },
  {
    name: "Incline Pronated Cable Press",
    muscle: "Chest",
    notes: "Palms down. Press up and in.",
    youtubeUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    alternatives: ["Incline Pronated DB Bench Press", "Incline Barbell Bench Press"],
  },
  {
    name: "Incline Barbell Bench Press",
    muscle: "Chest",
    notes: "Low-to-mid incline. Path over upper chest.",
    youtubeUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    alternatives: ["65° Incline Barbell Bench Press", "Incline Pronated DB Bench Press"],
  },
  {
    name: "65° Incline Barbell Bench Press",
    muscle: "Chest",
    notes: "Steep incline. More shoulder.",
    youtubeUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    alternatives: ["Incline Barbell Bench Press", "Incline Pronated DB Bench Press"],
  },
  {
    name: "Barbell Flat Bench Press",
    muscle: "Chest",
    notes: "Shoulder blades pinned. Touch the chest.",
    youtubeUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
    alternatives: ["Flat Bench Pronated DB Press", "Hammer Strength Flat Chest Press"],
  },
  {
    name: "Flat Bench Pronated DB Press",
    muscle: "Chest",
    notes: "Palms forward. Control the stretch.",
    youtubeUrl: "https://www.youtube.com/watch?v=VmB1G1K7v94",
    alternatives: ["Barbell Flat Bench Press", "Flat Pronated DB Bench Press"],
  },
  {
    name: "Mid Semi-Supinated Cable Curl",
    muscle: "Biceps",
    notes: "Mid-height cable. Semi-supinated grip.",
    youtubeUrl: "https://www.youtube.com/watch?v=zG2v77qzzW8",
    alternatives: ["EZ-Bar Curl Medium Semi-Supinated Grip", "Incline Supinated DB Curls"],
  },
  {
    name: "Barbell Curl Medium Grip",
    muscle: "Biceps",
    notes: "Hands just outside the thighs.",
    youtubeUrl: "https://www.youtube.com/watch?v=kwG2ipFRgTo",
    alternatives: ["EZ-Bar Curl Medium Semi-Supinated Grip", "Mid Semi-Supinated Cable Curl"],
  },
  {
    name: "EZ-Bar Semi-Supinated Curl",
    muscle: "Biceps",
    notes: "Inner EZ camber. Semi-supinated.",
    youtubeUrl: "https://www.youtube.com/watch?v=zG2v77qzzW8",
    alternatives: ["EZ-Bar Curl Medium Semi-Supinated Grip", "Machine Preacher Curl"],
  },
  {
    name: "Neutral DB Preacher Curl",
    muscle: "Biceps",
    notes: "Hammer grip on the preacher pad.",
    youtubeUrl: "https://www.youtube.com/watch?v=fIWP-FRFNU0",
    alternatives: ["Single Arm Neutral DB Scott Curl", "Machine Preacher Curl"],
  },
  {
    name: "Dips Mid Grip",
    muscle: "Triceps",
    notes: "Torso slightly forward. Mid-width handles.",
    youtubeUrl: "https://www.youtube.com/watch?v=2z8JmcrW-As",
    alternatives: ["Seated Dip Machine", "Close Grip Barbell Bench Press"],
  },
  {
    name: "Close Grip Barbell Bench Press",
    muscle: "Triceps",
    notes: "Hands just inside shoulder width.",
    youtubeUrl: "https://www.youtube.com/watch?v=nEF0bv2FW94",
    alternatives: ["Dips Mid Grip", "Seated Dip Machine"],
  },
  {
    name: "Leg Press Medium Stance",
    muscle: "Quads",
    notes: "Feet mid-pad, hip-width.",
    youtubeUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
    alternatives: ["Leg Press Narrow Stance", "Leg Press Wide Stance"],
  },
  {
    name: "Barbell Back Squat",
    muscle: "Quads",
    notes: "Bar on the traps. Depth you can own.",
    youtubeUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8",
    alternatives: ["Smith Machine Back Squat", "DB Goblet Squat"],
  },
  {
    name: "DB Goblet Squat",
    muscle: "Quads",
    notes: "Hold the bell at the chest. Elbows inside the knees.",
    youtubeUrl: "https://www.youtube.com/watch?v=MeIiObh6TVc",
    alternatives: ["Smith Machine Back Squat", "Barbell Back Squat"],
  },
  {
    name: "Hammer Strength Decline Chest Press",
    muscle: "Chest",
    notes: "Seat set so handles hit lower chest.",
    youtubeUrl: "https://www.youtube.com/watch?v=LfyQBUKR8SE",
    alternatives: ["Hammer Strength Flat Chest Press", "Barbell Flat Bench Press"],
  },
  {
    name: "Cable Rope Overhead Extension",
    muscle: "Triceps",
    notes: "Elbows fixed. Stretch behind the head.",
    youtubeUrl: "https://www.youtube.com/watch?v=ir5PsbniVSc",
    alternatives: ["Incline DB Skull Crushers", "Incline EZ-Bar Skull Crusher"],
  },
  {
    name: "Incline EZ-Bar Skull Crusher",
    muscle: "Triceps",
    notes: "Slight incline. Lower to the forehead.",
    youtubeUrl: "https://www.youtube.com/watch?v=ir5PsbniVSc",
    alternatives: ["Incline DB Skull Crushers", "Flat Bench DB Skull Crusher"],
  },
  {
    name: "Flat Bench DB Skull Crusher",
    muscle: "Triceps",
    notes: "Flat bench. Lower beside the ears.",
    youtubeUrl: "https://www.youtube.com/watch?v=ir5PsbniVSc",
    alternatives: ["Incline DB Skull Crushers", "Incline EZ-Bar Skull Crusher"],
  },
  {
    name: "Single Arm Leaning Cable Lateral Raise",
    muscle: "Shoulders",
    notes: "Lean away from the stack. Raise to ear height.",
    youtubeUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
    alternatives: ["Standing Side Lateral Raise Machine", "Standing DB Side Lateral Raise"],
  },
  {
    name: "Wide Grip Barbell Upright Row",
    muscle: "Shoulders",
    notes: "Hands outside the thighs. Pull to the chest.",
    youtubeUrl: "https://www.youtube.com/watch?v=amCU-ziHITM",
    alternatives: ["Standing Side Lateral Raise Machine", "Standing DB Side Lateral Raise"],
  },
  {
    name: "Hammer Strength Seated Shoulder Press",
    muscle: "Shoulders",
    notes: "Handles at ear height. Don’t flare the elbows.",
    youtubeUrl: "https://www.youtube.com/watch?v=QAQ64hK4Xxs",
    alternatives: ["Seated DB Shoulder Press", "Seated Barbell Shoulder Press"],
  },
  {
    name: "Seated Barbell Shoulder Press",
    muscle: "Shoulders",
    notes: "Back against the bench. Press over the ears.",
    youtubeUrl: "https://www.youtube.com/watch?v=QAQ64hK4Xxs",
    alternatives: ["Seated DB Shoulder Press", "Hammer Strength Seated Shoulder Press"],
  },
  {
    name: "Seated DB Shoulder Press",
    muscle: "Shoulders",
    notes: "Palms forward. Don’t bounce the bottom.",
    youtubeUrl: "https://www.youtube.com/watch?v=qEwKCR5JCog",
    alternatives: ["Seated Barbell Shoulder Press", "Hammer Strength Seated Shoulder Press"],
  },
  {
    name: "Hyperextensions",
    muscle: "Glutes",
    notes: "Round slightly at the bottom. Squeeze glutes at the top.",
    youtubeUrl: "https://www.youtube.com/watch?v=phlwqR4pGj8",
    alternatives: ["Barbell RDL", "Back Extension"],
  },
  {
    name: "Barbell Stiff Leg Deadlift",
    muscle: "Hamstrings",
    notes: "Soft knees. Stretch the hams. Bar close.",
    youtubeUrl: "https://www.youtube.com/watch?v=2tjrt_DxgNE",
    alternatives: ["Barbell RDL", "DB RDL"],
  },
  {
    name: "DB RDL",
    muscle: "Hamstrings",
    notes: "Bells against the thighs. Hinge, don’t squat.",
    youtubeUrl: "https://www.youtube.com/watch?v=2tjrt_DxgNE",
    alternatives: ["Barbell RDL", "Barbell Stiff Leg Deadlift"],
  },
  {
    name: "Lying Leg Curl Neutral",
    muscle: "Hamstrings",
    notes: "Neutral ankle. Full squeeze at the top.",
    youtubeUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
    alternatives: ["Lying Leg Curl — Neutral (Dorsiflexed)", "Lying DB Hamstring Curl"],
  },
  {
    name: "Lying DB Hamstring Curl",
    muscle: "Hamstrings",
    notes: "DB between the feet. Curl toward the glutes.",
    youtubeUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
    alternatives: ["Lying Leg Curl — Neutral (Dorsiflexed)", "Barbell RDL"],
  },
  {
    name: "Horizontal Back Extension",
    muscle: "Glutes",
    notes: "Pad at the hips. Squeeze glutes, not the low back.",
    youtubeUrl: "https://www.youtube.com/watch?v=phlwqR4pGj8",
    alternatives: ["Back Extension", "45° DB Back Extension"],
  },
  {
    name: "Barbell Medium Stance Good Morning",
    muscle: "Hamstrings",
    notes: "Soft knees. Hinge until the torso is near parallel.",
    youtubeUrl: "https://www.youtube.com/watch?v=5uAqp5swgI8",
    alternatives: ["Back Extension", "Barbell RDL"],
  },
  {
    name: "45° DB Back Extension",
    muscle: "Glutes",
    notes: "Hold a DB at the chest. Don’t hyperextend the neck.",
    youtubeUrl: "https://www.youtube.com/watch?v=phlwqR4pGj8",
    alternatives: ["Back Extension", "Horizontal Back Extension"],
  },
];

/** Map alternate names → catalog entry name (lowercase keys). */
const ALIASES: Record<string, string> = {
  "incline db curl": "Incline Dumbbell Curl",
  "incline curl": "Incline Dumbbell Curl",
  "cable lateral raise": "Cable Lateral Raise",
  "lateral raise (cable)": "Cable Lateral Raise",
  "wide-grip lat pulldown": "Wide Grip Lat Pulldown",
  "wide grip lat pulldowns": "Wide Grip Lat Pulldown",
  "tricep pushdown": "Tricep Pushdown",
  "triceps pushdown": "Tricep Pushdown",
  "triceps pushdowns": "Tricep Pushdown",
  "unilateral tricep pushdown": "Single-Hand Cable Pushdown",
  "oh triceps extension": "Overhead Tricep Extension",
  "overhead triceps extension": "Overhead Tricep Extension",
  "overhead extension": "Overhead Tricep Extension",
  "unilateral overhead tricep extension": "Overhead Tricep Extension",
  "face pull": "Rear Delt Fly / Face Pull",
  "rear delt pulls": "Rear Delt Fly / Face Pull",
  "reverse pec deck": "Cable Rear Delt Fly",
  "reverse fly": "Cable Rear Delt Fly",
  "machine chest press": "Chest Press",
  "incline machine chest press": "Incline Chest Press",
  "seated row": "Seated Cable Row",
  "cable row": "Seated Cable Row",
  "seated cable machine row": "Seated Cable Row",
  "upper back row": "Mid-Back Rows",
  "upper back rows": "Mid-Back Rows",
  "cable fly": "Cable Fly / Pec Deck",
  "pec deck": "Cable Fly / Pec Deck",
  "cable crunch": "Weighted Cable Crunch",
  "ab crunch machine": "Weighted Cable Crunch",
  "preacher curl": "Machine Preacher Curl",
  "skull crusher": "Incline Skull Crusher",
  "hack squat": "Hack Squat / Barbell Squat",
  "barbell squat": "Hack Squat / Barbell Squat",
  "pull-ups": "Weighted Pull-Up / Lat Pulldown",
  "pull-up": "Weighted Pull-Up / Lat Pulldown",
  "lat pulldown": "Weighted Pull-Up / Lat Pulldown",
  "t-bar row": "Barbell Row / T-Bar Row",
  "barbell row": "Barbell Row / T-Bar Row",
  "dumbbell shrug": "Shrug",
  "barbell shrug": "Shrug",
  "calf press / calf raise": "Standing Calf Raise",
  "seated leg extension": "Leg Extension",
  "leg extensions": "Leg Extension",
  "smith machine bulgarian split squat": "Smith Machine Bulgarian Split Squat",
  "smith bulgarian": "Smith Machine Bulgarian Split Squat",
  "barbell split squat": "Barbell Split Squat",
  "db split squat": "DB Split Squat",
  "dumbbell split squat": "DB Split Squat",
  "smith machine split squat": "Smith Machine Split Squat",
  "alternating db drop lunges": "Alternating DB Drop Lunges",
  "alternating db drop lunge": "Alternating DB Drop Lunges",
  "leg press low narrow stance": "Leg Press Low Narrow Stance",
  "leg press low narrow": "Leg Press Low Narrow Stance",
  "bent over barbell row": "Bent Over Barbell Row",
  "bent over pronated db row": "Bent Over Pronated DB Row",
  "bent over pronated d": "Bent Over Pronated DB Row",
  "hammer strength high row": "Hammer Strength High Row",
  "hammer strength hig": "Hammer Strength High Row",
  "vulken grip pullover": "Vulken Grip Pullover",
  "db pullover": "DB Pullover",
  "dumbbell pullover": "DB Pullover",
  "single arm db row": "Single Arm DB Row",
  "incline pronated cable press": "Incline Pronated Cable Press",
  "incline pronated cabl": "Incline Pronated Cable Press",
  "incline barbell bench press": "Incline Barbell Bench Press",
  "incline barbell bench": "Incline Barbell Bench Press",
  "65° incline barbell bench press": "65° Incline Barbell Bench Press",
  "65 incline barbell bench": "65° Incline Barbell Bench Press",
  "barbell flat bench press": "Barbell Flat Bench Press",
  "flat bench pronated db press": "Flat Bench Pronated DB Press",
  "flat bench pronated d": "Flat Bench Pronated DB Press",
  "mid semi-supinated cable curl": "Mid Semi-Supinated Cable Curl",
  "mid semi supinated cable curl": "Mid Semi-Supinated Cable Curl",
  "barbell curl medium grip": "Barbell Curl Medium Grip",
  "ez-bar semi-supinated curl": "EZ-Bar Semi-Supinated Curl",
  "ezbar semisupinated": "EZ-Bar Semi-Supinated Curl",
  "neutral db preacher curl": "Neutral DB Preacher Curl",
  "dips mid grip": "Dips Mid Grip",
  "close grip barbell bench press": "Close Grip Barbell Bench Press",
  "close grip barbell ben": "Close Grip Barbell Bench Press",
  "leg press medium stance": "Leg Press Medium Stance",
  "leg press medium sta": "Leg Press Medium Stance",
  "barbell back squat": "Barbell Back Squat",
  "db goblet squat": "DB Goblet Squat",
  "goblet squat": "DB Goblet Squat",
  "hammer strength decline chest press": "Hammer Strength Decline Chest Press",
  "hammer strength dec": "Hammer Strength Decline Chest Press",
  "cable rope overhead extension": "Cable Rope Overhead Extension",
  "cable rope overhead": "Cable Rope Overhead Extension",
  "incline ez-bar skull crusher": "Incline EZ-Bar Skull Crusher",
  "incline ezbar skull crusher": "Incline EZ-Bar Skull Crusher",
  "flat bench db skull crusher": "Flat Bench DB Skull Crusher",
  "single arm leaning cable lateral raise": "Single Arm Leaning Cable Lateral Raise",
  "single arm leaning ca": "Single Arm Leaning Cable Lateral Raise",
  "wide grip barbell upright row": "Wide Grip Barbell Upright Row",
  "wide grip barbell upri": "Wide Grip Barbell Upright Row",
  "hammer strength seated shoulder press": "Hammer Strength Seated Shoulder Press",
  "hammer strength sea": "Hammer Strength Seated Shoulder Press",
  "seated barbell shoulder press": "Seated Barbell Shoulder Press",
  "seated barbell should": "Seated Barbell Shoulder Press",
  "seated db shoulder press": "Seated DB Shoulder Press",
  "hyperextensions": "Hyperextensions",
  "barbell stiff leg deadlift": "Barbell Stiff Leg Deadlift",
  "barbell stiff leg deadl": "Barbell Stiff Leg Deadlift",
  "db rdl": "DB RDL",
  "lying leg curl neutral": "Lying Leg Curl Neutral",
  "lying db hamstring curl": "Lying DB Hamstring Curl",
  "lying db hamstring c": "Lying DB Hamstring Curl",
  "horizontal back extension": "Horizontal Back Extension",
  "horizontal back exten": "Horizontal Back Extension",
  "barbell medium stance good morning": "Barbell Medium Stance Good Morning",
  "barbell medium stanc": "Barbell Medium Stance Good Morning",
  "45° db back extension": "45° DB Back Extension",
  "45 db back extension": "45° DB Back Extension",
  "pendulum squat medium high stance": "Pendulum Squat Medium High Stance",
  "pendulum squat medi": "Pendulum Squat Medium High Stance",
  "seated hamstring curl": "Hamstring Curl (Warm-up)",
  "adductor machine": "Adductor / Sus Machine (Warm-up)",
  "forearm wrist curl": "Forearm Reverse Curl",
  "lateral raise": "Dumbbell Lateral Raise",
  "push a": "Flat Barbell Bench Press",
  "pull a": "Weighted Pull-Ups or Wide-Grip Lat Pulldowns",
  "flat barbell bench": "Flat Barbell Bench Press",
  "pec deck flyes": "Pec Deck Flyes",
  "cable chest flyes": "Cable Chest Flyes",
  "tricep rope pushdowns": "Tricep Rope Pushdowns",
  "barbell curls": "Barbell Curls",
  "bulgarian split squat": "Bulgarian Split Squats",
  "trap bar deadlift": "Conventional Deadlifts or Trap Bar Deadlifts",
  "smith squat": "Smith Machine Back Squat",
  "back squat": "Smith Machine Back Squat",
  "front squat": "Smith Machine Front Squat",
  "bulgarian split squat db": "DB Bulgarian Split Squat",
  "walking lunge": "DB Walking Lunges",
  "narrow stance leg press": "Leg Press Narrow Stance",
  "wide stance leg press": "Leg Press Wide Stance",
  "overhand pulldown": "Overhand Lat Pulldown",
  "underhand pulldown": "Underhand Lat Pulldown",
  "t bar chest supported": "Chest Supported T-Bar Row",
  "rope pullover": "Cable Rope Pullover",
  "chin up": "Medium Grip Chin Up",
  "chin-up": "Medium Grip Chin Up",
  "hs chest press": "Hammer Strength Flat Chest Press",
  "incline db press": "Incline Pronated DB Bench Press",
  "mid cable fly": "Cable Chest Fly — Mid",
  "rdl": "Barbell RDL",
  "lying leg curl": "Lying Leg Curl — Neutral (Dorsiflexed)",
  "hip thrust": "Machine Hip Thrust",
  "skullcrushers": "Incline DB Skull Crushers",
  "military press": "Barbell Medium Grip Military Press",
  "scott curl": "Single Arm Neutral DB Scott Curl",

  // —— Derrick Recomp program names → existing catalog entries ——
  // The catalog grew around the earlier PPL program, so these movements had
  // cues, swaps and form videos already; they were simply filed under other
  // names and every lookup missed.
  "chest-supported db row": "Chest-Supported Row",
  "1-arm cable / db row": "Single Arm DB Row",
  "machine / cable chest press": "Chest Press",
  "cable pushdown": "Triceps Pushdown",
  "overhead rope extension": "Overhead Cable Tricep Extensions (Rope)",
  "overhead rope / db extension": "Overhead Cable Tricep Extensions (Rope)",
  "close-grip / neutral db press": "Close Grip Barbell Bench Press",
  "landmine press / 30° incline db press": "Incline DB Bench",
  "neutral pulldown / assisted chin": "Lat Pulldown",
  "rear-delt fly": "Rear Delt Raise",
  "rear delt fly / face pull": "Rear Delt Raise",
  "leg curl": "Lying Leg Curl",
  "calf raise": "Standing Calf Raise",
  "walking lunge / split squat": "DB Walking Lunges",
  "goblet / safety-bar / hack squat": "Hack Squat / Barbell Squat",
  "hip thrust / glute bridge": "Hip Thrust",
  "leg extension": "Leg Extension",
  "seated cable row": "Seated Cable Row",
};

const byName = new Map(EXERCISE_CATALOG.map((e) => [e.name.toLowerCase(), e]));

function lookupKey(key: string) {
  const direct = byName.get(key);
  if (direct) return direct;
  const alias = ALIASES[key];
  if (alias) return byName.get(alias.toLowerCase());
  return undefined;
}

export function catalogEntry(name: string) {
  const raw = name.trim();
  if (!raw) return undefined;

  const key = raw.toLowerCase();
  const hit = lookupKey(key);
  if (hit) return hit;

  // Strip warm-up suffix: "Lateral Raise (Warm-up)" → try base + warm-up entry
  const noWarm = key.replace(/\s*\(warm-?up\)\s*$/i, "").trim();
  if (noWarm !== key) {
    const warmHit = lookupKey(`${noWarm} (warm-up)`) ?? lookupKey(noWarm);
    if (warmHit) return warmHit;
  }

  // Slash options: "A / B" → try full alias, then first, then second
  if (key.includes(" / ")) {
    const parts = key.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      const partHit = lookupKey(p);
      if (partHit) return partHit;
    }
  }

  return undefined;
}

/**
 * A form-video link for any exercise, curated or not.
 *
 * The catalog only covers movements someone has filed; a program can always
 * name one it has never seen (prehab work, carries, a gym-specific machine).
 * Rather than leave those with no Form button, fall back to a YouTube search
 * for the movement — it never 404s and needs no upkeep as the library grows.
 */
export function formVideoUrl(name: string): string {
  const curated = catalogEntry(name)?.youtubeUrl;
  if (curated) return curated;
  const query = `${name.replace(/\s*\/\s*/g, " or ").trim()} exercise form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** True when the link is a curated demo rather than a search fallback. */
export function hasCuratedVideo(name: string): boolean {
  return Boolean(catalogEntry(name)?.youtubeUrl);
}

export function findAlternatives(name: string) {
  return catalogEntry(name)?.alternatives ?? [];
}

/** Muscle families so "Upper Chest" still matches "Chest" swaps, etc. */
const MUSCLE_FAMILY: Record<string, string> = {
  chest: "chest",
  "upper chest": "chest",
  lats: "back",
  back: "back",
  traps: "back",
  "rear delts": "rear_delts",
  "side delts": "side_delts",
  shoulders: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  quads: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  calves: "calves",
  adductors: "adductors",
  core: "core",
  abs: "core",
  "lower back": "hamstrings",
  posterior: "hamstrings",
  cardio: "cardio",
};

export function muscleFamily(muscle: string): string {
  const key = muscle.trim().toLowerCase();
  return MUSCLE_FAMILY[key] ?? key;
}

export function sameMuscleFamily(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false;
  return muscleFamily(a) === muscleFamily(b);
}

export type SwapRecommendation = {
  name: string;
  /** Curated swap for this movement */
  recommended: boolean;
  /** Same muscle family, not in the curated list */
  similar: boolean;
  muscle?: string;
  youtubeUrl?: string;
};

export function youtubeThumb(url?: string | null) {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/
  );
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
}

/**
 * Recommendations = curated alternatives.
 * Similar = other catalog lifts in the same muscle family.
 */
export function getSwapRecommendations(
  exerciseName: string,
  muscleHint?: string
): SwapRecommendation[] {
  const entry = catalogEntry(exerciseName);
  const targetMuscle = (muscleHint || entry?.muscle || "").trim();
  const targetFamily = targetMuscle ? muscleFamily(targetMuscle) : "";
  const currentKey = exerciseName.trim().toLowerCase();

  const seen = new Set<string>();
  const out: SwapRecommendation[] = [];

  function push(
    name: string,
    flags: { recommended?: boolean; similar?: boolean }
  ) {
    const key = name.trim().toLowerCase();
    if (!key || key === currentKey || seen.has(key)) return;
    // Never propose a movement the active program rules out.
    if (isContraindicated(name)) return;
    seen.add(key);
    const altEntry = catalogEntry(name);
    out.push({
      name,
      recommended: Boolean(flags.recommended),
      similar: Boolean(flags.similar),
      muscle: altEntry?.muscle || targetMuscle || undefined,
      youtubeUrl: altEntry?.youtubeUrl,
    });
  }

  for (const a of entry?.alternatives ?? []) {
    push(a, { recommended: true });
  }

  if (targetFamily) {
    let extras = 0;
    for (const e of EXERCISE_CATALOG) {
      if (extras >= 14) break;
      if (!sameMuscleFamily(targetMuscle, e.muscle)) continue;
      const before = seen.size;
      push(e.name, { similar: true });
      if (seen.size > before) extras += 1;
    }
  }

  return out;
}

export function searchExerciseCatalog(
  query: string,
  excludeName?: string
): SwapRecommendation[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const exclude = (excludeName || "").trim().toLowerCase();
  const hits: SwapRecommendation[] = [];
  for (const e of EXERCISE_CATALOG) {
    if (e.name.toLowerCase() === exclude) continue;
    const hay = `${e.name} ${e.muscle}`.toLowerCase();
    if (!hay.includes(q)) continue;
    hits.push({
      name: e.name,
      recommended: false,
      similar: true,
      muscle: e.muscle,
      youtubeUrl: e.youtubeUrl,
    });
    if (hits.length >= 24) break;
  }
  return hits;
}
