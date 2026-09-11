import { createClient } from "@/lib/supabase/client";
import { parseOverrides, type DateOverrides } from "@/lib/schedule";

/**
 * Set or clear a one-off calendar override (does not change the weekly template).
 * - dayId string → train that day
 * - null → Rest for that date
 * - undefined → remove override (back to weekly schedule)
 */
export async function saveDateOverride(
  dateStr: string,
  dayId: string | null | undefined
): Promise<{ ok: true; overrides: DateOverrides } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { ok: false, error: "Sign in required" };

  const { data: sched } = await supabase
    .from("training_schedules")
    .select("day_ids, date_overrides")
    .eq("user_id", user.id)
    .maybeSingle();

  const overrides = parseOverrides(sched?.date_overrides);
  if (dayId === undefined) {
    delete overrides[dateStr];
  } else {
    overrides[dateStr] = dayId;
  }

  const { error } = await supabase.from("training_schedules").upsert({
    user_id: user.id,
    day_ids: sched?.day_ids ?? [null, null, null, null, null, null, null],
    date_overrides: overrides,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });

  if (error) {
    if (error.message.toLowerCase().includes("date_overrides")) {
      return {
        ok: false,
        error: "Run schema_schedule_overrides.sql in Supabase first.",
      };
    }
    return { ok: false, error: error.message };
  }

  try {
    sessionStorage.removeItem("ft-tab:train");
    sessionStorage.removeItem("ft-tab:dashboard");
  } catch {
    /* ignore */
  }

  return { ok: true, overrides };
}
