"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TARGETS, type MacroTargets } from "@/lib/targets";

export type CheckinValues = {
  checkin_sleep: number;
  checkin_energy: number;
  checkin_pump: number;
};

const TAGS = [
  {
    key: "checkin_sleep" as const,
    label: "Sleep",
    emoji: "😴",
    hints: ["Poor", "Fair", "Good", "Great"],
  },
  {
    key: "checkin_energy" as const,
    label: "Energy",
    emoji: "⚡",
    hints: ["Low", "OK", "High", "Peak"],
  },
  {
    key: "checkin_pump" as const,
    label: "Pump",
    emoji: "💪",
    hints: ["Flat", "Light", "Good", "Full"],
  },
];

export function MorningCheckinCard({
  date,
  initial,
  targets = DEFAULT_TARGETS,
}: {
  date: string;
  initial?: Partial<CheckinValues> | null;
  targets?: MacroTargets;
}) {
  const [values, setValues] = useState<CheckinValues>({
    checkin_sleep: initial?.checkin_sleep ?? 0,
    checkin_energy: initial?.checkin_energy ?? 0,
    checkin_pump: initial?.checkin_pump ?? 0,
  });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues({
      checkin_sleep: initial?.checkin_sleep ?? 0,
      checkin_energy: initial?.checkin_energy ?? 0,
      checkin_pump: initial?.checkin_pump ?? 0,
    });
  }, [date, initial?.checkin_sleep, initial?.checkin_energy, initial?.checkin_pump]);

  async function pick(key: keyof CheckinValues, score: number) {
    const next = { ...values, [key]: score };
    setValues(next);
    setSaving(true);
    setMsg("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setMsg("Sign in required");
      return;
    }

    const { error } = await supabase.from("daily_logs").upsert(
      {
        user_id: user.id,
        date,
        ...targets,
        ...next,
      },
      { onConflict: "user_id,date" }
    );

    setSaving(false);
    if (error) {
      if (error.message.toLowerCase().includes("checkin")) {
        setMsg("Run schema_checkin.sql in Supabase");
      } else {
        setMsg(error.message);
      }
      return;
    }
    setMsg("Saved");
  }

  const filled = TAGS.filter((t) => values[t.key] > 0).length;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Morning check-in</p>
          <p className="text-[11px] text-[var(--muted)]">
            Rate sleep, energy, and pump · 1–4
          </p>
        </div>
        <span className="rounded-full bg-[#252b38] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
          {filled}/3
        </span>
      </div>

      {TAGS.map((tag) => (
        <div key={tag.key} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-white">
              {tag.emoji} {tag.label}
            </p>
            {values[tag.key] > 0 ? (
              <p className="text-[10px] text-[var(--muted)]">
                {tag.hints[values[tag.key] - 1]}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {([1, 2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                disabled={saving}
                onClick={() => void pick(tag.key, n)}
                className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                  values[tag.key] === n
                    ? "bg-[var(--green)] text-black"
                    : "bg-[#252b38] text-[var(--muted)] hover:text-white"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}

      {msg ? (
        <p
          className={`text-xs ${
            msg === "Saved" ? "text-[var(--green)]" : "text-[var(--yellow)]"
          }`}
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}
