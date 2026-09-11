"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateKey } from "@/lib/protocol";
import { DailyWeightCard, type WeightPoint } from "@/components/WeeklyWeightCard";
import { FastedBloodPressureCard, type BpReadings } from "@/components/FastedBloodPressureCard";
import type { CheckinValues } from "@/components/MorningCheckinCard";
import { BpWeightTrendCard } from "@/components/BpWeightTrendCard";
import { WaterStepsCards } from "@/components/WaterStepsCards";
import { RecompCheckinCard } from "@/components/RecompCheckinCard";
import { KeyLiftsCard } from "@/components/KeyLiftsCard";
import { LiftProgressCard } from "@/components/LiftProgressCard";
import { readTabCache, writeTabCache } from "@/lib/tabCache";
import {
  DEFAULT_TARGETS,
  normalizeTargets,
  targetsLabel,
  type MacroTargets,
} from "@/lib/targets";
import {
  parseOverrides,
  parseSlots,
} from "@/lib/schedule";
import { resolveWeekdayTodayAndTomorrow } from "@/lib/weekdaySchedule";
import { syncWorkoutLibraryOnce } from "@/lib/workoutsClient";
import {
  IconClipboard,
  IconDumbbell,
  IconGear,
  IconUtensils,
} from "@/components/icons";

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
              "water_oz, steps_count, actual_protein, morning_weight, bp1_systolic, bp1_diastolic, bp2_systolic, bp2_diastolic, bp_logged_at, checkin_sleep, checkin_energy, checkin_pump"
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
        actual_protein?: number;
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
            .select("water_oz, steps_count, actual_protein, morning_weight")
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
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-[#1c212b]" />
        <div className="h-28 animate-pulse rounded-2xl bg-[#1c212b]" />
        <div className="h-24 animate-pulse rounded-2xl bg-[#1c212b]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-[28px] font-bold tracking-tight">Let’s work, {data.name}.</h1>
        {refreshing ? (
          <span className="text-[10px] font-semibold text-[var(--muted)]">Updating…</span>
        ) : null}
      </div>

      <RecompCheckinCard />

      <KeyLiftsCard />

      {data.tomorrowDay || data.tomorrowName ? (
        <Link
          href={
            data.tomorrowDay
              ? `/train/${data.tomorrowDay.id}`
              : "/train"
          }
          prefetch={false}
          className="card flex items-center justify-between gap-3 !py-3.5 active:bg-white/5"
          style={{ borderColor: "rgba(91, 168, 255, 0.35)" }}
        >
          <div className="min-w-0">
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
          <span className="shrink-0 text-sm font-bold text-[var(--blue)]">→</span>
        </Link>
      ) : (
        <div className="card !py-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Tomorrow
          </p>
          <p className="text-lg font-bold">Rest day</p>
          <p className="text-xs text-[var(--muted)]">Recover and hit nutrition.</p>
        </div>
      )}

      <DailyWeightCard
        key={`${data.todayStr}-${data.todayWeight}-${data.weightHistory?.length ?? 0}`}
        date={data.todayStr}
        initial={data.todayWeight}
        history={data.weightHistory ?? []}
        targets={data.targets ?? DEFAULT_TARGETS}
      />

      <FastedBloodPressureCard
        key={`bp-${data.todayStr}-${data.bp?.bp1_systolic ?? 0}-${data.bp?.bp2_systolic ?? 0}`}
        date={data.todayStr}
        initial={data.bp}
        targets={data.targets ?? DEFAULT_TARGETS}
      />

      <BpWeightTrendCard />

      <LiftProgressCard />

      <WaterStepsCards
        key={`${data.todayStr}-${data.waterOz}-${data.steps}`}
        date={data.todayStr}
        waterOz={data.waterOz}
        steps={data.steps}
        waterGoal={128}
        targets={data.targets ?? DEFAULT_TARGETS}
      />

      <div className="grid grid-cols-2 gap-3">
        <FeatureTile
          href="/train"
          Icon={IconDumbbell}
          title="Training"
          subtitle={
            data.todayName
              ? data.libraryDay
                ? data.todayName
                : `${data.todayName} · coming soon`
              : "Rest day"
          }
        />
        <FeatureTile
          href="/nutrition"
          Icon={IconUtensils}
          title="Nutrition"
          subtitle={targetsLabel(data.targets ?? DEFAULT_TARGETS)}
        />
        <FeatureTile href="/protocol" Icon={IconClipboard} title="Protocol" subtitle="Today’s stack" />
        <FeatureTile href="/settings" Icon={IconGear} title="Settings" subtitle="Targets & alerts" />
      </div>

    </div>
  );
}

function FeatureTile({
  href,
  Icon,
  title,
  subtitle,
}: {
  href: string;
  Icon: (props: { size?: number }) => React.ReactElement;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} prefetch className="card flex flex-col gap-2.5 !p-3.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1c212b] text-[var(--blue)]">
        <Icon size={19} />
      </span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-xs text-[var(--muted)]">{subtitle}</p>
      </div>
    </Link>
  );
}

