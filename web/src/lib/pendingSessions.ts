import { createClient } from "@/lib/supabase/client";

/**
 * Finished sessions that could not reach Supabase, held on the device until
 * they can. Gyms have dead spots, and a workout that is over should never be
 * blocked from being recorded by a bar of signal.
 */

const KEY = "ft-pending-sessions";

export type PendingSessionRow = {
  exercise_name: string;
  muscle: string;
  set_number: number;
  weight: number;
  reps: number;
  is_completed: boolean;
  is_warmup: boolean;
  rir?: number | null;
};

export type PendingSession = {
  id: string;
  queuedAt: number;
  session: {
    day_name: string;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    notes: string;
  };
  sets: PendingSessionRow[];
};

/** True for the "there is no network" class of failure, not for real rejections. */
export function isOfflineError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "";
  return /failed to fetch|networkerror|network request failed|load failed|timeout/i.test(
    message
  );
}

export function listPendingSessions(): PendingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingSession[]) : [];
  } catch {
    return [];
  }
}

function write(list: PendingSession[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or unavailable — nothing useful to do here */
  }
}

export function queuePendingSession(
  entry: Omit<PendingSession, "id" | "queuedAt">
): PendingSession {
  const queued: PendingSession = {
    ...entry,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    queuedAt: Date.now(),
  };
  write([...listPendingSessions(), queued]);
  return queued;
}

export function removePendingSession(id: string) {
  write(listPendingSessions().filter((p) => p.id !== id));
}

/**
 * Upload everything queued. Stops at the first offline-looking failure so the
 * queue keeps its order and nothing is dropped; a row rejected on its merits
 * (bad data, deleted account) is discarded rather than retried forever.
 */
export async function flushPendingSessions(): Promise<{
  uploaded: number;
  remaining: number;
}> {
  const queue = listPendingSessions();
  if (!queue.length) return { uploaded: 0, remaining: 0 };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { uploaded: 0, remaining: queue.length };
  }

  const supabase = createClient();
  let uploaded = 0;

  for (const pending of queue) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) break;

      const { data: session, error: sessionErr } = await supabase
        .from("workout_sessions")
        .insert({ user_id: user.id, ...pending.session })
        .select("id")
        .single();

      if (sessionErr || !session) {
        if (isOfflineError(sessionErr)) break;
        removePendingSession(pending.id);
        continue;
      }

      if (pending.sets.length) {
        const rows = pending.sets.map((s) => ({ ...s, session_id: session.id }));
        let { error: setsErr } = await supabase.from("set_logs").insert(rows);
        if (setsErr?.message?.toLowerCase().includes("is_warmup")) {
          const fallback = rows.map(({ is_warmup, ...rest }) => {
            void is_warmup;
            return rest;
          });
          setsErr = (await supabase.from("set_logs").insert(fallback)).error;
        }
        if (setsErr) {
          await supabase.from("workout_sessions").delete().eq("id", session.id);
          if (isOfflineError(setsErr)) break;
          removePendingSession(pending.id);
          continue;
        }
      }

      removePendingSession(pending.id);
      uploaded++;
    } catch (err) {
      if (isOfflineError(err)) break;
      removePendingSession(pending.id);
    }
  }

  return { uploaded, remaining: listPendingSessions().length };
}
