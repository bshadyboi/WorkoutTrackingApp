"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TARGETS, type MacroTargets } from "@/lib/targets";
import { IconDroplet, IconFootprint } from "@/components/icons";

export function WaterStepsCards({
  date,
  waterOz,
  steps,
  waterGoal,
  targets = DEFAULT_TARGETS,
}: {
  date: string;
  waterOz: number;
  steps: number;
  waterGoal: number;
  targets?: MacroTargets;
}) {
  const [water, setWater] = useState(waterOz);
  const [stepCount, setStepCount] = useState(steps);
  const [unit, setUnit] = useState<"oz" | "ml" | "L">("oz");
  const [, startTransition] = useTransition();
  const supabaseRef = useRef(createClient());

  // Sync when switching days
  useEffect(() => {
    setWater(waterOz);
    setStepCount(steps);
  }, [date, waterOz, steps]);

  function persist(patch: { water_oz?: number; steps_count?: number }) {
    startTransition(async () => {
      const {
        data: { user },
      } = await supabaseRef.current.auth.getUser();
      if (!user) return;
      await supabaseRef.current.from("daily_logs").upsert(
        {
          user_id: user.id,
          date,
          ...targets,
          ...patch,
        },
        { onConflict: "user_id,date" }
      );
    });
  }

  function addWater(oz: number) {
    const next = Math.max(0, water + oz);
    setWater(next);
    persist({ water_oz: next });
  }

  function resetWater() {
    setWater(0);
    persist({ water_oz: 0 });
  }

  function logSteps() {
    const raw = window.prompt("Steps today", String(stepCount || ""));
    if (raw == null) return;
    const next = Math.max(0, Number(raw) || 0);
    setStepCount(next);
    persist({ steps_count: next });
  }

  const display =
    unit === "oz"
      ? `${water} / ${waterGoal} oz`
      : unit === "ml"
        ? `${Math.round(water * 29.5735)} ml`
        : `${(water / 33.814).toFixed(1)} L`;

  const pct = Math.min(100, Math.round((water / waterGoal) * 100));

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card flex min-w-0 flex-col gap-2 overflow-hidden !p-3">
        <div className="flex items-center justify-between gap-1">
          <p className="flex shrink-0 items-center gap-1.5 text-sm font-semibold">
            <IconDroplet size={15} className="text-[var(--blue)]" />
            Water
          </p>
          <div className="flex shrink-0 gap-0.5 rounded-full bg-[var(--surface)] p-0.5 text-[10px] font-bold">
            {(["oz", "ml", "L"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`rounded-full px-1.5 py-0.5 ${
                  unit === u ? "bg-[var(--blue)] text-black" : "text-[var(--muted)]"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <p className="truncate text-xs text-[var(--muted)]">
          {display} · {pct}%
        </p>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            className="rounded-lg bg-[#252b38] py-2 text-xs font-bold active:bg-[var(--blue)] active:text-black"
            onClick={() => addWater(8)}
          >
            +8
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#252b38] py-2 text-xs font-bold active:bg-[var(--blue)] active:text-black"
            onClick={() => addWater(16)}
          >
            +16
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#252b38] py-2 text-xs font-bold text-[var(--muted)] active:text-white"
            onClick={resetWater}
          >
            reset
          </button>
        </div>
      </div>

      <div className="card flex min-w-0 flex-col justify-between gap-2 overflow-hidden !p-3">
        <div className="flex items-center justify-between gap-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <IconFootprint size={15} className="text-[var(--blue)]" />
            Steps
          </p>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-[var(--border-solid)] px-2 py-1 text-[11px] font-bold text-[var(--blue)]"
            onClick={logSteps}
          >
            + log
          </button>
        </div>
        <p className="text-2xl font-bold leading-none">
          {stepCount ? stepCount.toLocaleString() : "—"}
        </p>
        <p className="text-[11px] text-[var(--muted)]">Goal 10–12k</p>
      </div>
    </div>
  );
}
