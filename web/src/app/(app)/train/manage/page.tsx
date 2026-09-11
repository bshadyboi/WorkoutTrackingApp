"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Day = {
  id: string;
  name: string;
  subtitle: string;
  sort_order: number;
  exerciseCount: number;
};

export default function ManageWorkoutsPage() {
  const router = useRouter();
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data } = await supabase
      .from("workout_days")
      .select("id, name, subtitle, sort_order, workout_exercises(id)")
      .eq("user_id", user.id)
      .order("sort_order");

    setDays(
      (data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        subtitle: d.subtitle,
        sort_order: d.sort_order,
        exerciseCount: (d.workout_exercises as unknown[] | null)?.length ?? 0,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createDay() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setMsg("");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const sort = days.length;
    const { data, error } = await supabase
      .from("workout_days")
      .insert({
        user_id: user.id,
        name,
        subtitle: "Custom day",
        sort_order: sort,
      })
      .select("id")
      .single();

    setCreating(false);
    if (error || !data) {
      setMsg(error?.message || "Could not create day");
      return;
    }
    // Seed one placeholder exercise so session logger works
    await supabase.from("workout_exercises").insert({
      workout_day_id: data.id,
      name: "Exercise 1",
      muscle: "General",
      default_sets: 3,
      has_crown_set: false,
      crown_rep_range: "",
      working_rep_range: "8–12",
      sort_order: 0,
    });
    sessionStorage.removeItem("ft-tab:train");
    router.push(`/train/manage/${data.id}`);
  }

  async function deleteDay(id: string, name: string) {
    if (!window.confirm(`Delete “${name}” and its exercises?`)) return;
    const supabase = createClient();
    await supabase.from("workout_exercises").delete().eq("workout_day_id", id);
    await supabase.from("workout_days").delete().eq("id", id);
    sessionStorage.removeItem("ft-tab:train");
    setDays((d) => d.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/train" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--blue)]">
          ← Train
        </Link>
        <h1 className="text-[28px] font-bold tracking-tight">Edit workouts</h1>
        <p className="text-sm text-[var(--muted)]">
          Add your own days or edit the bro-split templates. Rolling schedule picks today
          from your last completed session.
        </p>
      </div>

      <div className="card space-y-3">
        <p className="font-semibold">New day</p>
        <input
          className="field"
          placeholder="e.g. Push, Lower, Arms"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="button"
          className="btn-green w-full"
          disabled={creating || !newName.trim()}
          onClick={() => void createDay()}
        >
          {creating ? "Creating…" : "Create & edit exercises"}
        </button>
        {msg ? <p className="text-sm text-[var(--yellow)]">{msg}</p> : null}
      </div>

      <div className="space-y-2">
        <p className="text-lg font-bold">Your days</p>
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-[#1c212b]" />
        ) : days.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No days yet — create one above.</p>
        ) : (
          days.map((d) => (
            <div key={d.id} className="card flex items-center gap-3 !py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{d.name}</p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {d.exerciseCount} exercises · {d.subtitle || "custom"}
                </p>
              </div>
              <Link
                href={`/train/manage/${d.id}`}
                className="rounded-full bg-[#252b38] px-3 py-2 text-xs font-bold text-[var(--blue)]"
              >
                Edit
              </Link>
              <button
                type="button"
                className="text-xs font-bold text-[var(--red)]"
                onClick={() => void deleteDay(d.id, d.name)}
              >
                Del
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
