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
  }[];
};

/** Coach Upper for Brandon (Jul 22, 2026) + existing lowers — mirrors iOS SeedData. */
export const BUILT_IN_WORKOUTS: WorkoutTemplate[] = [
  {
    name: "Upper A",
    subtitle: "Upper for Brandon · to failure · finish with cardio",
    exercises: [
      { name: "Pull-Ups", muscle: "Lats", defaultSets: 2, hasCrownSet: false, crownRepRange: "", workingRepRange: "2× Failure" },
      { name: "Incline DB Bench", muscle: "Upper Chest", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "2×4–8 + 1×8–12 backoff" },
      { name: "Pec Deck", muscle: "Chest", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "2×8–10 + 1×12 backoff" },
      { name: "Lat Pulldown", muscle: "Lats", defaultSets: 2, hasCrownSet: false, crownRepRange: "", workingRepRange: "2×8–10" },
      { name: "Mid-Back Rows", muscle: "Back", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "2×6–8 + 1×8–12 backoff" },
      { name: "DB Seated OHP", muscle: "Shoulders", defaultSets: 1, hasCrownSet: false, crownRepRange: "", workingRepRange: "1×8" },
      { name: "SA Cable Lateral Raise", muscle: "Side Delts", defaultSets: 2, hasCrownSet: false, crownRepRange: "", workingRepRange: "2×8–12" },
      { name: "Rear Delt Raise", muscle: "Rear Delts", defaultSets: 2, hasCrownSet: false, crownRepRange: "", workingRepRange: "2×8–12" },
      { name: "Hammer Curl", muscle: "Biceps", defaultSets: 2, hasCrownSet: false, crownRepRange: "", workingRepRange: "2× Failure" },
      { name: "SA Preacher Curl", muscle: "Biceps", defaultSets: 2, hasCrownSet: false, crownRepRange: "", workingRepRange: "2× Failure" },
      { name: "SA Pushdown", muscle: "Triceps", defaultSets: 2, hasCrownSet: false, crownRepRange: "", workingRepRange: "2× Failure" },
      { name: "Overhead Extension", muscle: "Triceps", defaultSets: 2, hasCrownSet: false, crownRepRange: "", workingRepRange: "2× Failure" },
      { name: "Forearm Reverse Curl", muscle: "Forearms", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "3× Failure" },
    ],
  },
  {
    name: "Lower B",
    subtitle: "Coach Upper/Lower — Max intensity",
    exercises: [
      { name: "Belt Squat", muscle: "Quads", defaultSets: 4, hasCrownSet: true, crownRepRange: "6–8", workingRepRange: "8–10" },
      { name: "Hip Thrust", muscle: "Glutes", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "8–12" },
      { name: "Lying Leg Curl", muscle: "Hamstrings", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "8–12" },
      { name: "Leg Extension", muscle: "Quads", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
      { name: "Hanging Leg Raise", muscle: "Abs", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
    ],
  },
  {
    name: "Upper B",
    subtitle: "Legacy upper — prefer Upper A (coach plan)",
    exercises: [
      { name: "Incline Chest Press", muscle: "Upper Chest", defaultSets: 4, hasCrownSet: true, crownRepRange: "6–8", workingRepRange: "8–10" },
      { name: "Seated Cable Row", muscle: "Back", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "8–12" },
      { name: "Reverse Fly", muscle: "Rear Delts", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
      { name: "Overhead Triceps Extension", muscle: "Triceps", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
      { name: "Hammer Curl", muscle: "Biceps", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
    ],
  },
  {
    name: "Upper C",
    subtitle: "Legacy upper — prefer Upper A (coach plan)",
    exercises: [
      { name: "Lat Pulldown", muscle: "Lats", defaultSets: 4, hasCrownSet: true, crownRepRange: "6–8", workingRepRange: "8–10" },
      { name: "Chest Fly", muscle: "Chest", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
      { name: "Rear Delt Pulls", muscle: "Rear Delts", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
      { name: "Triceps Extension", muscle: "Triceps", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
      { name: "Incline Curl", muscle: "Biceps", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
    ],
  },
  {
    name: "Lower A",
    subtitle: "Coach Upper/Lower — Max intensity",
    exercises: [
      { name: "Leg Press", muscle: "Quads", defaultSets: 4, hasCrownSet: true, crownRepRange: "6–8", workingRepRange: "8–10" },
      { name: "Seated Leg Curl", muscle: "Hamstrings", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "8–12" },
      { name: "Leg Extension", muscle: "Quads", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
      { name: "Standing Calf Raise", muscle: "Calves", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
      { name: "Cable Crunch", muscle: "Abs", defaultSets: 3, hasCrownSet: false, crownRepRange: "", workingRepRange: "12–15" },
    ],
  },
];

export function prescriptionLine(ex: WorkoutTemplate["exercises"][0]) {
  if (ex.hasCrownSet) {
    return `${ex.defaultSets} × ${ex.crownRepRange} / ${ex.workingRepRange} · rest 4m`;
  }
  const range = ex.workingRepRange;
  if (range.includes("×") || range.toLowerCase().includes("failure")) {
    return range;
  }
  return `${ex.defaultSets} × ${range} · rest 3m`;
}
