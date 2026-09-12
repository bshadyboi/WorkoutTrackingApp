"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateKey } from "@/lib/protocol";
import { DailyWeightCard, type WeightPoint } from "@/components/WeeklyWeightCard";
import { FastedBloodPressureCard, type BpReadings } from "@/components/FastedBloodPressureCard";
import { MorningCheckinCard, type CheckinValues } from "@/components/MorningCheckinCard";
import { WaterStepsCards } from "@/components/WaterStepsCards";
import { RecompCheckinCard } from "@/components/RecompCheckinCard";
import { readTabCache, writeTabCache } from "@/lib/tabCache";
import {
  DEFAULT_TARGETS,
  normalizeTargets,
  type MacroTargets,
} from "@/lib/targets";
import {
  parseOverrides,
  parseSlots,
} from "@/lib/schedule";
import { resolveWeekdayTodayAndTomorrow } from "@/lib/weekdaySchedule";
import { syncWorkoutLibraryOnce } from "@/lib/workoutsClient";
import { IconChevronRight } from "@/components/icons";
import { DERRICK_CHECKPOINT_WEEK, derrickRecompWeek } from "@/lib/derrickRecomp";

type DashCache = {
  name: string;
  todayStr: string;
  todayName: string | null;
  libraryDay: { id: string; name: string } | null;
  tomorrowName: string | null;
  tomorrowDay: { id: string; name: string; exerciseCount: number } | null;
  waterOz: number;
  steps: number;
  todayWeight: number;
  weightHistory: WeightPoint[];
  bp: BpReadings;
  checkin: CheckinValues;
  sessionCount: number;
  protein: number;
  /** Optional so a cached dashboard from before this field existed still renders. */
  intake?: { calories: number; carbs: number; fats: number };
  targets: MacroTargets;
};

