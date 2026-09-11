"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateKey } from "@/lib/protocol";
import { clearTabCache } from "@/lib/tabCache";
import { shortDayLabel, type DateOverrides, type ScheduleSlots } from "@/lib/schedule";
import { saveDateOverride } from "@/lib/scheduleClient";
import { MakeupDayButton } from "@/components/MakeupDayButton";
import { resolveWeekdayWorkout } from "@/lib/weekdaySchedule";
import { markRestDayComplete, getActiveProgramId } from "@/lib/workoutsClient";
import { getProgram } from "@/lib/programs";
import {
  DERRICK_RECOMP_END,
  DERRICK_RECOMP_START,
  derrickRecompWeek,
} from "@/lib/derrickRecomp";
import { useRouter } from "next/navigation";

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
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          className={`rounded-full px-2 py-1.5 text-center text-[12px] font-semibold ${
            tab === "workouts"
              ? "border border-[var(--blue)] bg-[#1a3050] text-white"
              : "bg-[#1a1f2a] text-[var(--muted)]"
          }`}
          onClick={() => setTab("workouts")}
        >
          Workouts
        </button>
        <button
          type="button"
          className={`rounded-full px-2 py-1.5 text-center text-[12px] font-semibold ${
            tab === "calendar"
              ? "border border-[var(--blue)] bg-[#1a3050] text-white"
              : "bg-[#1a1f2a] text-[var(--muted)]"
          }`}
          onClick={() => setTab("calendar")}
        >
          Calendar
        </button>
        <button
          type="button"
          className={`rounded-full px-2 py-1.5 text-center text-[12px] font-semibold ${
            tab === "progression"
              ? "border border-[var(--blue)] bg-[#1a3050] text-white"
              : "bg-[#1a1f2a] text-[var(--muted)]"
          }`}
          onClick={() => setTab("progression")}
        >
          Progress
        </button>
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

