import { createClient } from "@/lib/supabase/client";
import { hasOwnTargets } from "@/lib/targets";
import {
  OBSOLETE_WORKOUT_NAMES,
  type WorkoutTemplate,
} from "@/lib/workouts";
import {
  DEFAULT_PROGRAM_ID,
  getProgram,
  isProgramId,
  type ProgramId,
} from "@/lib/programs";
import { LEGACY_ELEVATE_DAY_NAMES } from "@/lib/elevateChallenge";
import { DERRICK_RECOMP_START, LEGACY_DERRICK_DAY_NAMES } from "@/lib/derrickRecomp";
import { parseOverrides, parseSlots, type ScheduleSlots } from "@/lib/schedule";

const LEFT_SHOULDER_FLAG = "fittrack-left-shoulder-swaps-20260915";

/** Day-name prefix → [old exercise name, new exercise name] for that day only. */
const LEFT_SHOULDER_RENAMES: [string, [string, string][]][] = [
  ["Push A", [["Landmine Press", "One-Arm Landmine Press"], ["Lateral Raise", "One-Arm Cable Lateral Raise"]]],
  [
    "Pull A",
    [
      ["Neutral Pulldown / Assisted Chin", "Single-Arm Pulldown"],
      ["Chest-Supported T-Bar Row", "Chest-Supported DB Row"],
      ["Seated Cable Row", "Seated One-Arm Cable Row (D-Handle)"],
      ["Straight-Arm Pulldown", "One-Arm DB Row"],
    ],
  ],
  ["Legs + Pump", [["Overhead Rope Extension", "Unilateral Tricep Pushdown"]]],
  [
    "Push B",
    [
      ["Incline Machine / Cable Chest Press", "One-Arm Cable Chest Press"],
      ["Rear-Delt Fly", "Jeff Nippard Single Arm Rear Delt Fly"],
      ["Overhead Rope Extension", "Unilateral Tricep Pushdown"],
    ],
  ],
];

const PT_PREHAB = [
  { name: "Pec Ball Roll (SMR)", muscle: "Chest", default_sets: 1, working_rep_range: "1×30s per side" },
  { name: "Doorway Pec Stretch (Single Arm)", muscle: "Chest", default_sets: 1, working_rep_range: "1×35s per side" },
  { name: "Scapular Squeeze", muscle: "Back", default_sets: 2, working_rep_range: "2×15 · 2s hold" },
];

/**
 * Brings existing accounts onto the left-shoulder layout without resetting the
 * program. Rows are renamed in place so exercise ids — and any workout in
 * progress keyed by them — survive; set history is deliberately left under the
 * old names, since these are different movements. Every step matches on the
 * old state, so running it again is a no-op.
 */
async function applyLeftShoulderSwaps() {
  if (localStorage.getItem(LEFT_SHOULDER_FLAG) === "1") return;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  const { data: days, error } = await supabase
    .from("workout_days")
    .select("id, name, workout_exercises(id, name, sort_order)")
    .eq("user_id", user.id);
  if (error || !days) return;

  let failed = false;
  for (const day of days) {
    const exercises = (day.workout_exercises as { id: string; name: string; sort_order: number }[] | null) ?? [];
    const renames = LEFT_SHOULDER_RENAMES.find(([prefix]) => day.name.startsWith(prefix))?.[1] ?? [];
    for (const [from, to] of renames) {
      const row = exercises.find((e) => e.name === from);
      if (!row) continue;
      const { error: e } = await supabase.from("workout_exercises").update({ name: to }).eq("id", row.id);
      if (e) failed = true;
    }

    const isPrehabDay = exercises.some((e) => e.name === "Band Pull-Aparts");
    if (!isPrehabDay) continue;

    const yt = exercises.find((e) => e.name === "Prone Y / T Raise");
    if (yt) {
      const { error: e } = await supabase.from("workout_exercises").update({ name: "Prone T Raise" }).eq("id", yt.id);
      if (e) failed = true;
    }
    const slides = exercises.find((e) => e.name === "Scapular Wall Slides");
    if (slides) {
      const { error: e } = await supabase.from("workout_exercises").delete().eq("id", slides.id);
      if (e) failed = true;
    }
    const missing = PT_PREHAB.filter((p) => !exercises.some((e) => e.name === p.name));
    if (missing.length) {
      // Negative sort orders put the PT's moves ahead of the existing prehab
      // without renumbering (and so without touching) the rows already there.
      const lowest = Math.min(0, ...exercises.map((e) => e.sort_order));
      const { error: e } = await supabase.from("workout_exercises").insert(
        missing.map((p, i) => ({
          workout_day_id: day.id,
          name: p.name,
          muscle: p.muscle,
          default_sets: p.default_sets,
          has_crown_set: false,
          crown_rep_range: "",
          working_rep_range: p.working_rep_range,
          sort_order: lowest - missing.length + i,
        }))
      );
      if (e) failed = true;
    }
  }

  if (!failed) {
    try {
      localStorage.setItem(LEFT_SHOULDER_FLAG, "1");
      sessionStorage.removeItem("ft-tab:train");
      sessionStorage.removeItem("ft-tab:dashboard");
    } catch {
      /* ignore */
    }
  }
}

