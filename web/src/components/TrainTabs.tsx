"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateKey } from "@/lib/protocol";
import { clearTabCache } from "@/lib/tabCache";
import { shortDayLabel, type DateOverrides, type ScheduleSlots } from "@/lib/schedule";
import { saveDateOverride } from "@/lib/scheduleClient";
import { MakeupDayButton } from "@/components/MakeupDayButton";
import { KeyLiftsCard } from "@/components/KeyLiftsCard";
import { BpWeightTrendCard } from "@/components/BpWeightTrendCard";
import { resolveWeekdayWorkout } from "@/lib/weekdaySchedule";
import { markRestDayComplete, getActiveProgramId } from "@/lib/workoutsClient";
import { getProgram } from "@/lib/programs";
import {
  DERRICK_RECOMP_END,
  DERRICK_RECOMP_START,
  DERRICK_RECOMP_WEEKS,
  derrickRecompGuidance,
  derrickRecompWeek,
} from "@/lib/derrickRecomp";
import { useRouter } from "next/navigation";
import {
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconDumbbell,
  IconEye,
  IconPlay,
} from "@/components/icons";
import {
  buildLiftSeries,
  formatLiftWeight,
  type LiftPoint,
  type LiftSeries,
} from "@/lib/liftProgress";

type Day = {
  id: string;
  name: string;
  subtitle: string;
  exerciseCount?: number;
  setCount?: number;
};
type Hist = {
  id: string;
  dayName: string;
  startedAt: string;
  durationSeconds: number;
  volume: number;
  setCount: number;
};

function sessionBriefsFromHistory(history: Hist[]) {
  return history.map((h) => ({ dayName: h.dayName, startedAt: h.startedAt }));
}

