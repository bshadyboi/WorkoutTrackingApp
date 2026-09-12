"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_SLOTS,
  WEEKDAY_LABELS,
  parseSlots,
  seedUpperLowerSlots,
  seedSlotsFromRotation,
  type ScheduleSlots,
} from "@/lib/schedule";

type DayOpt = { id: string; name: string };

export function ScheduleEditor({
  userId,
  days,
  title = "Weekly schedule",
  subtitle = "Assign a workout day to each weekday. Leave as Rest for recovery.",
}: {
  userId: string;
  days: DayOpt[];
  title?: string;
  subtitle?: string;
}) {
  const [slots, setSlots] = useState<ScheduleSlots>([...EMPTY_SLOTS]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("training_schedules")
        .select("day_ids")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (data?.day_ids) {
        setSlots(parseSlots(data.day_ids));
      } else {
        setSlots(seedSlotsFromRotation(days));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Seed only on mount / user change — days used for initial seed only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function setSlot(i: number, dayId: string | null) {
    setSlots((prev) => {
      const next = [...prev] as ScheduleSlots;
      next[i] = dayId;
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const actor = session?.user?.id ?? null;

    const { error } = await supabase.from("training_schedules").upsert({
      user_id: userId,
      day_ids: slots,
      updated_at: new Date().toISOString(),
      updated_by: actor,
    });

    setSaving(false);
    if (error) {
      setMsg(
        error.message.includes("training_schedules") || error.code === "42P01"
          ? "Run web/supabase/schema_schedule.sql in Supabase first."
          : error.message
      );
      return;
    }
    sessionStorage.removeItem("ft-tab:train");
    sessionStorage.removeItem("ft-tab:dashboard");
    setMsg("Saved");
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-md bg-[var(--card-2)]" />;
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-lg font-bold">{title}</p>
        <p className="text-xs text-[var(--muted)]">{subtitle}</p>
      </div>

      <div className="card space-y-2 !p-3">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs font-bold text-[var(--muted)]">
              {label}
            </span>
            <select
              className="field !py-2 text-sm"
              value={slots[i] ?? ""}
              onChange={(e) => setSlot(i, e.target.value || null)}
            >
              <option value="">Rest</option>
              {days.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {days.length === 0 ? (
        <p className="text-xs text-[var(--yellow)]">
          No workout days in the library yet — create or push days first.
        </p>
      ) : null}

      <button
        type="button"
        className="btn-secondary w-full"
        disabled={saving || days.length === 0}
        onClick={() => {
          setSlots(seedUpperLowerSlots(days));
          setMsg("Upper/Lower week loaded — tap Save");
        }}
      >
        Apply Upper / Lower week
      </button>

      <button
        type="button"
        className="btn-accent w-full"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save schedule"}
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
    </div>
  );
}
