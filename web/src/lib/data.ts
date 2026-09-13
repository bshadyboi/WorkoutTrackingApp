import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PROTOCOL } from "@/lib/protocol";
import { BUILT_IN_WORKOUTS } from "@/lib/workouts";
import { buildAllTimeBest } from "@/lib/wins";

export async function ensureWorkoutLibrary(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("workout_days")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) > 0) return;

  for (const [index, day] of BUILT_IN_WORKOUTS.entries()) {
    await insertDay(supabase, userId, day, index);
  }
}

/**
 * Library seed only when empty. Coach Upper sync disabled —
 * program is now Upper A/B/C + Lower A/B (see workoutsClient sync).
 */
export async function syncCoachUpperAIfNeeded(_userId: string) {
  void _userId;
  return;
}

async function insertDay(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  day: (typeof BUILT_IN_WORKOUTS)[number],
  index: number
) {
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

  if (error || !inserted) return;

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

export async function ensureProtocolStack(userId: string) {
  const supabase = await createClient();
  const { data: existing, error } = await supabase
    .from("protocol_items")
    .select("id, name")
    .eq("user_id", userId);

  if (error) return;

  const names = (existing ?? []).map((r) => r.name);
  const expected = DEFAULT_PROTOCOL.map((p) => p.name);
  const hasLegacy = names.some((n) =>
    /tesa|wolverine|enclomiphene|bpc|enclo/i.test(n)
  );
  const missingNew = expected.some((n) => !names.includes(n));
  const needsSync = (existing?.length ?? 0) === 0 || hasLegacy || missingNew;

  if (!needsSync) return;

  if ((existing?.length ?? 0) > 0) {
    await supabase.from("protocol_items").delete().eq("user_id", userId);
  }

  await supabase.from("protocol_items").insert(
    DEFAULT_PROTOCOL.map((item, i) => ({
      user_id: userId,
      name: item.name,
      dosage: item.dosage,
      schedule_label: item.schedule_label,
      frequency_label: item.frequency_label,
      sort_order: i,
      taken_dates: "",
    }))
  );
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

  const map: Record<string, { weight: number; reps: number; rir: number | null }[]> = {};
  for (const session of sessions ?? []) {
    const logs = (session.set_logs ?? []) as {
      exercise_name: string;
      set_number: number;
      weight: number;
      reps: number;
      is_completed: boolean;
      is_warmup?: boolean;
      rir?: number | null;
    }[];
    const byExercise: Record<string, typeof logs> = {};
    for (const log of logs.filter((l) => l.is_completed)) {
      byExercise[log.exercise_name] ??= [];
      byExercise[log.exercise_name].push(log);
    }
    for (const [name, sets] of Object.entries(byExercise)) {
      if (map[name]) continue;
      const warmName = /warm[\s-]?up/i.test(name);
      const working = sets.filter((s) => !s.is_warmup);
      const use = warmName ? sets : working.length ? working : sets;
      map[name] = use
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({ weight: s.weight, reps: s.reps, rir: typeof s.rir === "number" ? s.rir : null }));
    }
  }
  return map;
}

/** All-time best working set per exercise (warm-ups ignored). */
export async function getAllTimeBestByExercise(userId: string) {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("set_logs(exercise_name, weight, reps, is_warmup, is_completed)")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(80);

  const rows: {
    exercise_name: string;
    weight: number;
    reps: number;
    is_warmup?: boolean;
    is_completed?: boolean;
  }[] = [];
  for (const session of sessions ?? []) {
    for (const log of (session.set_logs as typeof rows | null) ?? []) {
      if (log.is_completed === false) continue;
      rows.push(log);
    }
  }
  return buildAllTimeBest(rows);
}

export function formatPrevious(sets: { weight: number; reps: number }[]) {
  if (!sets.length) return "previous: —";
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
