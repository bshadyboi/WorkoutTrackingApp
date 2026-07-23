"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DailyLog = {
  id?: string;
  date: string;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fats: number;
  actual_calories: number;
  actual_protein: number;
  actual_carbs_pre: number;
  actual_carbs_post: number;
  actual_fats: number;
  sleep_hours: number;
  sleep_notes: string;
  steps_count: number;
  incline_walk_minutes: number;
  incline_walk_incline: number;
  incline_walk_speed: number;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function DailyPage() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<DailyLog>({
    date: today(),
    target_calories: 2100,
    target_protein: 190,
    target_carbs: 100,
    target_fats: 70,
    actual_calories: 0,
    actual_protein: 0,
    actual_carbs_pre: 0,
    actual_carbs_post: 0,
    actual_fats: 0,
    sleep_hours: 0,
    sleep_notes: "",
    steps_count: 0,
    incline_walk_minutes: 0,
    incline_walk_incline: 0,
    incline_walk_speed: 0,
    notes: "",
  });

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today())
        .maybeSingle();
      if (data) setForm(data as DailyLog);
      setLoading(false);
    })();
  }, []);

  function setNum<K extends keyof DailyLog>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: Number(value) || 0 }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload = { ...form, user_id: user.id, date: today() };
    const { error } = await supabase.from("daily_logs").upsert(payload, {
      onConflict: "user_id,date",
    });
    setMsg(error ? error.message : "Saved");
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  const proteinPct =
    form.target_protein > 0
      ? Math.round((form.actual_protein / form.target_protein) * 100)
      : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Daily log</h1>
        <p className="text-sm text-[var(--muted)]">
          {proteinPct}% protein · {form.target_calories - form.actual_calories} cal left
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Actuals</h2>
        <Field label="Calories" value={form.actual_calories} onChange={(v) => setNum("actual_calories", v)} />
        <Field label="Protein (g)" value={form.actual_protein} onChange={(v) => setNum("actual_protein", v)} />
        <Field label="Carbs pre-workout" value={form.actual_carbs_pre} onChange={(v) => setNum("actual_carbs_pre", v)} />
        <Field label="Carbs post-workout" value={form.actual_carbs_post} onChange={(v) => setNum("actual_carbs_post", v)} />
        <Field label="Fats (g)" value={form.actual_fats} onChange={(v) => setNum("actual_fats", v)} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Sleep & steps</h2>
        <Field label="Sleep hours" value={form.sleep_hours} onChange={(v) => setNum("sleep_hours", v)} step="0.1" />
        <div>
          <label className="label">Sleep notes</label>
          <input
            className="field"
            value={form.sleep_notes}
            onChange={(e) => setForm((f) => ({ ...f, sleep_notes: e.target.value }))}
          />
        </div>
        <Field label="Steps" value={form.steps_count} onChange={(v) => setNum("steps_count", v)} />
        <Field label="Incline walk min" value={form.incline_walk_minutes} onChange={(v) => setNum("incline_walk_minutes", v)} />
        <Field label="Incline %" value={form.incline_walk_incline} onChange={(v) => setNum("incline_walk_incline", v)} />
        <Field label="Speed mph" value={form.incline_walk_speed} onChange={(v) => setNum("incline_walk_speed", v)} step="0.1" />
      </div>

      <button className="btn-primary w-full" type="submit">
        Save daily log
      </button>
      {msg ? <p className="text-center text-sm text-[var(--green)]">{msg}</p> : null}
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-[var(--muted)]">{label}</label>
      <input
        className="field max-w-28 py-2 text-right"
        inputMode="decimal"
        step={step}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
