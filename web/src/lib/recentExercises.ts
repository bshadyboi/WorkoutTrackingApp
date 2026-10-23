import { createClient } from "@/lib/supabase/client";

export type RecentSession = {
  id: string;
  day_name: string;
  started_at: string;
  set_logs: {
    exercise_name: string;
    set_number: number;
    weight: number | null;
    reps: number | null;
    is_completed?: boolean | null;
    is_warmup?: boolean | null;
    side?: "L" | "R" | null;
  }[] | null;
};
export type RecentExercise = {
  name: string;
  lastAt: string;
  dayName: string;
  lastSets: { weight: number; reps: number; side?: string | null }[];
};

/** Use workout dates, including backfilled dates, rather than insertion order. */
export function buildRecentExercises(sessions: RecentSession[]): RecentExercise[] {
  const found = new Map<string, RecentExercise>();
  const ordered = [...sessions].filter(s => Number.isFinite(Date.parse(s.started_at)))
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at) || a.id.localeCompare(b.id));
  for (const session of ordered) {
    const grouped = new Map<string, { name: string; rows: NonNullable<RecentSession["set_logs"]> }>();
    for (const row of session.set_logs ?? []) {
      if (row.is_completed === false || row.is_warmup) continue;
      const name = (row.exercise_name ?? "").replace(/\s*\[R\]$/i, "").trim();
      if (!name || /warm[\s-]?up/i.test(name)) continue;
      const key = name.toLowerCase();
      if (found.has(key)) continue;
      const group = grouped.get(key) ?? { name, rows: [] };
      group.rows.push(row);
      grouped.set(key, group);
    }
    for (const [key, group] of grouped) {
      const sides = new Map<string, { weight: number; reps: number; side?: string | null }>();
      for (const row of [...group.rows].sort((a, b) => b.set_number - a.set_number)) {
        const side = row.side ?? (/\[R\]$/i.test(row.exercise_name) ? "R" : "");
        if (sides.has(side) || row.weight == null || row.reps == null || !Number.isFinite(row.weight) || !Number.isFinite(row.reps) || row.reps <= 0) continue;
        sides.set(side, { weight: row.weight, reps: row.reps, side });
      }
      found.set(key, { name: group.name, lastAt: session.started_at, dayName: session.day_name,
        lastSets: [...sides.values()].sort((a, b) => (a.side ?? "").localeCompare(b.side ?? "")) });
    }
  }
  return [...found.values()];
}

/** Load existing signed-in history each time the picker opens; no stale cross-account cache. */
export async function getRecentExercises(): Promise<RecentExercise[]> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Sign in to load your recent exercises.");
  const sessions: RecentSession[] = [];
  const pageSize = 100;
  let includeSide = true;
  for (let offset = 0; ; offset += pageSize) {
    const query = () => supabase.from("workout_sessions")
      .select(`id, day_name, started_at, set_logs(exercise_name, set_number, weight, reps, is_completed, is_warmup${includeSide ? ", side" : ""})`)
      .eq("user_id", auth.user!.id).not("ended_at", "is", null)
      .order("started_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    let result = await query();
    if (result.error && includeSide && /\bside\b/i.test(result.error.message)) {
      includeSide = false;
      result = await query();
    }
    if (result.error) throw new Error("Could not load recent exercises. Try again when connected.");
    const rows = (result.data ?? []) as unknown as RecentSession[];
    sessions.push(...rows);
    if (rows.length < pageSize) break;
  }
  return buildRecentExercises(sessions);
}
