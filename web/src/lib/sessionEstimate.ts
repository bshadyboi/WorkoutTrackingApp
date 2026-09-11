import type { DraftSet } from "@/lib/sessionDraft";

const WORK_SECONDS_PER_SET = 40;

type ExerciseLike = {
  id: string;
  muscle: string;
};

/**
 * Rough time left from unfinished sets × (work + rest).
 * Warm-ups use shorter assumed rest (≤90s).
 */
export function estimateRemainingSeconds(input: {
  exercises: ExerciseLike[];
  setsByExercise: Record<string, DraftSet[]>;
  restByExercise: Record<string, number>;
  defaultRest: (ex: ExerciseLike, setIndex: number) => number;
}): number {
  const queue: number[] = []; // rest after each remaining set

  for (const ex of input.exercises) {
    if (ex.muscle === "Cardio") {
      const done = input.setsByExercise[ex.id]?.[0]?.completed;
      if (!done) queue.push(0);
      continue;
    }
    const sets = input.setsByExercise[ex.id] ?? [];
    const baseRest = input.restByExercise[ex.id] ?? input.defaultRest(ex, 0);
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      if (set.completed) continue;
      const rest = set.isWarmup ? Math.min(baseRest, 90) : baseRest;
      queue.push(rest);
    }
  }

  if (!queue.length) return 0;

  let total = 0;
  for (let i = 0; i < queue.length; i++) {
    total += WORK_SECONDS_PER_SET;
    if (i < queue.length - 1) total += queue[i];
  }
  return total;
}

export function formatEstimateMinutes(seconds: number) {
  if (seconds <= 0) return "done";
  const m = Math.max(1, Math.round(seconds / 60));
  return `~${m}m left`;
}
