import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkoutLibrary, formatPrevious, getPreviousSetsByExercise } from "@/lib/data";

export default async function TrainPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureWorkoutLibrary(user.id);

  const { data: days } = await supabase
    .from("workout_days")
    .select("id, name, subtitle, sort_order, workout_exercises(*)")
    .eq("user_id", user.id)
    .order("sort_order");

  const previous = await getPreviousSetsByExercise(user.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Train</h1>
        <p className="text-sm text-[var(--muted)]">Pick a day · previous sets shown</p>
      </div>

      {(days ?? []).map((day) => {
        const exercises = [...(day.workout_exercises ?? [])].sort(
          (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
        );
        return (
          <Link key={day.id} href={`/train/${day.id}`} className="card block space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--blue)]">{day.name}</h2>
                <p className="text-xs text-[var(--muted)]">{exercises.length} exercises</p>
              </div>
              <span className="text-xs font-bold text-[var(--green)]">Start →</span>
            </div>
            <div className="space-y-2 border-t border-[var(--border)] pt-3">
              {exercises.slice(0, 3).map((ex: {
                id: string;
                name: string;
                has_crown_set: boolean;
                default_sets: number;
                crown_rep_range: string;
                working_rep_range: string;
              }) => (
                <div key={ex.id}>
                  <p className="text-sm font-semibold">{ex.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {ex.has_crown_set
                      ? `${ex.default_sets} × ${ex.crown_rep_range} / ${ex.working_rep_range}`
                      : `${ex.default_sets} × ${ex.working_rep_range}`}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatPrevious(previous[ex.name] ?? [])}
                  </p>
                </div>
              ))}
              {exercises.length > 3 ? (
                <p className="text-xs text-[var(--muted)]">+{exercises.length - 3} more</p>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