/** One-time: switch to Derrick Recomp 4-day Tue start + dedupe days. */
/** Bumped for the Shoulder-Safe Aesthetics layout (Push/Pull/Legs, starts Sep 14). */
const SWITCH_DERRICK_FLAG = "fittrack-switch-shoulder-safe-aesthetics-20260914";
const FLAG = "fittrack-lib-synced-v18b-derrick-dedupe";

async function upsertTemplateDay(
  userId: string,
  template: WorkoutTemplate,
  sortOrder: number
) {
  const supabase = createClient();
  const { data: existingRows } = await supabase
    .from("workout_days")
    .select("id")
    .eq("user_id", userId)
    .eq("name", template.name)
    .order("sort_order");

  const rows = existingRows ?? [];
  let dayId = rows[0]?.id as string | undefined;

  // Collapse accidental duplicates (same name inserted more than once)
  for (const extra of rows.slice(1)) {
    await supabase.from("workout_exercises").delete().eq("workout_day_id", extra.id);
    await supabase.from("workout_days").delete().eq("id", extra.id);
  }

  if (dayId) {
    await supabase
      .from("workout_days")
      .update({ subtitle: template.subtitle, sort_order: sortOrder })
      .eq("id", dayId);

    await supabase.from("workout_exercises").delete().eq("workout_day_id", dayId);
    await supabase.from("workout_exercises").insert(
      template.exercises.map((ex, i) => ({
        workout_day_id: dayId!,
        name: ex.name,
        muscle: ex.muscle,
        default_sets: ex.defaultSets,
        has_crown_set: ex.hasCrownSet,
        crown_rep_range: ex.crownRepRange,
        working_rep_range: ex.workingRepRange,
        sort_order: i,
      }))
    );
    return dayId;
  }

  const { data: inserted } = await supabase
    .from("workout_days")
    .insert({
      user_id: userId,
      name: template.name,
      subtitle: template.subtitle,
      sort_order: sortOrder,
    })
    .select("id")
    .single();
  dayId = inserted?.id;

  if (!dayId) return null;

  await supabase.from("workout_exercises").insert(
    template.exercises.map((ex, i) => ({
      workout_day_id: dayId!,
      name: ex.name,
      muscle: ex.muscle,
      default_sets: ex.defaultSets,
      has_crown_set: ex.hasCrownSet,
      crown_rep_range: ex.crownRepRange,
      working_rep_range: ex.workingRepRange,
      sort_order: i,
    }))
  );
  return dayId;
}

async function removeDaysByName(userId: string, names: string[]) {
  const supabase = createClient();
  for (const name of names) {
    const { data: rows } = await supabase
      .from("workout_days")
      .select("id")
      .eq("user_id", userId)
      .eq("name", name);
    for (const row of rows ?? []) {
      await supabase.from("workout_exercises").delete().eq("workout_day_id", row.id);
      await supabase.from("workout_days").delete().eq("id", row.id);
    }
  }
}

/** Collapse any workout_days that share the same name (keep lowest sort_order). */
async function dedupeWorkoutDaysByName(userId: string) {
  const supabase = createClient();
  const { data: all } = await supabase
    .from("workout_days")
    .select("id, name, sort_order")
    .eq("user_id", userId)
    .order("sort_order");

  const seen = new Map<string, string>();
  for (const row of all ?? []) {
    const key = row.name.trim().toLowerCase();
    const keepId = seen.get(key);
    if (!keepId) {
      seen.set(key, row.id);
      continue;
    }
    await supabase.from("workout_exercises").delete().eq("workout_day_id", row.id);
    await supabase.from("workout_days").delete().eq("id", row.id);
  }
}

