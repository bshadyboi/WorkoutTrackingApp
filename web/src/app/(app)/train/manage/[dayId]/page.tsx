"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SwapExerciseSheet } from "@/components/SwapExerciseSheet";

type ExRow = {
  key: string;
  name: string;
  muscle: string;
  default_sets: number;
  has_crown_set: boolean;
  crown_rep_range: string;
  working_rep_range: string;
};

const MUSCLES = [
  "Chest",
  "Upper Chest",
  "Back",
  "Lats",
  "Shoulders",
  "Side Delts",
  "Rear Delts",
  "Biceps",
  "Triceps",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Cardio",
  "General",
];

function blankEx(): ExRow {
  return {
    key: `${Date.now()}-${Math.random()}`,
    name: "",
    muscle: "General",
    default_sets: 3,
    has_crown_set: false,
    crown_rep_range: "",
    working_rep_range: "8–12",
  };
}

export default function EditWorkoutDayPage() {
  const { dayId } = useParams<{ dayId: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [exercises, setExercises] = useState<ExRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [swapKey, setSwapKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: day } = await supabase
        .from("workout_days")
        .select("id, name, subtitle, user_id, workout_exercises(*)")
        .eq("id", dayId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!day) {
        setMsg("Day not found");
        setLoading(false);
        return;
      }

      setName(day.name);
      setSubtitle(day.subtitle || "");
      const exs = [...(day.workout_exercises as {
        name: string;
        muscle: string;
        default_sets: number;
        has_crown_set: boolean;
        crown_rep_range: string;
        working_rep_range: string;
        sort_order: number;
      }[] | null) ?? []].sort((a, b) => a.sort_order - b.sort_order);

      setExercises(
        exs.length
          ? exs.map((e, i) => ({
              key: `ex-${i}`,
              name: e.name,
              muscle: e.muscle || "General",
              default_sets: e.default_sets || 3,
              has_crown_set: !!e.has_crown_set,
              crown_rep_range: e.crown_rep_range || "",
              working_rep_range: e.working_rep_range || "8–12",
            }))
          : [blankEx()]
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dayId]);

  function updateEx(key: string, patch: Partial<ExRow>) {
    setExercises((list) => list.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  }

  async function save() {
    const cleaned = exercises
      .map((e) => ({ ...e, name: e.name.trim() }))
      .filter((e) => e.name.length > 0);
    if (!name.trim()) {
      setMsg("Day name required");
      return;
    }
    if (!cleaned.length) {
      setMsg("Add at least one exercise");
      return;
    }

    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error: dayErr } = await supabase
      .from("workout_days")
      .update({
        name: name.trim(),
        subtitle: subtitle.trim() || "Custom day",
      })
      .eq("id", dayId)
      .eq("user_id", session.user.id);

    if (dayErr) {
      setSaving(false);
      setMsg(dayErr.message);
      return;
    }

    await supabase.from("workout_exercises").delete().eq("workout_day_id", dayId);
    const { error: exErr } = await supabase.from("workout_exercises").insert(
      cleaned.map((ex, i) => ({
        workout_day_id: dayId,
        name: ex.name,
        muscle: ex.muscle,
        default_sets: Math.max(1, Number(ex.default_sets) || 3),
        has_crown_set: ex.has_crown_set,
        crown_rep_range: ex.has_crown_set ? ex.crown_rep_range || "4–8" : "",
        working_rep_range: ex.working_rep_range || "8–12",
        sort_order: i,
      }))
    );

    setSaving(false);
    if (exErr) {
      setMsg(exErr.message);
      return;
    }
    sessionStorage.removeItem("ft-tab:train");
    setMsg("Saved");
    setTimeout(() => router.push("/train/manage"), 600);
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-[#1c212b]" />;
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/train/manage" className="text-xs font-semibold text-[var(--blue)]">
          ← All days
        </Link>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight">Edit day</h1>
      </div>

      <div className="card space-y-3">
        <div>
          <label className="label">Day name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Subtitle</label>
          <input
            className="field"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="e.g. Heavy · to failure"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">Exercises</p>
          <button
            type="button"
            className="text-xs font-bold text-[var(--blue)]"
            onClick={() => setExercises((e) => [...e, blankEx()])}
          >
            + Add
          </button>
        </div>

        {exercises.map((ex, idx) => (
          <div key={ex.key} className="card space-y-2 !p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[var(--muted)]">#{idx + 1}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs font-bold text-[var(--blue)]"
                  onClick={() => setSwapKey(ex.key)}
                >
                  Swap
                </button>
                <button
                  type="button"
                  className="text-xs font-bold text-[var(--red)]"
                  onClick={() => setExercises((list) => list.filter((x) => x.key !== ex.key))}
                >
                  Remove
                </button>
              </div>
            </div>
            <input
              className="field !py-2.5"
              placeholder="Exercise name"
              value={ex.name}
              onChange={(e) => updateEx(ex.key, { name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="field !py-2.5"
                value={ex.muscle}
                onChange={(e) => updateEx(ex.key, { muscle: e.target.value })}
              >
                {MUSCLES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                className="field !py-2.5 text-center"
                inputMode="numeric"
                placeholder="Sets"
                value={ex.default_sets}
                onChange={(e) =>
                  updateEx(ex.key, { default_sets: Number(e.target.value) || 1 })
                }
              />
            </div>
            <input
              className="field !py-2.5"
              placeholder="Rep range (e.g. 8–12)"
              value={ex.working_rep_range}
              onChange={(e) => updateEx(ex.key, { working_rep_range: e.target.value })}
            />
            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <input
                type="checkbox"
                checked={ex.has_crown_set}
                onChange={(e) => updateEx(ex.key, { has_crown_set: e.target.checked })}
                className="accent-[var(--blue)]"
              />
              Crown / top set (longer rest)
            </label>
            {ex.has_crown_set ? (
              <input
                className="field !py-2.5"
                placeholder="Crown rep range (e.g. 4–8)"
                value={ex.crown_rep_range}
                onChange={(e) => updateEx(ex.key, { crown_rep_range: e.target.value })}
              />
            ) : null}
          </div>
        ))}
      </div>

      <button type="button" className="btn-green w-full" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save day"}
      </button>
      {msg ? (
        <p
          className={`text-center text-sm ${
            msg === "Saved" ? "text-[var(--green)]" : "text-[var(--yellow)]"
          }`}
        >
          {msg}
        </p>
      ) : null}

      {swapKey
        ? (() => {
            const ex = exercises.find((e) => e.key === swapKey);
            if (!ex) return null;
            return (
              <SwapExerciseSheet
                currentName={ex.name || "Exercise"}
                muscle={ex.muscle}
                onClose={() => setSwapKey(null)}
                onSwapHere={(name) => {
                  updateEx(ex.key, { name });
                  setSwapKey(null);
                }}
                onSwapAll={(name) => {
                  updateEx(ex.key, { name });
                  setSwapKey(null);
                }}
              />
            );
          })()
        : null}
    </div>
  );
}
