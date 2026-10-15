"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateKey } from "@/lib/protocol";
import type { WeightPoint } from "@/components/WeeklyWeightCard";
import type { CheckinValues } from "@/components/MorningCheckinCard";
import { readTabCache, writeTabCache } from "@/lib/tabCache";
import { normalizeTargets, type MacroTargets } from "@/lib/targets";
import { parseOverrides, parseSlots } from "@/lib/schedule";
import { resolveWeekdayTodayAndTomorrow } from "@/lib/weekdaySchedule";
import { syncWorkoutLibraryOnce } from "@/lib/workoutsClient";
import {
  IconChevronRight,
  IconDroplet,
  IconFootprint,
  IconPlay,
} from "@/components/icons";
import { workoutPhoto } from "@/lib/workoutPhotos";
import type { SessionDraft } from "@/lib/sessionDraft";

type DashCache = {
  name: string;
  todayStr: string;
  todayName: string | null;
  libraryDay: {
    id: string;
    name: string;
    subtitle: string;
    exerciseCount: number;
    setCount: number;
  } | null;
  tomorrowName: string | null;
  tomorrowDay: { id: string; name: string; exerciseCount: number } | null;
  waterOz: number;
  steps: number;
  todayWeight: number;
  weightHistory: WeightPoint[];
  checkin: CheckinValues;
  sessionCount: number;
  weeklyAvgWeight: number;
  weeklyProteinDays: number;
  protein: number;
  calories: number;
  carbs: number;
  fats: number;
  targets: MacroTargets;
};

type ResumeDraft = SessionDraft & { logDate?: string };