async function applyWeeklySlots(
  userId: string,
  programId: ProgramId,
  days: { id: string; name: string }[],
  clearOverrides: boolean
) {
  const supabase = createClient();
  const program = getProgram(programId);
  const slots: ScheduleSlots = program.seedSlots(days);
  const { data: sched } = await supabase
    .from("training_schedules")
    .select("date_overrides")
    .eq("user_id", userId)
    .maybeSingle();

  await supabase.from("training_schedules").upsert({
    user_id: userId,
    day_ids: slots,
    date_overrides: clearOverrides ? {} : (sched?.date_overrides ?? {}),
    updated_at: new Date().toISOString(),
    updated_by: userId,
  });
}

async function setActiveProgram(userId: string, programId: ProgramId) {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ active_program: programId })
    .eq("id", userId);

  // Column may not exist yet — ignore so apply still works
  if (error && !/active_program/i.test(error.message)) {
    throw new Error(error.message);
  }
}

export async function getActiveProgramId(): Promise<ProgramId> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return DEFAULT_PROGRAM_ID;

  const { data } = await supabase
    .from("profiles")
    .select("active_program")
    .eq("id", user.id)
    .maybeSingle();

  return isProgramId(data?.active_program)
    ? data.active_program
    : DEFAULT_PROGRAM_ID;
}

/**
 * Switch training program.
 * replace=true removes the other program's day templates and clears date overrides.
 */
export async function applyProgram(
  programId: ProgramId,
  opts: { replace?: boolean } = {}
): Promise<{ ok: true } | { ok: false; error: string }> {
  const replace = opts.replace !== false;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { ok: false, error: "Sign in required" };

  const program = getProgram(programId);

  try {
    await dedupeWorkoutDaysByName(user.id);

    // Drop legacy obsolete names always
    await removeDaysByName(user.id, [...OBSOLETE_WORKOUT_NAMES]);
    if (programId === "elevate-challenge") {
      await removeDaysByName(user.id, LEGACY_ELEVATE_DAY_NAMES);
    }
    if (programId === "derrick-recomp") {
      await removeDaysByName(user.id, LEGACY_DERRICK_DAY_NAMES);
    }

    if (replace) {
      const otherNames = Object.values(
        (await import("@/lib/programs")).PROGRAMS
      )
        .filter((p) => p.id !== programId)
        .flatMap((p) => p.dayNames);
      await removeDaysByName(user.id, otherNames);
    }

    const dayIds: { id: string; name: string }[] = [];
    for (const [i, template] of program.workouts.entries()) {
      const id = await upsertTemplateDay(user.id, template, i);
      if (id) dayIds.push({ id, name: template.name });
    }

    // Re-fetch all days so seedSlots can resolve IDs
    const { data: allDays } = await supabase
      .from("workout_days")
      .select("id, name")
      .eq("user_id", user.id);
    const days = (allDays ?? []).map((d) => ({ id: d.id, name: d.name }));

    await applyWeeklySlots(user.id, programId, days, replace);
    await setActiveProgram(user.id, programId);

    try {
      sessionStorage.removeItem("ft-tab:train");
      sessionStorage.removeItem("ft-tab:dashboard");
      localStorage.setItem(FLAG, "1");
      localStorage.setItem("fittrack-active-program", programId);
    } catch {
      /* ignore */
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not switch program",
    };
  }
}

/**
 * One-time sync: ensure current (or default) program templates exist.
 * Does not wipe other programs unless never synced.
 */
export async function syncWorkoutLibraryOnce() {
  if (typeof window === "undefined") return;

  await applyLeftShoulderSwaps();

  // Soft-switch to Derrick Recomp; keep Elevate / PPL templates in Manage
  if (localStorage.getItem(SWITCH_DERRICK_FLAG) !== "1") {
    const res = await applyProgram("derrick-recomp", { replace: true });
    if (res.ok) {
      try {
        localStorage.setItem(SWITCH_DERRICK_FLAG, "1");
        localStorage.setItem(FLAG, "1");
      } catch {
        /* ignore */
      }
      await applyDerrickBaselineMacros();
      await restUntilProgramStart();
    }
    return;
  }

  if (localStorage.getItem(FLAG) === "1") return;

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  const programId = await getActiveProgramId();
  // Soft sync — upsert active program days + slots, keep other days
  const res = await applyProgram(programId, { replace: false });
  if (res.ok) {
    localStorage.setItem(FLAG, "1");
  }
}

