"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Exercise = {
  id: string;
  name: string;
  muscle: string;
  default_sets: number;
  has_crown_set: boolean;
  crown_rep_range: string;
  working_rep_range: string;
  sort_order: number;
};

type ActiveSet = {
  setNumber: number;
  weight: string;
  reps: string;
  completed: boolean;
  previous?: string;
};

export function WorkoutLogger({
  dayId,
  dayName,
  exercises,
  previousByExercise,
}: {
  dayId: string;
  dayName: string;
  exercises: Exercise[];
  previousByExercise: Record<string, { weight: number; reps: number }[]>;
}) {
  const router = useRouter();
  const sorted = useMemo(
    () => [...exercises].sort((a, b) => a.sort_order - b.sort_order),
    [exercises]
  );

  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [startedAt] = useState(() => new Date().toISOString());

  const [setsByExercise, setSetsByExercise] = useState<Record<string, ActiveSet[]>>(() => {
    const init: Record<string, ActiveSet[]> = {};
    for (const ex of sorted) {
      const prev = previousByExercise[ex.name] ?? [];
      init[ex.id] = Array.from({ length: ex.default_sets }, (_, i) => {
        const p = prev[i] ?? prev[prev.length - 1];
        return {
          setNumber: i + 1,
          weight: p ? String(p.weight) : "",
          reps: p ? String(p.reps) : "",
          completed: false,
          previous: p
            ? `${Number.isInteger(p.weight) ? p.weight : p.weight.toFixed(1)}×${p.reps}`
            : undefined,
        };
      });
    }
    return init;
  });

  const current = sorted[index];
  const sets = setsByExercise[current?.id] ?? [];

  function updateSet(setIndex: number, patch: Partial<ActiveSet>) {
    if (!current) return;
    setSetsByExercise((prev) => {
      const copy = { ...prev };
      const list = [...(copy[current.id] ?? [])];
      list[setIndex] = { ...list[setIndex], ...patch };
      copy[current.id] = list;
      return copy;
    });
  }

  async function finish() {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in");
      setSaving(false);
      return;
    }

    const ended = new Date();
    const duration = Math.max(
      1,
      Math.round((ended.getTime() - new Date(startedAt).getTime()) / 1000)
    );

    const { data: session, error: sessionErr } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: user.id,
        day_name: dayName,
        started_at: startedAt,
        ended_at: ended.toISOString(),
        duration_seconds: duration,
      })
      .select("id")
      .single();

    if (sessionErr || !session) {
      setError(sessionErr?.message ?? "Could not save session");
      setSaving(false);
      return;
    }

    const rows: {
      session_id: string;
      exercise_name: string;
      muscle: string;
      set_number: number;
      weight: number;
      reps: number;
      is_completed: boolean;
    }[] = [];

    for (const ex of sorted) {
      for (const set of setsByExercise[ex.id] ?? []) {
        if (!set.completed) continue;
        rows.push({
          session_id: session.id,
          exercise_name: ex.name,
          muscle: ex.muscle,
          set_number: set.setNumber,
          weight: Number(set.weight) || 0,
          reps: Number(set.reps) || 0,
          is_completed: true,
        });
      }
    }

    if (rows.length) {
      const { error: setsErr } = await supabase.from("set_logs").insert(rows);
      if (setsErr) {
        setError(setsErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.push("/dashboard");
    router.refresh();
  }

  if (!current) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--blue)]">
            Exercise {index + 1} / {sorted.length}
          </p>
          <h1 className="text-xl font-bold">{current.name}</h1>
          <p className="text-xs text-[var(--muted)]">
            {current.has_crown_set
              ? `${current.default_sets} × ${current.crown_rep_range} / ${current.working_rep_range}`
              : `${current.default_sets} × ${current.working_rep_range}`}
          </p>
        </div>
        <button onClick={finish} className="text-sm font-bold text-[var(--blue)]" disabled={saving}>
          {saving ? "Saving…" : "Finish"}
        </button>
      </div>

      <div className="card space-y-3">
        <div className="grid grid-cols-[40px_1fr_1fr_72px] gap-2 text-[10px] font-bold uppercase text-[var(--muted)]">
          <span>Set</span>
          <span>Weight</span>
          <span>Reps</span>
          <span>Log</span>
        </div>
        {sets.map((set, i) => (
          <div
            key={set.setNumber}
            className={`grid grid-cols-[40px_1fr_1fr_72px] items-center gap-2 rounded-xl p-2 ${
              set.completed ? "bg-green-500/10" : "bg-[#0c0c0c]"
            }`}
          >
            <span className="text-sm font-semibold">
              {current.has_crown_set && i === 0 ? "👑" : set.setNumber}
            </span>
            <input
              className="field py-2 text-center"
              inputMode="decimal"
              value={set.weight}
              placeholder={set.previous?.split("×")[0] ?? "0"}
              onChange={(e) => updateSet(i, { weight: e.target.value })}
            />
            <input
              className="field py-2 text-center"
              inputMode="numeric"
              value={set.reps}
              placeholder={set.previous?.split("×")[1] ?? "0"}
              onChange={(e) => updateSet(i, { reps: e.target.value })}
            />
            <button
              type="button"
              className={`rounded-lg py-2 text-xs font-bold ${
                set.completed ? "bg-[var(--green)] text-black" : "bg-[#222] text-white"
              }`}
              onClick={() => updateSet(i, { completed: !set.completed })}
            >
              {set.completed ? "Done" : "Log"}
            </button>
            {set.previous ? (
              <p className="col-span-4 text-[11px] text-[var(--muted)]">prev {set.previous}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          className="btn-secondary flex-1"
          disabled={index === 0}
          onClick={() => setIndex((v) => Math.max(0, v - 1))}
        >
          Previous
        </button>
        {index < sorted.length - 1 ? (
          <button
            className="btn-primary flex-1"
            onClick={() => setIndex((v) => Math.min(sorted.length - 1, v + 1))}
          >
            Next exercise
          </button>
        ) : (
          <button className="btn-primary flex-1" onClick={finish} disabled={saving}>
            {saving ? "Saving…" : "Finish workout"}
          </button>
        )}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <p className="text-center text-[10px] text-[var(--muted)]">Day id {dayId.slice(0, 8)}</p>
    </div>
  );
}
