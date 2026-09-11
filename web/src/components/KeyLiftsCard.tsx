"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  compareKeyLiftsWeek,
  formatTopSet,
  strengthTrendFromKeyLifts,
  type KeyLiftWeekCompare,
} from "@/lib/keyLifts";

export function KeyLiftsCard() {
  const [rows, setRows] = useState<KeyLiftWeekCompare[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoTrend, setAutoTrend] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("workout_sessions")
        .select("started_at, set_logs(exercise_name, weight, reps, is_completed, is_warmup)")
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(40);

      if (cancelled) return;

      const compares = compareKeyLiftsWeek(
        (data ?? []).map((s) => ({
          started_at: s.started_at,
          set_logs:
            (s.set_logs as {
              exercise_name: string;
              weight: number;
              reps: number;
              is_completed: boolean;
              is_warmup?: boolean;
            }[] | null) ?? null,
        }))
      );
      setRows(compares);
      const t = strengthTrendFromKeyLifts(compares);
      setAutoTrend(t);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="h-36 animate-pulse rounded-2xl bg-[#1c212b]" />;
  }

  const hasAny = rows.some((r) => r.thisWeek || r.lastWeek);

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Key lifts
          </p>
          <p className="text-lg font-bold">Top sets · this vs last week</p>
        </div>
        {autoTrend ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              autoTrend === "climbing"
                ? "bg-[var(--green)]/15 text-[var(--green)]"
                : autoTrend === "falling"
                  ? "bg-[var(--red)]/15 text-[var(--red)]"
                  : "bg-[#252b38] text-[var(--muted)]"
            }`}
          >
            {autoTrend}
          </span>
        ) : null}
      </div>

      {!hasAny ? (
        <p className="text-sm text-[var(--muted)]">
          Log Floor Press, Pulldown, Squat, and Trap-Bar / RDL — best working sets show up here.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{r.label}</p>
                <p className="text-[10px] text-[var(--muted)]">{r.day}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums">
                  {formatTopSet(r.thisWeek)}
                  {r.trend === "up" ? (
                    <span className="ml-1 text-[var(--green)]">↑</span>
                  ) : r.trend === "down" ? (
                    <span className="ml-1 text-[var(--red)]">↓</span>
                  ) : null}
                </p>
                <p className="text-[10px] text-[var(--muted)]">
                  last {formatTopSet(r.lastWeek)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