/** Force re-sync of the active program (no full replace). */
export async function forceSyncWorkoutLibrary() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FLAG);
  await syncWorkoutLibraryOnce();
}

/** Seed Derrick baseline macros on profile (once per switch). */
/**
 * The new weekly layout applies the moment it syncs, so a switch made before the
 * start date would put a workout on days the lifter is not training yet. Mark
 * those days as rest; a date the lifter already overrode is left alone.
 */
async function restUntilProgramStart() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  const pad = (n: number) => String(n).padStart(2, "0");
  const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const day = new Date();
  day.setHours(12, 0, 0, 0);
  const pending: string[] = [];
  while (keyOf(day) < DERRICK_RECOMP_START) {
    pending.push(keyOf(day));
    day.setDate(day.getDate() + 1);
  }
  if (!pending.length) return;

  const { data: sched } = await supabase
    .from("training_schedules")
    .select("day_ids, date_overrides")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sched) return;

  const overrides = parseOverrides(sched.date_overrides);
  let changed = false;
  for (const key of pending) {
    if (!Object.prototype.hasOwnProperty.call(overrides, key)) {
      overrides[key] = null;
      changed = true;
    }
  }
  if (!changed) return;
  await supabase
    .from("training_schedules")
    .update({ date_overrides: overrides })
    .eq("user_id", user.id);
}

async function applyDerrickBaselineMacros() {
  const { DERRICK_RECOMP_BASELINE } = await import("@/lib/derrickRecomp");
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  // Program setup is keyed to a localStorage flag, so it re-runs on any new
  // browser or after iOS evicts PWA storage. Seed the baseline only for a
  // profile with no targets — never overwrite ones the lifter has set.
  const { data: current } = await supabase
    .from("profiles")
    .select("target_calories, target_protein, target_carbs, target_fats")
    .eq("id", user.id)
    .maybeSingle();
  if (hasOwnTargets(current)) return;

  await supabase
    .from("profiles")
    .update({
      target_calories: DERRICK_RECOMP_BASELINE.target_calories,
      target_protein: DERRICK_RECOMP_BASELINE.target_protein,
      target_carbs: DERRICK_RECOMP_BASELINE.target_carbs,
      target_fats: DERRICK_RECOMP_BASELINE.target_fats,
    })
    .eq("id", user.id);
}

/** Log a Rest day. */
export async function markRestDayComplete(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { ok: false, error: "Sign in required" };

  const now = new Date().toISOString();
  const { error } = await supabase.from("workout_sessions").insert({
    user_id: user.id,
    day_name: "Rest",
    started_at: now,
    ended_at: now,
    duration_seconds: 0,
    notes: "Scheduled rest day",
  });

  if (error) return { ok: false, error: error.message };

  try {
    sessionStorage.removeItem("ft-tab:train");
    sessionStorage.removeItem("ft-tab:dashboard");
  } catch {
    /* ignore */
  }
  return { ok: true };
}

/** Read weekly slots for UI (client). */
export async function loadScheduleSlots(): Promise<ScheduleSlots | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data } = await supabase
    .from("training_schedules")
    .select("day_ids")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.day_ids ? parseSlots(data.day_ids) : null;
}

/** Toggle Elevate Week A vs Week B schedule (even-week days). */
export async function setElevateWeek(
  week: "A" | "B"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { ok: false, error: "Sign in required" };

  const { data: days } = await supabase
    .from("workout_days")
    .select("id, name")
    .eq("user_id", user.id);

  const { seedElevateChallengeSlots } = await import("@/lib/schedule");
  const slots = seedElevateChallengeSlots(days ?? [], week);
  const { data: sched } = await supabase
    .from("training_schedules")
    .select("date_overrides")
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("training_schedules").upsert({
    user_id: user.id,
    day_ids: slots,
    date_overrides: sched?.date_overrides ?? {},
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  try {
    localStorage.setItem("fittrack-elevate-week", week);
    sessionStorage.removeItem("ft-tab:train");
    sessionStorage.removeItem("ft-tab:dashboard");
  } catch {
    /* ignore */
  }
  return { ok: true };
}
