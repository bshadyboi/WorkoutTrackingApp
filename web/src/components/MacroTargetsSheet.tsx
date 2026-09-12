"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconX } from "@/components/icons";
import type { MacroTargets } from "@/lib/targets";

const FIELDS: [keyof MacroTargets, string][] = [
  ["target_calories", "Calories"],
  ["target_protein", "Protein (g)"],
  ["target_carbs", "Carbs (g)"],
  ["target_fats", "Fat (g)"],
];

export function MacroTargetsSheet({
  targets,
  onClose,
  onSaved,
}: {
  targets: MacroTargets;
  onClose: () => void;
  onSaved: (t: MacroTargets) => void;
}) {
  const [draft, setDraft] = useState<Record<keyof MacroTargets, string>>({
    target_calories: String(targets.target_calories),
    target_protein: String(targets.target_protein),
    target_carbs: String(targets.target_carbs),
    target_fats: String(targets.target_fats),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const parsed: MacroTargets = {
    target_calories: Math.max(0, Math.round(Number(draft.target_calories) || 0)),
    target_protein: Math.max(0, Math.round(Number(draft.target_protein) || 0)),
    target_carbs: Math.max(0, Math.round(Number(draft.target_carbs) || 0)),
    target_fats: Math.max(0, Math.round(Number(draft.target_fats) || 0)),
  };
  const fromMacros = parsed.target_protein * 4 + parsed.target_carbs * 4 + parsed.target_fats * 9;

  async function save() {
    if (!parsed.target_calories) {
      setError("Set a calorie target");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setSaving(false);
      setError("Sign in required");
      return;
    }
    const { error: err } = await supabase.from("profiles").update(parsed).eq("id", user.id);
    setSaving(false);
    if (err) {
      setError(/target_/i.test(err.message) ? "Run schema_targets.sql in Supabase to unlock macro targets." : err.message);
      return;
    }
    onSaved(parsed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="targets-title">
      <div className="w-full max-w-lg rounded-t-md border border-[var(--border)] bg-[var(--card)] sm:rounded-md">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <h2 id="targets-title" className="text-[17px] font-bold">Daily targets</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--card-2)] text-[var(--muted)]">
            <IconX size={16} />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(([key, label]) => (
              <div key={key}>
                <label className="label" htmlFor={key}>{label}</label>
                <input
                  id={key}
                  className="field text-[16px] font-bold tabular-nums"
                  inputMode="numeric"
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          {/* Protein, carbs and fat imply a calorie total; showing it catches a typo in any one field. */}
          <p className="text-[12.5px] tabular-nums text-[var(--muted)]">
            Your macros add up to <span className="font-bold text-[var(--text)]">{fromMacros.toLocaleString()} cal</span>
            {parsed.target_calories && Math.abs(fromMacros - parsed.target_calories) > parsed.target_calories * 0.05
              ? ` — ${Math.abs(fromMacros - parsed.target_calories).toLocaleString()} off your calorie target`
              : ""}
          </p>
          {error ? <p className="text-[13px] text-[var(--yellow)]">{error}</p> : null}
        </div>
        <div className="border-t border-[var(--border)] px-5 py-3.5" style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom, 0px))" }}>
          <button type="button" className="btn-accent w-full" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save targets"}
          </button>
        </div>
      </div>
    </div>
  );
}