export function TrainTabs({
  days,
  dateOverrides: initialOverrides,
  history,
  scheduleSlots,
}: {
  days: Day[];
  dateOverrides?: DateOverrides;
  scheduleSlots: ScheduleSlots;
  history: Hist[];
}) {
  const [tab, setTab] = useState<"workouts" | "calendar" | "progression">("workouts");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [overrides, setOverrides] = useState<DateOverrides>(initialOverrides ?? {});
  const sessionBriefs = sessionBriefsFromHistory(history);

  const [programLabel, setProgramLabel] = useState("");
  const [isDerrick, setIsDerrick] = useState(false);
  useEffect(() => {
    void (async () => {
      const id = await getActiveProgramId();
      const p = getProgram(id);
      setProgramLabel(p.shortName);
      setIsDerrick(p.id === "derrick-recomp");
    })();
  }, []);

  const todayKey = dateKey(new Date());
  const recompWeek = derrickRecompWeek(todayKey);
  const inRecomp =
    isDerrick && todayKey >= DERRICK_RECOMP_START && todayKey <= DERRICK_RECOMP_END;
  const guidance = inRecomp ? derrickRecompGuidance(recompWeek) : null;
  const programLine = inRecomp
    ? `${programLabel || "Program"} · Week ${recompWeek} of ${DERRICK_RECOMP_WEEKS}`
    : programLabel;

  /** Sun→Sat of the current week, each resolved against the live schedule */
  const weekInfo = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 12);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const resolved = resolveWeekdayWorkout({
        asOf: d,
        slots: scheduleSlots,
        days,
        overrides,
        sessions: sessionBriefs,
      });
      return { date: d, key: dateKey(d), resolved };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSlots, days, overrides, history]);

  const live = resolveWeekdayWorkout({
    slots: scheduleSlots,
    days,
    overrides,
    sessions: sessionBriefs,
  });
  const liveTodayDay = live.scheduled
    ? {
        id: live.scheduled.id,
        name: live.scheduled.name,
        subtitle: live.scheduled.subtitle ?? "",
      }
    : null;
  const liveTodayName = live.isRest ? null : live.label;
  const liveTodayIsRest = live.isRest;
  const liveTodayDone = live.doneToday;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">Train</h1>
          {programLine ? (
            <p className="mt-0.5 truncate text-[13px] font-semibold text-[var(--muted)]">
              {programLine}
            </p>
          ) : null}
        </div>
        <Link
          href="/train/schedule"
          aria-label="Schedule"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] active:bg-white/5"
        >
          <IconCalendar size={19} />
        </Link>
      </div>

      <WeekStrip weekInfo={weekInfo} todayKey={todayKey} />


      <div className="flex gap-1 rounded-md border border-white/5 bg-[var(--surface)] p-1">
        {(
          [
            ["workouts", "Workouts"],
            ["calendar", "Calendar"],
            ["progression", "Progress"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`h-9 flex-1 rounded-md text-[14px] ${
              tab === key
                ? "bg-[var(--raised)] font-bold text-[var(--text)]"
                : "font-semibold text-[var(--muted)]"
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "workouts" ? (
        <WorkoutsTab
          todayName={liveTodayName}
          todayDay={liveTodayDay}
          todayIsRest={liveTodayIsRest}
          todayDone={liveTodayDone}
          days={days}
          history={history}
          overrides={overrides}
          onOverridesChange={setOverrides}
          guidance={guidance ? { ...guidance, week: recompWeek } : null}
        />
      ) : null}
      {tab === "calendar" ? (
        <CalendarTab
          month={month}
          setMonth={setMonth}
          history={history}
          days={days}
          scheduleSlots={scheduleSlots}
          overrides={overrides}
          setOverrides={setOverrides}
        />
      ) : null}
      {tab === "progression" ? <ProgressionTab history={history} /> : null}
    </div>
  );
}

type WeekDayInfo = {
  date: Date;
  key: string;
  resolved: ReturnType<typeof resolveWeekdayWorkout>;
};

/** "Upper A · Horizontal Strength" → "UA"; "Optional Day 5" → "OD" */
function dayInitials(name: string) {
  const head = name.split("·")[0]?.trim() ?? name;
  const words = head.split(/\s+/).filter(Boolean);
  const letters = words
    .map((w) => (/^\d+$/.test(w) ? w : w[0]?.toUpperCase() ?? ""))
    .join("");
  return letters.slice(0, 2) || "•";
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function WeekStrip({
  weekInfo,
  todayKey,
}: {
  weekInfo: WeekDayInfo[];
  todayKey: string;
}) {
  return (
    <div className="flex justify-between rounded-md border border-[var(--border)] bg-[var(--card)] px-3.5 py-3">
      {weekInfo.map((d) => {
        const isToday = d.key === todayKey;
        const done = d.resolved.doneToday && !d.resolved.isRest;
        const rest = d.resolved.isRest;
        return (
          <div key={d.key} className="flex flex-col items-center gap-1.5">
            <span
              className={`text-[10.5px] font-bold ${
                isToday ? "text-[var(--blue)]" : "text-[var(--dim)]"
              }`}
            >
              {WEEKDAY_SHORT[d.date.getDay()]}
            </span>
            {done ? (
              <span
                className={`flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--green)] text-[var(--on-green)] ${
                  isToday ? "ring-2 ring-[var(--blue)]/60 ring-offset-2 ring-offset-[var(--card)]" : ""
                }`}
              >
                <IconCheck size={14} />
              </span>
            ) : rest ? (
              <span
                className={`h-[30px] w-[30px] rounded-full border border-dashed border-[var(--border-solid)] bg-[var(--surface)] ${
                  isToday ? "!border-solid !border-2 !border-[var(--blue)]" : ""
                }`}
              />
            ) : isToday ? (
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-[var(--blue)] bg-[var(--blue)]/15 text-[var(--blue)]">
                <IconDumbbell size={14} strokeWidth={2.4} />
              </span>
            ) : (
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--card-2)] text-[11px] font-extrabold text-[var(--muted)]">
                {dayInitials(d.resolved.label)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WorkoutsTab({
  todayName,
  todayDay,
  todayIsRest,
  todayDone,
  days,
  history,
  overrides,
  onOverridesChange,
  guidance,
}: {
  todayName: string | null;
  todayDay: { id: string; name: string; subtitle: string } | null;
  todayIsRest: boolean;
  todayDone: boolean;
  days: Day[];
  history: Hist[];
  overrides: DateOverrides;
  onOverridesChange: (o: DateOverrides) => void;
  guidance: { phase: string; note: string; deload: boolean; week: number } | null;
}) {
  const router = useRouter();
  const [showAllHistory, setShowAllHistory] = useState(false);
  const hasOverride = Object.prototype.hasOwnProperty.call(overrides, dateKey(new Date()));
  const [restBusy, setRestBusy] = useState(false);
  const [restMsg, setRestMsg] = useState("");


  async function completeRest() {
    setRestBusy(true);
    setRestMsg("");
    const res = await markRestDayComplete();
    setRestBusy(false);
    if (!res.ok) {
      setRestMsg(res.error);
      return;
    }
    clearTabCache("train");
    clearTabCache("dashboard");
    router.refresh();
  }

  const todayMeta = todayDay ? days.find((d) => d.id === todayDay.id) : null;
  const todayHead = todayDay?.name?.split("·")[0]?.trim() ?? todayName ?? "";
  const todayTail = todayDay?.name?.split("·").slice(1).join("·").trim() ?? "";
  const estMinutes = todayMeta?.setCount
    ? Math.round(5 + todayMeta.setCount * 2.2)
    : null;
  const eyebrowDate = new Date()
    .toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        {todayIsRest ? (
          <div className="card space-y-3 !rounded-md !p-5 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--muted)]">
                TODAY · {eyebrowDate}
              </p>
              {todayDone ? (
                <span className="rounded-md bg-[var(--green)]/15 px-2.5 py-1 text-[11px] font-bold text-[var(--green)]">
                  Done
                </span>
              ) : null}
            </div>
            <div>
              <p className="text-[22px] font-extrabold leading-tight">
                {todayDone ? "Rest complete" : "Rest / Recovery"}
              </p>
              <p className="mt-1 text-[14px] text-[var(--muted)]">Zone-2 walk or prehab. Hit your steps.</p>
            </div>
            {guidance ? (
              <p className={`text-[13px] leading-snug ${guidance.deload ? "text-[var(--yellow)]" : "text-[var(--muted)]"}`}>
                <span className={`font-bold ${guidance.deload ? "" : "text-[var(--blue)]"}`}>
                  Week {guidance.week} · {guidance.phase}.
                </span>{" "}
                {guidance.note}
              </p>
            ) : null}

            {!todayDone ? (
              <button
                type="button"
                className="btn-secondary w-full"
                disabled={restBusy}
                onClick={() => void completeRest()}
              >
                {restBusy ? "Saving…" : "Mark rest complete"}
              </button>
            ) : null}
            {restMsg ? <p className="text-[11px] text-[var(--yellow)]">{restMsg}</p> : null}
          </div>
        ) : todayDay ? (
          <div className="reg space-y-4 rounded-md border border-[var(--border-solid)] bg-[var(--card)] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--muted)]">
                TODAY · {eyebrowDate}
              </p>
              {todayDone ? (
                <span className="rounded-md bg-[var(--green)]/15 px-2.5 py-1 text-[11px] font-bold text-[var(--green)]">
                  Done
                </span>
              ) : hasOverride ? (
                <span className="rounded-md bg-[var(--blue)]/15 px-2.5 py-1 text-[11px] font-bold text-[var(--blue)]">
                  Makeup
                </span>
              ) : (
                <span className="rounded-md bg-[var(--blue)]/15 px-2.5 py-1 text-[11px] font-bold text-[var(--blue)]">
                  Weekly plan
                </span>
              )}
            </div>
            <div>
              <h3 className="text-[26px] font-extrabold leading-tight tracking-tight">
                {todayHead}
              </h3>
              {todayTail ? (
                <p className="mt-0.5 text-[15px] font-medium text-[var(--muted)]">
                  {todayTail}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-4 text-[13px] font-semibold text-[var(--muted)]">
              {todayMeta ? (
                <span className="flex items-center gap-1.5">
                  <IconDumbbell size={15} />
                  {todayMeta.exerciseCount ?? 0} exercises · {todayMeta.setCount ?? 0} sets
                </span>
              ) : null}
              {estMinutes ? (
                <span className="flex items-center gap-1.5">
                  <IconClock size={15} />~{estMinutes} min
                </span>
              ) : null}
            </div>
            {guidance ? (
              <p className={`text-[13px] leading-snug ${guidance.deload ? "text-[var(--yellow)]" : "text-[var(--muted)]"}`}>
                <span className={`font-bold ${guidance.deload ? "" : "text-[var(--blue)]"}`}>
                  Week {guidance.week} · {guidance.phase}.
                </span>{" "}
                {guidance.note}
              </p>
            ) : null}
            <div className="flex gap-2.5">
              <Link
                href={`/train/${todayDay.id}/session`}
                prefetch={false}
                className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-md bg-[var(--accent)] text-[16px] font-extrabold text-[var(--on-accent)] active:scale-[0.98]"
              >
                <IconPlay size={15} />
                {todayDone ? "Train again" : "Start workout"}
              </Link>
              <Link
                href={`/train/${todayDay.id}`}
                prefetch={false}
                aria-label="Preview workout"
                className="flex h-[52px] w-[52px] items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card-2)] text-[var(--muted)] active:bg-white/5"
              >
                <IconEye size={20} />
              </Link>
            </div>
          </div>
        ) : todayName ? (
          <div className="card text-sm text-[var(--muted)]">
            <p className="font-semibold text-[var(--text)]">{todayName}</p>
            <p className="mt-1">
              Scheduled but not in your library yet.{" "}
              <Link href="/train/manage" className="font-semibold text-[var(--blue)]">
                Add day
              </Link>
              .
            </p>
          </div>
        ) : null}

        <MakeupDayButton
          days={days}
          todayName={todayName}
          overrides={overrides}
          onOverridesChange={onOverridesChange}
        />
      </section>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[17px] font-bold">Your workouts</h2>
          <Link href="/train/manage" className="text-[13px] font-bold text-[var(--blue)]">
            Edit
          </Link>
        </div>
        <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card)]">
          {days.map((d, i) => {
            const head = d.name.split("·")[0]?.trim() ?? d.name;
            const tail = d.name.split("·").slice(1).join("·").trim();
            const isToday = todayDay?.id === d.id;
            return (
              <Link
                key={d.id}
                href={`/train/${d.id}`}
                prefetch={false}
                className={`flex items-center gap-3 px-4 py-3.5 active:bg-white/5 ${
                  i > 0 ? "border-t border-white/5" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-[15px] font-bold">{head}</p>
                    {tail ? (
                      <p className="truncate text-[12.5px] font-medium text-[var(--muted)]">
                        {tail}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">
                    {d.exerciseCount ?? 0} exercises · {d.setCount ?? 0} sets
                  </p>
                </div>
                {isToday ? (
                  <span className="shrink-0 rounded-[4px] bg-[var(--blue)]/15 px-2 py-0.5 text-[10.5px] font-bold text-[var(--blue)]">
                    Today
                  </span>
                ) : null}
                <span className="shrink-0 text-[var(--dim)]">
                  <IconChevronRight size={18} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-bold">Recent</h2>
          {history.length > 3 ? (
            <button
              type="button"
              className="text-[13px] font-bold text-[var(--blue)]"
              onClick={() => setShowAllHistory((v) => !v)}
            >
              {showAllHistory ? "Show less" : `See all ${history.length}`}
            </button>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-md border border-white/5 bg-[var(--surface)]">
          {history.length === 0 ? (
            <p className="p-4 text-sm text-[var(--muted)]">No sessions logged yet.</p>
          ) : (
            (showAllHistory ? history : history.slice(0, 3)).map((h) => {
              const mins = Math.round(h.durationSeconds / 60);
              const hours = Math.floor(mins / 60);
              const rem = mins % 60;
              const dur = hours > 0 ? `${hours}h ${rem}m` : `${rem}m`;
              return (
                <Link
                  key={h.id}
                  href={`/train/history/${h.id}`}
                  prefetch={false}
                  className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 last:border-0 active:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-bold">{h.dayName}</p>
                    <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                      {new Date(h.startedAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-[12px] tabular-nums text-[var(--muted)]">
                    {h.setCount} sets · {Math.round(h.volume).toLocaleString()} lb · {dur}
                  </p>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function CalendarTab({
  month,
  setMonth,
  history,
  days,
  scheduleSlots,
  overrides,
  setOverrides,
}: {
  month: Date;
  setMonth: (d: Date) => void;
  history: Hist[];
  days: Day[];
  scheduleSlots: ScheduleSlots;
  overrides: DateOverrides;
  setOverrides: (o: DateOverrides) => void;
}) {
  const sessionBriefs = sessionBriefsFromHistory(history);
  const cells = useMemo(() => buildMonthCells(month), [month]);
  /** Local calendar date → best completed session that day (most sets, then longest) */
  const completed = useMemo(() => {
    const map = new Map<string, Hist>();
    for (const h of history) {
      const key = dateKey(new Date(h.startedAt));
      const prev = map.get(key);
      if (!prev) {
        map.set(key, h);
        continue;
      }
      const better =
        h.setCount > prev.setCount ||
        (h.setCount === prev.setCount && h.durationSeconds > prev.durationSeconds);
      if (better) map.set(key, h);
    }
    return map;
  }, [history]);

  const [pickDate, setPickDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<{
    loading: boolean;
    dayName: string;
    durationSeconds: number;
    exercises: { name: string; line: string }[];
    sessionId: string;
  } | null>(null);

  const title = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayKey = dateKey(new Date());

  const pickKey = pickDate ? dateKey(pickDate) : "";
  const pickSession = pickKey ? completed.get(pickKey) : undefined;
  const pickSessionId = pickSession?.id;
  const pickResolved = pickDate
    ? resolveWeekdayWorkout({
        asOf: pickDate,
        slots: scheduleSlots,
        days,
        overrides,
        sessions: sessionBriefs,
      })
    : null;

  // Load full sets when opening a completed day
  useEffect(() => {
    if (!pickDate || !pickSessionId) {
      setSessionDetail(null);
      setShowAssign(false);
      return;
    }

    const session = completed.get(dateKey(pickDate));
    if (!session) {
      setSessionDetail(null);
      return;
    }

    let cancelled = false;
    setShowAssign(false);
    setSessionDetail({
      loading: true,
      dayName: session.dayName,
      durationSeconds: session.durationSeconds,
      exercises: [],
      sessionId: session.id,
    });

    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("workout_sessions")
        .select("day_name, duration_seconds, set_logs(exercise_name, weight, reps, set_number, is_warmup)")
        .eq("id", session.id)
        .maybeSingle();

      if (cancelled) return;
      if (!data) {
        setSessionDetail({
          loading: false,
          dayName: session.dayName,
          durationSeconds: session.durationSeconds,
          exercises: [],
          sessionId: session.id,
        });
        return;
      }

      type Log = {
        exercise_name: string;
        weight: number;
        reps: number;
        set_number: number;
        is_warmup?: boolean;
      };
      const logs = [...((data.set_logs as Log[] | null) ?? [])]
        .filter((l) => !l.is_warmup)
        .sort(
        (a, b) =>
          a.exercise_name.localeCompare(b.exercise_name) || a.set_number - b.set_number
      );
      const byName = new Map<string, Log[]>();
      for (const s of logs) {
        const arr = byName.get(s.exercise_name) ?? [];
        arr.push(s);
        byName.set(s.exercise_name, arr);
      }

      setSessionDetail({
        loading: false,
        dayName: data.day_name || session.dayName,
        durationSeconds: data.duration_seconds || session.durationSeconds,
        sessionId: session.id,
        exercises: [...byName.entries()].map(([name, rows]) => ({
          name,
          line: rows
            .map((r) => {
              const w = Number.isInteger(r.weight) ? String(r.weight) : r.weight.toFixed(1);
              return `${w} × ${r.reps}`;
            })
            .join("  ·  "),
        })),
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickDate, pickSessionId]);

  async function assign(dayId: string | null | undefined) {
    if (!pickDate) return;
    setSaving(true);
    setMsg("");
    const key = dateKey(pickDate);
    const res = await saveDateOverride(key, dayId);
    setSaving(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setOverrides(res.overrides);
    setPickDate(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="px-2 text-xl text-[var(--blue)]"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          ‹
        </button>
        <h2 className="text-lg font-bold">{title}</h2>
        <button
          type="button"
          className="px-2 text-xl text-[var(--blue)]"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          ›
        </button>
      </div>
      <p className="text-xs text-[var(--muted)]">
        PPL weekly schedule · tap a day to assign a makeup ·{" "}
        <Link href="/train/schedule" className="font-bold text-[var(--blue)]">
          how it works
        </Link>
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[var(--muted)]">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`${d}${i}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) => {
          if (!c) return <div key={`e${i}`} />;
          const key = dateKey(c);
          const done = completed.get(key);
          const weekday = resolveWeekdayWorkout({
            asOf: c,
            slots: scheduleSlots,
            days,
            overrides,
            sessions: sessionBriefs,
          });
          const label = weekday.label;
          const isToday = key === todayKey;
          const short = shortDayLabel(weekday.isRest ? "Rest" : weekday.label);
          const doneLabel = done?.dayName;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPickDate(c)}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-md border ${
                done
                  ? "border-[var(--green)]/45 bg-[var(--green)]/10"
                  : isToday
                    ? "border-[var(--blue)] bg-[var(--blue)]/10"
                    : label
                      ? "border-[var(--border-solid)]"
                      : "border-transparent"
              }`}
            >
              <span
                className={`text-[13px] font-bold tabular-nums ${
                  isToday ? "text-[var(--blue)]" : "text-[var(--text)]"
                }`}
              >
                {c.getDate()}
              </span>
              {done ? (
                <span
                  className="h-[5px] w-[5px] rounded-full bg-[var(--green)]"
                  title={doneLabel || "Completed"}
                />
              ) : short ? (
                <span className="truncate px-0.5 text-[9.5px] font-semibold text-[var(--muted)]">
                  {short}
                </span>
              ) : (
                <span className="h-[5px]" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        <span className="text-[var(--green)]">●</span> completed · tap to view weights &amp; reps
      </p>
      {msg ? <p className="text-center text-xs text-[var(--yellow)]">{msg}</p> : null}

      {pickDate ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[85dvh] w-full max-w-sm flex-col rounded-md border border-[var(--border)] bg-[var(--card)] shadow-xl">
            <div className="shrink-0 border-b border-[var(--border)] p-4 pb-3">
              <p className="text-lg font-bold">
                {pickDate.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {sessionDetail ? (
                <p className="mt-1 text-sm text-[var(--green)]">
                  {sessionDetail.dayName}
                  {sessionDetail.durationSeconds > 0
                    ? ` · ${Math.round(sessionDetail.durationSeconds / 60)} min`
                    : ""}
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Scheduled: {pickResolved?.label ?? "Rest"}
                </p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {sessionDetail ? (
                <div className="space-y-3">
                  {sessionDetail.loading ? (
                    <div className="space-y-2">
                      <div className="h-14 animate-pulse rounded-md bg-[var(--card-2)]" />
                      <div className="h-14 animate-pulse rounded-md bg-[var(--card-2)]" />
                    </div>
                  ) : sessionDetail.exercises.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No sets logged for this session.</p>
                  ) : (
                    sessionDetail.exercises.map((ex) => (
                      <div
                        key={ex.name}
                        className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2.5"
                      >
                        <p className="text-sm font-semibold text-[var(--blue)]">{ex.name}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
                          {ex.line}
                        </p>
                      </div>
                    ))
                  )}
                  <Link
                    href={`/train/history/${sessionDetail.sessionId}`}
                    prefetch={false}
                    className="btn-accent flex w-full items-center justify-center"
                  >
                    View full recap
                  </Link>
                  {!showAssign ? (
                    <button
                      type="button"
                      className="w-full text-sm font-semibold text-[var(--muted)]"
                      onClick={() => setShowAssign(true)}
                    >
                      Change schedule…
                    </button>
                  ) : null}
                </div>
              ) : null}

              {!sessionDetail || showAssign ? (
                <div className={`space-y-2 ${sessionDetail ? "mt-3 border-t border-[var(--border)] pt-3" : ""}`}>
                  {!sessionDetail ? (
                    <p className="mb-1 text-xs text-[var(--muted)]">Assign this day’s workout</p>
                  ) : (
                    <p className="mb-1 text-xs text-[var(--muted)]">Change scheduled day</p>
                  )}
                  <button
                    type="button"
                    className="btn-secondary w-full !py-2.5"
                    disabled={saving}
                    onClick={() => void assign(null)}
                  >
                    Rest
                  </button>
                  {days.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className="btn-secondary w-full !py-2.5 text-left"
                      disabled={saving}
                      onClick={() => void assign(d.id)}
                    >
                      {d.name}
                    </button>
                  ))}
                  {Object.prototype.hasOwnProperty.call(overrides, pickKey) ? (
                    <button
                      type="button"
                      className="w-full py-2 text-sm font-semibold text-[var(--blue)]"
                      disabled={saving}
                      onClick={() => void assign(undefined)}
                    >
                      Reset to weekly schedule
                    </button>
                  ) : null}
                  {pickResolved?.scheduled && pickKey <= todayKey ? (
                    <Link
                      href={
                        pickKey === todayKey
                          ? `/train/${pickResolved.scheduled.id}/session`
                          : `/train/${pickResolved.scheduled.id}/session?date=${pickKey}`
                      }
                      className="btn-accent flex w-full items-center justify-center"
                      prefetch={false}
                    >
                      {pickKey === todayKey ? "Start workout" : "Log / backfill"}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-[var(--border)] p-3">
              <button
                type="button"
                className="w-full text-sm font-semibold text-[var(--muted)]"
                onClick={() => setPickDate(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Top-set weight over time, drawn as a flat baseline when the lift hasn't moved. */
function Sparkline({ points }: { points: LiftPoint[] }) {
  const w = 96;
  const h = 28;
  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * step : w / 2;
    const y = h - 3 - ((p.weight - min) / span) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const rising = weights[weights.length - 1] > weights[0];
  const stroke = rising ? "var(--green)" : max === min ? "var(--dim)" : "var(--blue)";

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={coords[coords.length - 1]?.split(",")[0]}
        cy={coords[coords.length - 1]?.split(",")[1]}
        r="2.5"
        fill={stroke}
      />
    </svg>
  );
}

function TrendStat({
  label,
  value,
  prev,
  format,
}: {
  label: string;
  value: number;
  prev: number;
  format?: (n: number) => string;
}) {
  const delta = value - prev;
  const show = format ?? ((n: number) => String(Math.round(n)));
  return (
    <div className="rounded-md border border-white/5 bg-[var(--surface)] px-3 py-2.5">
      <p className="text-[17px] font-extrabold tabular-nums">{show(value)}</p>
      <p className="text-[10.5px] font-semibold text-[var(--muted)]">{label}</p>
      {prev > 0 || value > 0 ? (
        <p
          className={`mt-1 text-[10.5px] font-bold tabular-nums ${
            delta > 0
              ? "text-[var(--green)]"
              : delta < 0
                ? "text-[var(--muted)]"
                : "text-[var(--muted)]"
          }`}
        >
          {delta === 0 ? "same as last wk" : `${delta > 0 ? "+" : ""}${show(delta)} vs last wk`}
        </p>
      ) : null}
    </div>
  );
}

function ProgressionTab({ history }: { history: Hist[] }) {
  const [series, setSeries] = useState<LiftSeries[] | null>(null);
  const [loadError, setLoadError] = useState("");

  // Set-level rows are only needed on this tab, so they load on demand rather
  // than weighing down every Train tab visit.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from("workout_sessions")
        .select("started_at, set_logs(exercise_name, weight, reps, is_completed, is_warmup)")
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(60);

      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setSeries([]);
        return;
      }
      setSeries(buildLiftSeries(data ?? [], 10));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const weeks = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay()
    );
    const startOfLast = new Date(startOfWeek);
    startOfLast.setDate(startOfLast.getDate() - 7);

    const bucket = (from: Date, to: Date) => {
      const rows = history.filter((h) => {
        const t = new Date(h.startedAt);
        return t >= from && t < to && !/rest/i.test(h.dayName.trim());
      });
      return {
        sessions: rows.length,
        volume: rows.reduce((n, h) => n + h.volume, 0),
        sets: rows.reduce((n, h) => n + h.setCount, 0),
      };
    };

    // Consecutive weeks, ending this one, with at least one training session.
    // An untrained current week doesn't break the streak until it's over.
    let streak = 0;
    for (let w = 0; w < 26; w++) {
      const from = new Date(startOfWeek);
      from.setDate(from.getDate() - w * 7);
      const to = new Date(from);
      to.setDate(to.getDate() + 7);
      const trained = history.some((h) => {
        const t = new Date(h.startedAt);
        return t >= from && t < to && !/rest/i.test(h.dayName.trim());
      });
      if (trained) streak++;
      else if (w > 0) break;
    }

    return {
      this: bucket(startOfWeek, new Date(now.getTime() + 86400000)),
      last: bucket(startOfLast, startOfWeek),
      streak,
    };
  }, [history]);

  const kLb = (n: number) =>
    Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));

  return (
    <div className="space-y-5">
      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-bold">This week</h2>
          <p className="text-[12px] font-semibold tabular-nums text-[var(--muted)]">
            {weeks.streak}-week streak
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <TrendStat
            label="Sessions"
            value={weeks.this.sessions}
            prev={weeks.last.sessions}
          />
          <TrendStat
            label="Volume lb"
            value={weeks.this.volume}
            prev={weeks.last.volume}
            format={kLb}
          />
          <TrendStat label="Sets" value={weeks.this.sets} prev={weeks.last.sets} />
        </div>
      </section>

      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-bold">Lift progression</h2>
          <p className="text-[11.5px] font-semibold text-[var(--muted)]">
            Heaviest set each session
          </p>
        </div>

        {series === null ? (
          <div className="space-y-2">
            <div className="h-[62px] animate-pulse rounded-md bg-[var(--card-2)]" />
            <div className="h-[62px] animate-pulse rounded-md bg-[var(--card-2)]" />
            <div className="h-[62px] animate-pulse rounded-md bg-[var(--card-2)]" />
          </div>
        ) : loadError ? (
          <p className="text-[13px] text-[var(--yellow)]">{loadError}</p>
        ) : series.length === 0 ? (
          <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-[13.5px] text-[var(--muted)]">
              Log a lift on two separate days and its trend shows up here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card)]">
            {series.map((s, i) => (
              <div
                key={s.name}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i > 0 ? "border-t border-white/5" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold">{s.name}</p>
                  <p className="mt-0.5 text-[12.5px] tabular-nums text-[var(--muted)]">
                    {formatLiftWeight(s.latest.weight)} lb × {s.latest.reps}
                    {" · "}
                    {s.points.length} sessions
                  </p>
                </div>
                <Sparkline points={s.points} />
                <p
                  className={`w-[52px] shrink-0 text-right text-[12.5px] font-bold tabular-nums ${
                    s.deltaLb > 0
                      ? "text-[var(--green)]"
                      : s.deltaLb < 0
                        ? "text-[var(--red)]"
                        : "text-[var(--muted)]"
                  }`}
                >
                  {s.deltaLb > 0 ? "+" : ""}
                  {formatLiftWeight(s.deltaLb)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <KeyLiftsCard />
      <BpWeightTrendCard />
    </div>
  );
}

function buildMonthCells(month: Date) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d, 12));
  return cells;
}
