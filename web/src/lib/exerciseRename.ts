import { createClient } from "@/lib/supabase/client";

/**
 * Make an exercise rename permanent.
 *
 * History is keyed by `set_logs.exercise_name` (there is no exercise_id), so a
 * rename that only lived in the session draft silently orphaned past sets: the
 * work logged under the new name, while the next session looked the movement up
 * under the template's old name and found nothing to show or pre-fill.
 *
 * Renaming therefore has to move the plan and the history together. Both
 * statements rely on row-level security to scope them to the caller — the
 * policies on workout_exercises and set_logs already restrict writes to rows
 * reachable from the user's own days and sessions, so a bare name match cannot
 * touch anyone else's data.
 */
export async function renameExerciseEverywhere(
  oldName: string,
  newName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const from = oldName.trim();
  const to = newName.trim();
  if (!to) return { ok: false, error: "Name cannot be empty" };
  if (!from || from === to) return { ok: true };

  const supabase = createClient();

  const planned = await supabase
    .from("workout_exercises")
    .update({ name: to })
    .eq("name", from);

  if (planned.error) return { ok: false, error: planned.error.message };

  const logged = await supabase
    .from("set_logs")
    .update({ exercise_name: to })
    .eq("exercise_name", from);

  if (logged.error) return { ok: false, error: logged.error.message };

  return { ok: true };
}
