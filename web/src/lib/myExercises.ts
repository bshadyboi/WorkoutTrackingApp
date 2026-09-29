import { createClient } from "@/lib/supabase/client";

/**
 * Every movement the lifter has actually logged, offered back to them.
 *
 * The shared catalogue can't know about the machines in one particular gym, so
 * anything typed in by hand — "Wide grip seated cable row" — used to have to be
 * typed again the next week. A name that has been logged once is a name this
 * app knows, so it belongs in the swap list alongside the curated entries.
 */

const CACHE_KEY = "ft-my-exercises";
const CACHE_MINUTES = 30;

export type MyExercise = { name: string; sets: number; lastAt: string };

type Cached = { at: number; items: MyExercise[] };

function readCache(): MyExercise[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.at > CACHE_MINUTES * 60_000) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

function writeCache(items: MyExercise[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items } satisfies Cached));
  } catch {
    /* storage full or blocked — the list just reloads next time */
  }
}

/** Most-used first, with the right-side rows folded back into their lift. */
export async function getMyExercises(): Promise<MyExercise[]> {
  const cached = readCache();
  if (cached) return cached;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("set_logs")
    .select("exercise_name, is_warmup, session:workout_sessions(started_at)")
    .order("id", { ascending: false })
    .limit(1500);

  if (error || !data) return [];

  const byName = new Map<string, MyExercise>();
  for (const row of data as unknown as {
    exercise_name: string;
    is_warmup?: boolean;
    session?: { started_at?: string } | null;
  }[]) {
    if (row.is_warmup) continue;
    const name = (row.exercise_name ?? "").replace(/\s*\[R\]$/, "").trim();
    if (!name) continue;
    const at = row.session?.started_at ?? "";
    const found = byName.get(name);
    if (found) {
      found.sets += 1;
      if (at > found.lastAt) found.lastAt = at;
    } else {
      byName.set(name, { name, sets: 1, lastAt: at });
    }
  }

  const items = [...byName.values()].sort((a, b) =>
    b.lastAt === a.lastAt ? b.sets - a.sets : b.lastAt.localeCompare(a.lastAt)
  );
  writeCache(items);
  return items;
}

/** Drop the cache so a movement logged just now shows up immediately. */
export function forgetMyExercises() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