export default function DashboardPage() {
  const cached = useRef(readTabCache<DashCache>("dashboard")).current;
  const [data, setData] = useState<DashCache | null>(cached);
  const [refreshing, setRefreshing] = useState(!cached);
  const [resumeDraft, setResumeDraft] = useState<ResumeDraft | null>(null);
  const [quickMsg, setQuickMsg] = useState("");

  useEffect(() => {
    let latest: ResumeDraft | null = null;
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey?.startsWith("fittrack-draft-")) continue;
      try {
        const draft = JSON.parse(
          localStorage.getItem(storageKey) ?? "",
        ) as SessionDraft;
        if (!draft?.dayId || !draft?.savedAt) continue;
        const dateMatch = storageKey.match(/-(\d{4}-\d{2}-\d{2})$/);
        const candidate = { ...draft, logDate: dateMatch?.[1] };
        if (!latest || candidate.savedAt > latest.savedAt) latest = candidate;
      } catch {
        /* ignore stale drafts */
      }
    }
    setResumeDraft(latest);
  }, []);

  async function quickLog(metric: "weight" | "steps" | "water") {
    if (!data) return;
    const current =
      metric === "weight"
        ? data.todayWeight || ""
        : metric === "steps"
          ? data.steps || ""
          : data.waterOz || "";
    const label =
      metric === "weight"
        ? "Morning weight (lb)"
        : metric === "steps"
          ? "Steps today"
          : "Water today (oz)";
    const raw = window.prompt(label, String(current));
    if (raw == null) return;
    const value = Math.max(0, Number(raw) || 0);
    const field =
      metric === "weight"
        ? "morning_weight"
        : metric === "steps"
          ? "steps_count"
          : "water_oz";
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("daily_logs").upsert(
      {
        user_id: user.id,
        date: data.todayStr,
        ...data.targets,
        [field]: value,
      },
      { onConflict: "user_id,date" },
    );
    if (error) {
      setQuickMsg("Could not save");
      return;
    }
    const next = {
      ...data,
      ...(metric === "weight" ? { todayWeight: value } : {}),
      ...(metric === "steps" ? { steps: value } : {}),
      ...(metric === "water" ? { waterOz: value } : {}),
    };
    setData(next);
    writeTabCache("dashboard", next);
    setQuickMsg(`${label.split(" (")[0]} saved`);
    window.setTimeout(() => setQuickMsg(""), 1800);
  }

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

      const todayStr = dateKey(new Date());

      const [
        { data: profile },
        { data: days },
        todayLogRes,
        { data: weightRows },
        { data: weeklyLogs },
        { data: sessions },
        { data: sched },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "display_name, target_calories, target_protein, target_carbs, target_fats",
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("workout_days")
          .select("id, name, subtitle, workout_exercises(id, default_sets)")
          .eq("user_id", user.id),
        supabase
          .from("daily_logs")
          .select(
            "water_oz, steps_count, actual_calories, actual_protein, actual_carbs_pre, actual_carbs_post, actual_fats, morning_weight, bp1_systolic, bp1_diastolic, bp2_systolic, bp2_diastolic, bp_logged_at, checkin_sleep, checkin_energy, checkin_pump",
          )
          .eq("user_id", user.id)
          .eq("date", todayStr)
          .maybeSingle(),
        supabase
          .from("daily_logs")
          .select("date, morning_weight")
          .eq("user_id", user.id)
          .gt("morning_weight", 0)
          .order("date", { ascending: false })
          .limit(14),
        supabase
          .from("daily_logs")
          .select("date, morning_weight, actual_protein")
          .eq("user_id", user.id)
          .gte("date", dateKey(new Date(Date.now() - 6 * 86400000)))
          .order("date"),
        supabase
          .from("workout_sessions")
          .select("id, day_name, started_at")
          .eq("user_id", user.id)
          .not("ended_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(40),
        supabase
          .from("training_schedules")
          .select("day_ids, date_overrides")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      let todayLog = todayLogRes.data as {
        water_oz?: number;
        steps_count?: number;
        actual_protein?: number;
        actual_calories?: number;
        actual_carbs_pre?: number;
        actual_carbs_post?: number;
        actual_fats?: number;
        morning_weight?: number;
        bp1_systolic?: number;
        bp1_diastolic?: number;
        bp2_systolic?: number;
        bp2_diastolic?: number;
        bp_logged_at?: string | null;
        checkin_sleep?: number;
        checkin_energy?: number;
        checkin_pump?: number;
      } | null;

      // Columns may not exist until schema migrations are applied
      if (todayLogRes.error) {
        const msg = todayLogRes.error.message.toLowerCase();
        if (msg.includes("bp") || msg.includes("checkin")) {
          const fallback = await supabase
            .from("daily_logs")
            .select(
              "water_oz, steps_count, actual_calories, actual_protein, actual_carbs_pre, actual_carbs_post, actual_fats, morning_weight",
            )
            .eq("user_id", user.id)
            .eq("date", todayStr)
            .maybeSingle();
          todayLog = fallback.data;
        }
      }

      if (cancelled) return;

      const dayList = (days ?? []).map((d) => {
        const exercises =
          (d.workout_exercises as
            { id: string; default_sets?: number }[] | null) ?? [];
        return {
          id: d.id,
          name: d.name,
          subtitle: d.subtitle ?? "",
          exerciseCount: exercises.length,
          setCount: exercises.reduce(
            (sum, ex) => sum + (Number(ex.default_sets) || 0),
            0,
          ),
        };
      });
      const dateOverrides = parseOverrides(sched?.date_overrides);
      const scheduleSlots = parseSlots(sched?.day_ids);
      const sessionBriefs = (sessions ?? []).map((s) => ({
        dayName: s.day_name ?? "",
        startedAt: s.started_at,
      }));

      const { today: weekdayToday, tomorrow: weekdayTomorrow } =
        resolveWeekdayTodayAndTomorrow({
          slots: scheduleSlots,
          days: dayList,
          overrides: dateOverrides,
          sessions: sessionBriefs,
        });

      const libraryDay = weekdayToday.scheduled
        ? {
            id: weekdayToday.scheduled.id,
            name: weekdayToday.scheduled.name,
            subtitle: weekdayToday.scheduled.subtitle ?? "",
            exerciseCount:
              dayList.find((d) => d.id === weekdayToday.scheduled!.id)
                ?.exerciseCount ?? 0,
            setCount:
              dayList.find((d) => d.id === weekdayToday.scheduled!.id)
                ?.setCount ?? 0,
          }
        : null;
      const todayName = weekdayToday.isRest ? null : weekdayToday.label;

      const tomorrowDay = weekdayTomorrow.scheduled
        ? {
            id: weekdayTomorrow.scheduled.id,
            name: weekdayTomorrow.scheduled.name,
            exerciseCount:
              dayList.find((d) => d.id === weekdayTomorrow.scheduled!.id)
                ?.exerciseCount ?? 0,
          }
        : null;
      const tomorrowName = weekdayTomorrow.isRest
        ? null
        : weekdayTomorrow.label;

      const weekAgo = Date.now() - 7 * 86400000;
      const sessionCount = (sessions ?? []).filter(
        (s) =>
          new Date(s.started_at).getTime() >= weekAgo &&
          (s.day_name ?? "").toLowerCase() !== "rest",
      ).length;

      const weeklyWeights = (weeklyLogs ?? [])
        .map((r) => Number(r.morning_weight) || 0)
        .filter((weight) => weight > 0);
      const weeklyAvgWeight = weeklyWeights.length
        ? weeklyWeights.reduce((sum, weight) => sum + weight, 0) /
          weeklyWeights.length
        : 0;

      const targets = normalizeTargets(profile);

      const weightHistory: WeightPoint[] = [...(weightRows ?? [])]
        .map((r) => ({
          date: String(r.date),
          weight: Number(r.morning_weight) || 0,
        }))
        .filter((p) => p.weight > 0)
        .reverse();

      const checkin: CheckinValues = {
        checkin_sleep: Number(todayLog?.checkin_sleep) || 0,
        checkin_energy: Number(todayLog?.checkin_energy) || 0,
        checkin_pump: Number(todayLog?.checkin_pump) || 0,
      };

      const next: DashCache = {
        name: profile?.display_name || user.email?.split("@")[0] || "Athlete",
        todayStr,
        todayName,
        libraryDay,
        tomorrowName,
        tomorrowDay,
        waterOz: Number(todayLog?.water_oz) || 0,
        steps: Number(todayLog?.steps_count) || 0,
        todayWeight: Number(todayLog?.morning_weight) || 0,
        weightHistory,
        checkin,
        sessionCount,
        weeklyAvgWeight,
        weeklyProteinDays: (weeklyLogs ?? []).filter(
          (r) => Number(r.actual_protein) >= targets.target_protein,
        ).length,
        protein: Number(todayLog?.actual_protein) || 0,
        calories: Number(todayLog?.actual_calories) || 0,
        carbs:
          (Number(todayLog?.actual_carbs_pre) || 0) +
          (Number(todayLog?.actual_carbs_post) || 0),
        fats: Number(todayLog?.actual_fats) || 0,
        targets,
      };
      writeTabCache("dashboard", next);
      setData(next);
      setRefreshing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="space-y-3 py-2">
        <div className="h-8 w-2/3 animate-pulse rounded-[4px] bg-[var(--card-2)]" />
        <div className="h-28 animate-pulse rounded-md bg-[var(--card-2)]" />
        <div className="h-24 animate-pulse rounded-md bg-[var(--card-2)]" />
      </div>
    );
  }

  const formattedDate = new Date(
    `${data.todayStr}T12:00:00`,
  ).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const stepPct = Math.min(100, Math.round((data.steps / 10000) * 100));
  const waterPct = Math.min(100, Math.round((data.waterOz / 128) * 100));
  const caloriePct = Math.min(
    100,
    Math.round(
      (data.calories / Math.max(1, data.targets.target_calories)) * 100,
    ),
  );
  const proteinPct = Math.min(
    100,
    Math.round((data.protein / Math.max(1, data.targets.target_protein)) * 100),
  );

  return (
    <div className="home-dashboard space-y-5">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="eyebrow">{formattedDate}</p>
          <h1 className="page-heading">Ready to train, {data.name}?</h1>
        </div>
        {refreshing ? (
          <span className="text-[10px] font-semibold text-[var(--muted)]">
            Updating…
          </span>
        ) : null}
      </div>

      {resumeDraft ? (
        <Link
          href={`/train/${resumeDraft.dayId}/session${resumeDraft.logDate ? `?date=${resumeDraft.logDate}` : ""}`}
          className="home-resume-card"
        >
          <span className="home-resume-icon">
            <IconPlay size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <strong>Resume workout</strong>
            <small>{resumeDraft.dayName}</small>
          </span>
          <IconChevronRight size={18} />
        </Link>
      ) : null}

      {data.libraryDay ? (
        <section className="home-workout-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={workoutPhoto(data.libraryDay.name)} alt="" />
          <div className="home-workout-copy">
            <p className="eyebrow">
              {data.libraryDay.subtitle || "Today’s workout"}
            </p>
            <h2>{data.libraryDay.name}</h2>
            <div className="home-workout-stats">
              <span>
                <strong>{data.libraryDay.exerciseCount}</strong> Exercises
              </span>
              <span>
                <strong>{data.libraryDay.setCount}</strong> Sets
              </span>
              <span>
                <strong>
                  ~{Math.min(90, Math.max(45, data.libraryDay.setCount * 4))}
                </strong>{" "}
                Min
              </span>
            </div>
            <div className="home-workout-actions">
              <Link
                href={`/train/${data.libraryDay.id}/session`}
                className="btn-accent"
              >
                <IconPlay size={16} /> Start Workout
              </Link>
              <Link
                href={`/train/${data.libraryDay.id}`}
                className="home-view-link"
              >
                View workout <IconChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="card">
          <p className="eyebrow">Today</p>
          <h2 className="mt-1 text-2xl font-bold">Recovery day</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Keep steps, water, and nutrition on track.
          </p>
        </section>
      )}

      <div className="home-overview-grid">
        <div className="space-y-5">
          <section className="card home-summary-card">
            <div className="home-card-title">
              <h2>Daily check-in</h2>
              <span>Today</span>
            </div>
            <div className="home-metric-grid">
              <button
                type="button"
                className="home-metric text-left"
                onClick={() => void quickLog("weight")}
              >
                <span className="metric-icon">▣</span>
                <p>Weight</p>
                <strong>
                  {data.todayWeight
                    ? `${data.todayWeight.toFixed(1)} lb`
                    : "Log weight"}
                </strong>
                <small>Tap to log</small>
              </button>
              <button
                type="button"
                className="home-metric text-left"
                onClick={() => void quickLog("steps")}
              >
                <IconFootprint size={19} className="text-[var(--blue)]" />
                <p>Steps</p>
                <strong>
                  {data.steps ? data.steps.toLocaleString() : "—"}
                </strong>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${stepPct}%` }}
                  />
                </div>
                <small>Tap to log</small>
              </button>
              <button
                type="button"
                className="home-metric text-left"
                onClick={() => void quickLog("water")}
              >
                <IconDroplet size={19} className="text-[var(--blue)]" />
                <p>Water</p>
                <strong>{data.waterOz} oz</strong>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${waterPct}%` }}
                  />
                </div>
                <small>Tap to log</small>
              </button>
            </div>
            {quickMsg ? <p className="home-quick-msg">{quickMsg}</p> : null}
          </section>

          {data.sessionCount ||
          data.weeklyAvgWeight ||
          data.weeklyProteinDays ? (
            <section className="card home-week-card">
              <div className="home-card-title">
                <h2>This week</h2>
                <span>Last 7 days</span>
              </div>
              <div>
                <span>
                  <strong>{data.sessionCount}</strong> workouts
                </span>
                {data.weeklyAvgWeight ? (
                  <span>
                    <strong>{data.weeklyAvgWeight.toFixed(1)}</strong> avg lb
                  </span>
                ) : null}
                <span>
                  <strong>{data.weeklyProteinDays}</strong> protein goal days
                </span>
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <Link href="/nutrition" className="card block home-summary-card">
            <div className="home-card-title">
              <h2>Nutrition today</h2>
              <IconChevronRight size={18} />
            </div>
            <MacroLine
              label="Calories"
              value={data.calories}
              target={data.targets.target_calories}
              unit="kcal"
              pct={caloriePct}
            />
            <MacroLine
              label="Protein"
              value={data.protein}
              target={data.targets.target_protein}
              unit="g"
              pct={proteinPct}
              green
            />
          </Link>

          {data.tomorrowDay || data.tomorrowName ? (
            <Link
              href={
                data.tomorrowDay ? `/train/${data.tomorrowDay.id}` : "/train"
              }
              prefetch={false}
              className="card home-next-card active:bg-white/5"
            >
              {data.tomorrowDay ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={workoutPhoto(data.tomorrowDay.name)} alt="" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--blue)]">
                  Tomorrow
                </p>
                <p className="text-lg font-bold tracking-tight">
                  {data.tomorrowDay?.name ?? data.tomorrowName}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {data.tomorrowDay
                    ? `${data.tomorrowDay.exerciseCount} lift${
                        data.tomorrowDay.exerciseCount === 1 ? "" : "s"
                      } · tap to preview`
                    : "On the schedule · coming soon"}
                </p>
              </div>
              <IconChevronRight size={18} className="text-[var(--blue)]" />
            </Link>
          ) : (
            <div className="card !py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                Tomorrow
              </p>
              <p className="text-lg font-bold">Rest day</p>
              <p className="text-xs text-[var(--muted)]">
                Recover and hit nutrition.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MacroLine({
  label,
  value,
  target,
  unit,
  pct,
  green = false,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  pct: number;
  green?: boolean;
}) {
  return (
    <div className="home-macro-line">
      <div>
        <p>{label}</p>
        <strong>
          {value.toLocaleString()}{" "}
          <span>
            / {target.toLocaleString()} {unit}
          </span>
        </strong>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            background: green ? "var(--green)" : "var(--blue)",
          }}
        />
      </div>
      <span>{pct}%</span>
    </div>
  );
}
