"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrainTabs } from "@/components/TrainTabs";
import { readTabCache, writeTabCache } from "@/lib/tabCache";
import { syncWorkoutLibraryOnce } from "@/lib/workoutsClient";
import { parseOverrides, parseSlots, type DateOverrides, type ScheduleSlots } from "@/lib/schedule";

type TrainCache = {
  scheduleSlots: ScheduleSlots;
  days: { id: string; name: string; subtitle: string; exerciseCount: number; setCount: number }[];
  dateOverrides: DateOverrides;
  history: {
    id: string;
    dayName: string;
    startedAt: string;
    durationSeconds: number;
    volume: number;
    setCount: number;
  }[];
};

export default function TrainPage() {
  const cached = useRef(readTabCache<TrainCache>("train")).current;
  const [data, setData] = useState<TrainCache | null>(cached);
  const [refreshing, setRefreshing] = useState(!cached);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await syncWorkoutLibraryOnce();

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) return;

      const [daysRes, sessionsRes, schedRes] = await Promise.all([
        supabase
          .from("workout_days")
          .select("id, name, subtitle, sort_order, workout_exercises(id, default_sets)")
          .eq("user_id", user.id)
          .order("sort_order"),
        supabase
          .from("workout_sessions")
          .select("id, day_name, started_at, duration_seconds, set_logs(weight, reps, is_warmup)")
          .eq("user_id", user.id)
          .not("ended_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(90),
        supabase
          .from("training_schedules")
          .select("day_ids, date_overrides")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (daysRes.error || sessionsRes.error) {
        setFetchError(daysRes.error?.message || sessionsRes.error?.message || "Could not load training data");
        setRefreshing(false);
        return;
      }

      setFetchError("");

      // Prefer one row per day name (guards against legacy duplicate inserts)
      const rawDays = (daysRes.data ?? []).map((d) => {
        const exs =
          (d.workout_exercises as { id: string; default_sets: number }[] | null) ?? [];
        return {
          id: d.id,
          name: d.name,
          subtitle: d.subtitle,
          exerciseCount: exs.length,
          setCount: exs.reduce((n, x) => n + (Number(x.default_sets) || 0), 0),
        };
      });
      const seenNames = new Set<string>();
      const dayList = rawDays.filter((d) => {
        const key = d.name.trim().toLowerCase();
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
      });

      const dateOverrides = parseOverrides(schedRes.data?.date_overrides);
      const scheduleSlots = parseSlots(schedRes.data?.day_ids);

      const next: TrainCache = {
        scheduleSlots,
        days: dayList,
        dateOverrides,
        history: (sessionsRes.data ?? []).map((s) => {
          const logs =
            (s.set_logs as { weight: number; reps: number; is_warmup?: boolean }[] | null) ??
            [];
          const working = logs.filter((x) => !x.is_warmup);
          const pool = working.length ? working : logs;
          return {
            id: s.id,
            dayName: s.day_name ?? "",
            startedAt: s.started_at,
            durationSeconds: s.duration_seconds,
            volume: pool.reduce(
              (n, x) => n + (Number(x.weight) || 0) * (Number(x.reps) || 0),
              0
            ),
            setCount: pool.length,
          };
        }),
      };

      writeTabCache("train", next);
      setData(next);
      setRefreshing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!data && !fetchError) {
    return (
      <div className="space-y-3 py-2">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-9 animate-pulse rounded-full bg-[var(--card-2)]" />
          <div className="h-9 animate-pulse rounded-full bg-[var(--card-2)]" />
          <div className="h-9 animate-pulse rounded-full bg-[var(--card-2)]" />
        </div>
        <div className="h-24 animate-pulse rounded-md bg-[var(--card-2)]" />
        <div className="h-16 animate-pulse rounded-md bg-[var(--card-2)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3 py-2">
        <p className="text-sm text-[var(--yellow)]">{fetchError}</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {refreshing ? (
        <p className="text-right text-[10px] font-semibold text-[var(--muted)]">Updating…</p>
      ) : null}
      {fetchError ? (
        <p className="text-xs text-[var(--yellow)]">{fetchError}</p>
      ) : null}
      <TrainTabs
        scheduleSlots={data.scheduleSlots}
        days={data.days}
        dateOverrides={data.dateOverrides}
        history={data.history}
      />
    </div>
  );
}