function WorkoutCard({
  id,
  name,
  subtitle,
  highlight,
}: {
  id: string;
  name: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`card flex items-center gap-3 !py-3.5 ${
        highlight ? "ring-1 ring-[var(--blue)]" : ""
      }`}
    >
      <Link href={`/train/${id}`} prefetch={false} className="min-w-0 flex-1 active:opacity-80">
        <p className="font-bold">{name}</p>
        <p className="truncate text-xs text-[var(--muted)]">
          {subtitle || "Tap to preview"}
        </p>
      </Link>
      <Link
        href={`/train/${id}/session`}
        prefetch={false}
        className="inline-flex min-h-[44px] min-w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--green)] px-4 text-sm font-bold text-black active:scale-95"
      >
        Start
      </Link>
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
}: {
  todayName: string | null;
  todayDay: { id: string; name: string; subtitle: string } | null;
  todayIsRest: boolean;
  todayDone: boolean;
  days: Day[];
  history: Hist[];
  overrides: DateOverrides;
  onOverridesChange: (o: DateOverrides) => void;
}) {
  const router = useRouter();
  const hasOverride = Object.prototype.hasOwnProperty.call(overrides, dateKey(new Date()));
  const [restBusy, setRestBusy] = useState(false);
  const [restMsg, setRestMsg] = useState("");
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
  const todayLine = todayIsRest
    ? "Rest day"
    : todayDay?.name?.split("·")[0]?.trim() || todayName || "Training";

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

  return (
    <div className="space-y-5">
      {inRecomp ? (
        <div className="rounded-2xl border border-[var(--blue)]/35 bg-[#1a3050]/40 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--blue)]">
            Derrick Recomp
          </p>
          <p className="text-lg font-bold leading-tight">
            Week {recompWeek}/10 · {todayLine}
            {todayDone ? " · done" : ""}
          </p>
        </div>
      ) : programLabel ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-semibold text-[var(--muted)]">{programLabel}</p>
          <Link href="/train/schedule" className="text-xs font-bold text-[var(--blue)]">
            Schedule →
          </Link>
        </div>
      ) : null}

      {inRecomp ? (
        <div className="flex justify-end">
          <Link href="/train/schedule" className="text-xs font-bold text-[var(--blue)]">
            Schedule →
          </Link>
        </div>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Today</h2>
          <div className="flex items-center gap-1.5">
            {todayDone ? (
              <span className="rounded-full bg-[var(--green)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--green)]">
                Done
              </span>
            ) : null}
            {hasOverride ? (
              <span className="rounded-full bg-[var(--blue)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--blue)]">
                Makeup
              </span>
            ) : (
              <span className="rounded-full bg-[#252b38] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
                Weekly
              </span>
            )}
          </div>
        </div>

        {todayIsRest ? (
          <div className="card space-y-3 text-sm">
            <div>
              <p className="text-lg font-bold text-white">
                {todayDone ? "Rest complete" : "Rest / Recovery"}
              </p>
              <p className="mt-1 text-[var(--muted)]">
                Off day — Zone-2 walk and/or prehab. Hit steps and nutrition.
              </p>
            </div>
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
            <Link href="/dashboard" className="text-xs font-bold text-[var(--blue)]">
              Log steps & water on Home →
            </Link>
          </div>
        ) : todayDay ? (
          <WorkoutCard
            id={todayDay.id}
            name={todayDay.name}
            subtitle={
              todayDone
                ? "Completed today"
                : hasOverride
                  ? "Makeup for today"
                  : "Scheduled for today"
            }
            highlight
          />
        ) : todayName ? (
          <div className="card text-sm text-[var(--muted)]">
            <p className="font-semibold text-white">{todayName}</p>
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

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Your Workouts</h2>
          <div className="flex gap-3">
            <Link href="/train/schedule" className="text-xs font-bold text-[var(--blue)]">
              Schedule
            </Link>
            <Link href="/train/manage" className="text-xs font-bold text-[var(--blue)]">
              Edit days
            </Link>
          </div>
        </div>
        <div className="space-y-2.5">
          {days.map((d) => (
            <WorkoutCard
              key={d.id}
              id={d.id}
              name={d.name}
              subtitle={d.subtitle || `${d.exerciseCount ?? 0} exercises`}
            />
          ))}
        </div>
        <Link
          href="/train/manage"
          className="btn-secondary flex min-h-[44px] w-full items-center justify-center text-sm"
        >
          + Add workout day
        </Link>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">History</h2>
        <div className="card !p-0 overflow-hidden">
          {history.length === 0 ? (
            <p className="p-4 text-sm text-[var(--muted)]">No sessions logged yet.</p>
          ) : (
            history.map((h) => {
              const mins = Math.round(h.durationSeconds / 60);
              const hours = Math.floor(mins / 60);
              const rem = mins % 60;
              const dur = hours > 0 ? `${hours}h ${rem}m` : `${rem}m`;
              return (
                <Link
                  key={h.id}
                  href={`/train/history/${h.id}`}
                  prefetch={false}
                  className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 last:border-0 active:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{h.dayName}</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {new Date(h.startedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · tap for recap
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-[11px] text-[var(--muted)]">
                    <p className="font-semibold text-[var(--yellow)]">
                      {h.setCount} sets
                    </p>
                    <p>{Math.round(h.volume).toLocaleString()} lb</p>
                    <p>{dur}</p>
                  </div>
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
              className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-[10px] ${
                done
                  ? "border-[var(--green)] text-[var(--green)]"
                  : isToday
                    ? "border-[var(--blue)] text-white"
                    : label
                      ? "border-[var(--border-solid)] text-[var(--muted)]"
                      : "border-transparent text-white"
              }`}
            >
              <span className="font-bold text-white">{c.getDate()}</span>
              {done ? (
                <span className="truncate px-0.5 text-[8px]">
                  {doneLabel === "Upper A" ? "✓UA" : doneLabel === "Upper B" ? "✓UB" : doneLabel === "Upper C" ? "✓UC" : "✓"}
                </span>
              ) : short ? (
                <span className="truncate px-0.5">{short}</span>
              ) : null}
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
          <div className="flex max-h-[85dvh] w-full max-w-sm flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
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
                      <div className="h-14 animate-pulse rounded-xl bg-[#1c212b]" />
                      <div className="h-14 animate-pulse rounded-xl bg-[#1c212b]" />
                    </div>
                  ) : sessionDetail.exercises.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No sets logged for this session.</p>
                  ) : (
                    sessionDetail.exercises.map((ex) => (
                      <div
                        key={ex.name}
                        className="rounded-xl border border-[var(--border)] bg-[#161a22] px-3 py-2.5"
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
                    className="btn-green flex w-full items-center justify-center"
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
                      className="btn-green flex w-full items-center justify-center"
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

function ProgressionTab({ history }: { history: Hist[] }) {
  const byDay = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const m = new Map<string, number>();
    for (const h of history) {
      if (new Date(h.startedAt).getTime() < weekAgo) continue;
      m.set(h.dayName, (m.get(h.dayName) ?? 0) + h.volume);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [history]);

  const max = byDay[0]?.[1] || 1;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">This week&apos;s volume</p>
        <span className="btn-pill bg-[#252b38] text-[var(--yellow)]">🏆 tonnage</span>
      </div>
      {byDay.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Log workouts to see volume.</p>
      ) : (
        byDay.map(([name, vol]) => (
          <div key={name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{name}</span>
              <span className="text-[var(--blue)]">{Math.round(vol).toLocaleString()} lb</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(vol / max) * 100}%` }} />
            </div>
          </div>
        ))
      )}
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
