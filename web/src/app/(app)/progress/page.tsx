"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProgressionTab, type Hist } from "@/components/TrainTabs";

const SESSION_FIELDS =
  "id, day_name, started_at, duration_seconds, set_logs(weight, reps, is_warmup)";

export default function ProgressPage() {
  const [history, setHistory] = useState<Hist[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const withShoulder = await supabase
        .from("workout_sessions")
        .select(`${SESSION_FIELDS}, shoulder_status, shoulder_lift`)
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(90);
      const result =
        withShoulder.error && /shoulder/i.test(withShoulder.error.message)
          ? await supabase
              .from("workout_sessions")
              .select(SESSION_FIELDS)
              .eq("user_id", user.id)
              .not("ended_at", "is", null)
              .order("started_at", { ascending: false })
              .limit(90)
          : withShoulder;

      if (cancelled) return;
      if (result.error) {
        setError(result.error.message);
        setHistory([]);
        return;
      }

      setHistory(
        (result.data ?? []).map((session) => {
          const logs =
            (session.set_logs as
              { weight: number; reps: number; is_warmup?: boolean }[] | null) ??
            [];
          const working = logs.filter((set) => !set.is_warmup);
          const pool = working.length ? working : logs;
          return {
            id: session.id,
            dayName: session.day_name ?? "",
            startedAt: session.started_at,
            durationSeconds: session.duration_seconds,
            volume: pool.reduce(
              (sum, set) =>
                sum + (Number(set.weight) || 0) * (Number(set.reps) || 0),
              0,
            ),
            setCount: pool.length,
            shoulder: ((session as { shoulder_status?: string | null })
              .shoulder_status ?? null) as Hist["shoulder"],
            shoulderLift:
              (session as { shoulder_lift?: string | null }).shoulder_lift ??
              null,
          };
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Your results</p>
        <h1 className="page-heading">Progress</h1>
        <p className="page-subtitle">
          Strength, consistency, balance, and recovery trends.
        </p>
      </div>
      {error ? <p className="text-sm text-[var(--yellow)]">{error}</p> : null}
      {history === null ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-md bg-[var(--card-2)]" />
          <div className="h-40 animate-pulse rounded-md bg-[var(--card-2)]" />
        </div>
      ) : (
        <ProgressionTab history={history} />
      )}
    </div>
  );
}
