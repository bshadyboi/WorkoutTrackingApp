import { createClient } from "@/lib/supabase/server";
import { BUILT_IN_WORKOUTS } from "@/lib/workouts";

export async function ensureWorkoutLibrary(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("workout_days")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) > 0) return;

  for (const [index, day] of BUILT_IN_WORKOUTS.entries()) {
    const { data: inserted, error } = await supabase
      .from("workout_days")
      .insert({
        user_id: userId,
        name: day.name,
        subtitle: day.subtitle,
        sort_order: index,
      })
      .select("id")
      .single();

    if (error || !inserted) continue;

    await supabase.from("workout_exercises").insert(
      day.exercises.map((ex, i) => ({
        workout_day_id: inserted.id,
        name: ex.name,
        muscle: ex.muscle,
        default_sets: ex.defaultSets,
        has_crown_set: ex.hasCrownSet,
        crown_rep_range: ex.crownRepRange,
        working_rep_range: ex.workingRepRange,
        sort_order: i,
      }))
    );
  }
}

export async function getPreviousSetsByExercise(userId: string) {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, started_at, set_logs(*)")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(40);

  const map: Record<string, { weight: number; reps: number }[]> = {};
  for (const session of sessions ?? []) {
    const logs = (session.set_logs ?? []) as {
      exercise_name: string;
      set_number: number;
      weight: number;
      reps: number;
      is_completed: boolean;
    }[];
    const byExercise: Record<string, typeof logs> = {};
    for (const log of logs.filter((l) => l.is_completed)) {
      byExercise[log.exercise_name] ??= [];
      byExercise[log.exercise_name].push(log);
    }
    for (const [name, sets] of Object.entries(byExercise)) {
      if (map[name]) continue;
      map[name] = sets
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({ weight: s.weight, reps: s.reps }));
    }
  }
  return map;
}

export function formatPrevious(sets: { weight: number; reps: number }[]) {
  if (!sets.length) return "no previous logged";
  return (
    "previous: " +
    sets
      .map((s) => {
        const w = Number.isInteger(s.weight) ? String(s.weight) : s.weight.toFixed(1);
        return `${w}×${s.reps}`;
      })
      .join(", ")
  );
}