export default function DashboardPage() {
  const cached = useRef(readTabCache<DashCache>("dashboard")).current;
  const [data, setData] = useState<DashCache | null>(cached);
  const [refreshing, setRefreshing] = useState(!cached);

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
        { data: sessions },
        { data: sched },
      ] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, target_calories, target_protein, target_carbs, target_fats")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("workout_days")
            .select("id, name, subtitle, workout_exercises(id)")
            .eq("user_id", user.id),
          supabase
            .from("daily_logs")
            .select(
              "water_oz, steps_count, actual_calories, actual_protein, actual_carbs_pre, actual_carbs_post, actual_fats, morning_weight, bp1_systolic, bp1_diastolic, bp2_systolic, bp2_diastolic, bp_logged_at, checkin_sleep, checkin_energy, checkin_pump"
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
        actual_calories?: number;
        actual_protein?: number;
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
            .select("water_oz, steps_count, actual_calories, actual_protein, actual_carbs_pre, actual_carbs_post, actual_fats, morning_weight")
            .eq("user_id", user.id)
            .eq("date", todayStr)
            .maybeSingle();
          todayLog = fallback.data;
        }
      }

      if (cancelled) return;

      const dayList = (days ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        subtitle: d.subtitle ?? "",
        exerciseCount: (d.workout_exercises as unknown[] | null)?.length ?? 0,
      }));
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
      const tomorrowName = weekdayTomorrow.isRest ? null : weekdayTomorrow.label;

      const weekAgo = Date.now() - 7 * 86400000;
      const sessionCount = (sessions ?? []).filter(
        (s) =>
          new Date(s.started_at).getTime() >= weekAgo &&
          (s.day_name ?? "").toLowerCase() !== "rest"
      ).length;

      const targets = normalizeTargets(profile);

      const weightHistory: WeightPoint[] = [...(weightRows ?? [])]
        .map((r) => ({
          date: String(r.date),
          weight: Number(r.morning_weight) || 0,
        }))
        .filter((p) => p.weight > 0)
        .reverse();

      const bp: BpReadings = {
        bp1_systolic: Number(todayLog?.bp1_systolic) || 0,
        bp1_diastolic: Number(todayLog?.bp1_diastolic) || 0,
        bp2_systolic: Number(todayLog?.bp2_systolic) || 0,
        bp2_diastolic: Number(todayLog?.bp2_diastolic) || 0,
      };

      const checkin: CheckinValues = {
        checkin_sleep: Number(todayLog?.checkin_sleep) || 0,
        checkin_energy: Number(todayLog?.checkin_energy) || 0,
        checkin_pump: Number(todayLog?.checkin_pump) || 0,
      };

      const next: DashCache = {
        name:
          profile?.display_name ||
          user.email?.split("@")[0] ||
          "Athlete",
        todayStr,
        todayName,
        libraryDay: libraryDay ? { id: libraryDay.id, name: libraryDay.name } : null,
        tomorrowName,
        tomorrowDay,
        waterOz: Number(todayLog?.water_oz) || 0,
        steps: Number(todayLog?.steps_count) || 0,
        todayWeight: Number(todayLog?.morning_weight) || 0,
        weightHistory,
        bp,
        checkin,
        sessionCount,
        protein: Number(todayLog?.actual_protein) || 0,
        intake: {
          calories: Number(todayLog?.actual_calories) || 0,
          carbs: (Number(todayLog?.actual_carbs_pre) || 0) + (Number(todayLog?.actual_carbs_post) || 0),
          fats: Number(todayLog?.actual_fats) || 0,
        },
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

  const targets = data.targets ?? DEFAULT_TARGETS;
  const intake = data.intake ?? { calories: 0, carbs: 0, fats: 0 };
  const calsLeft = Math.round(targets.target_calories - intake.calories);
  const history = data.weightHistory ?? [];
  // Compare against the latest weigh-in at least 7 days old, not "8 entries
  // back" — logging isn't daily, so an entry count isn't a week.
  const weekAgoKey = (() => {
    const [y, m, d] = data.todayStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d - 7, 12);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  })();
  const weekAgoWeight = [...history].reverse().find((p) => p.date <= weekAgoKey)?.weight ?? 0;
  const weightDelta = data.todayWeight && weekAgoWeight ? data.todayWeight - weekAgoWeight : null;
  const bpLogged = Boolean(data.bp?.bp1_systolic);
  const checkinDone = Boolean(data.checkin?.checkin_sleep || data.checkin?.checkin_energy || data.checkin?.checkin_pump);
  // The weekly calorie check-in has nothing to decide before its checkpoint week.
  const showCheckin = derrickRecompWeek(data.todayStr) >= DERRICK_CHECKPOINT_WEEK;

  const next = data.libraryDay
    ? { when: "Today", id: data.libraryDay.id, name: data.libraryDay.name, detail: null as string | null }
    : data.tomorrowDay
      ? {
          when: "Tomorrow",
          id: data.tomorrowDay.id,
          name: data.tomorrowDay.name,
          detail: `${data.tomorrowDay.exerciseCount} exercise${data.tomorrowDay.exerciseCount === 1 ? "" : "s"}`,
        }
      : null;
  const nextHead = next?.name.split("·")[0]?.trim() ?? "";
  const nextTail = next?.name.split("·").slice(1).join("·").trim() ?? "";

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-[28px] font-bold tracking-tight">Let’s work, {data.name}.</h1>
        {refreshing ? (
          <span className="text-[10px] font-semibold text-[var(--muted)]">Updating…</span>
        ) : null}
      </div>

      {showCheckin ? <RecompCheckinCard /> : null}

      {next ? (
        <Link
          href={`/train/${next.id}`}
          prefetch={false}
          className="card reg flex items-center justify-between gap-3 !p-4 active:bg-white/5"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--blue)]">{next.when}</p>
            <p className="mt-0.5 text-[24px] font-bold leading-tight tracking-tight">{nextHead}</p>
            <p className="truncate text-[13px] text-[var(--muted)]">
              {[nextTail, next.detail].filter(Boolean).join(" · ") || "Tap to preview"}
            </p>
          </div>
          <span className="shrink-0 text-[var(--dim)]">
            <IconChevronRight size={20} />
          </span>
        </Link>
      ) : (
        <div className="card !p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Tomorrow</p>
          <p className="text-[20px] font-bold">Rest day</p>
        </div>
      )}

      <Link href="/nutrition" prefetch={false} className="card block space-y-2.5 !p-4 active:bg-white/5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            {calsLeft >= 0 ? "Calories left" : "Over target"}
          </span>
          <span className="text-[22px] font-bold leading-none tabular-nums">{Math.abs(calsLeft).toLocaleString()}</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, targets.target_calories ? (intake.calories / targets.target_calories) * 100 : 0)}%` }}
          />
        </div>
        <p className="text-[11.5px] text-[var(--muted)] tabular-nums">
          {Math.round(data.protein)}/{targets.target_protein}p · {Math.round(intake.carbs)}/{targets.target_carbs}c ·{" "}
          {Math.round(intake.fats)}/{targets.target_fats}f
        </p>
      </Link>

      <section className="space-y-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Morning log</h2>
        <div className="card !p-0">
          <LogRow
            label="Weight"
            value={data.todayWeight ? data.todayWeight.toFixed(1) : null}
            note={
              weightDelta != null
                ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} vs last week`
                : undefined
            }
          >
            <DailyWeightCard
              key={`${data.todayStr}-${data.todayWeight}-${history.length}`}
              date={data.todayStr}
              initial={data.todayWeight}
              history={history}
              targets={targets}
            />
          </LogRow>
          <LogRow
            label="Fasted BP"
            value={bpLogged ? `${data.bp.bp1_systolic}/${data.bp.bp1_diastolic}` : null}
          >
            <FastedBloodPressureCard
              key={`bp-${data.todayStr}-${data.bp?.bp1_systolic ?? 0}-${data.bp?.bp2_systolic ?? 0}`}
              date={data.todayStr}
              initial={data.bp}
              targets={targets}
            />
          </LogRow>
          <LogRow
            label="Water · Steps"
            value={data.waterOz || data.steps ? `${data.waterOz} oz · ${data.steps.toLocaleString()}` : null}
          >
            <WaterStepsCards
              key={`${data.todayStr}-${data.waterOz}-${data.steps}`}
              date={data.todayStr}
              waterOz={data.waterOz}
              steps={data.steps}
              waterGoal={128}
              targets={targets}
            />
          </LogRow>
          <LogRow label="Check-in" value={checkinDone ? "Done" : null}>
            <MorningCheckinCard
              key={`checkin-${data.todayStr}-${data.checkin?.checkin_sleep}-${data.checkin?.checkin_energy}-${data.checkin?.checkin_pump}`}
              date={data.todayStr}
              initial={data.checkin}
              targets={targets}
            />
          </LogRow>
        </div>
      </section>
    </div>
  );
}

/**
 * One line of the morning log: today's value at a glance, and the full logging
 * card only when tapped. Keeps Home to a single screen without losing any input.
 */
function LogRow({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string | null;
  note?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left active:bg-white/5"
      >
        <span className={`flex-1 text-[15px] font-semibold ${value ? "" : "text-[var(--muted)]"}`}>{label}</span>
        {note ? <span className="text-[11.5px] text-[var(--muted)] tabular-nums">{note}</span> : null}
        {value ? (
          <span className="text-[16px] font-bold tabular-nums">{value}</span>
        ) : (
          <span className="rounded-[4px] border border-[var(--accent)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--accent)]">
            {open ? "Close" : "Log"}
          </span>
        )}
      </button>
      {open ? <div className="px-3 pb-3">{children}</div> : null}
    </div>
  );
}
