"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MorningWeightCard({
  initial,
  date,
}: {
  initial: number;
  date: string;
}) {
  const [weight, setWeight] = useState(initial ? String(initial) : "");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const value = Number(weight) || 0;
    const { error } = await supabase.from("daily_logs").upsert(
      {
        user_id: user.id,
        date,
        morning_weight: value,
        target_calories: 2100,
        target_protein: 190,
        target_carbs: 200,
        target_fats: 60,
      },
      { onConflict: "user_id,date" }
    );
    setSaving(false);
    setMsg(error ? error.message : "Saved");
  }

  return (
    <div className="card space-y-2">
      <p className="text-sm font-semibold">Morning weight</p>
      <div className="flex gap-2">
        <input
          className="field flex-1 !py-2.5"
          inputMode="decimal"
          placeholder="0.0 lb"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <button type="button" className="btn-accent px-5" onClick={save} disabled={saving}>
          Save
        </button>
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        Fasted, first thing in the AM — after the bathroom, before food or water.
      </p>
      {msg ? (
        <p className={`text-xs ${msg === "Saved" ? "text-[var(--green)]" : "text-red-400"}`}>
          {msg}
        </p>
      ) : null}
    </div>
  );
}
