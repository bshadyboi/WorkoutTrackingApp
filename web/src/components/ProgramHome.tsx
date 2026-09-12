"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { dateKey } from "@/lib/protocol";
import {
  dayHeroUrl,
  elevateProgramDay,
  musclesFromSubtitle,
  splitDayTitle,
  startOfElevateWeek,
} from "@/lib/dayHero";
import { MakeupDayButton } from "@/components/MakeupDayButton";
import { markRestDayComplete, setElevateWeek } from "@/lib/workoutsClient";
import { clearTabCache } from "@/lib/tabCache";
import { useRouter } from "next/navigation";
import type { DateOverrides, ScheduleSlots } from "@/lib/schedule";
import { resolveScheduledDay } from "@/lib/schedule";

type Day = {
  id: string;
  name: string;
  subtitle: string;
  exerciseCount?: number;
  setCount?: number;
};

type Hist = { dayName: string; startedAt: string };

type CarouselSlot = {
  programDay: number;
  rest: boolean;
  day: Day | null;
  label: string;
};

function findElevateDay(days: Day[], programDay: number, week: "A" | "B"): Day | null {
  const wantB = week === "B";
  const hits = days.filter((d) => {
    const m = d.name.match(/^Day\s+(\d+)/i);
    if (!m || Number(m[1]) !== programDay) return false;
    const isB = /\bB$/i.test(d.name.trim());
    return wantB ? isB : !isB;
  });
  return hits[0] ?? days.find((d) => d.name.match(new RegExp(`^Day\\s+${programDay}\\b`, "i"))) ?? null;
}

export function ProgramHome({
  programName,
  isElevate,
  week,
  onWeekChange,
  days,
  scheduleSlots,
  overrides,
  onOverridesChange,
  history,
  todayIsRest,
  todayDone,
  onOpenCalendar,
  onOpenProgress,
}: {
  programName: string;
  isElevate: boolean;
  week: "A" | "B";
  onWeekChange: (w: "A" | "B") => void;
  days: Day[];
  scheduleSlots: ScheduleSlots;
  overrides: DateOverrides;
  onOverridesChange: (o: DateOverrides) => void;
  history: Hist[];
  todayIsRest: boolean;
  todayDone: boolean;
  onOpenCalendar: () => void;
  onOpenProgress: () => void;
}) {
  const router = useRouter();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => new Date(), []);
  const todayProg = isElevate ? elevateProgramDay(today.getDay()) : today.getDay() + 1;
  const [selected, setSelected] = useState(todayProg);

  useEffect(() => {
    const now = new Date();
    setSelected(isElevate ? elevateProgramDay(now.getDay()) : now.getDay() + 1);
  }, [isElevate]);
  const [menu, setMenu] = useState(false);
  const [weekBusy, setWeekBusy] = useState(false);
  const [restBusy, setRestBusy] = useState(false);
  const [restMsg, setRestMsg] = useState("");

  const carousel: CarouselSlot[] = useMemo(() => {
    if (isElevate) {
      return [1, 2, 3, 4, 5, 6, 7].map((programDay) => {
        const rest = programDay === 4 || programDay === 7;
        const day = rest ? null : findElevateDay(days, programDay, week);
        return {
          programDay,
          rest,
          day,
          label: rest ? "REST" : `DAY\n${programDay}`,
        };
      });
    }
    return [0, 1, 2, 3, 4, 5, 6].map((jsDay, i) => {
      const d = new Date(today);
      const delta = jsDay - today.getDay();
      d.setDate(today.getDate() + delta);
      const resolved = resolveScheduledDay(d, scheduleSlots, days, overrides);
      const rest = !resolved;
      return {
        programDay: i + 1,
        rest,
        day: resolved
          ? days.find((x) => x.id === resolved.id) ?? {
              id: resolved.id,
              name: resolved.name,
              subtitle: resolved.subtitle,
            }
          : null,
        label: rest ? "REST" : `DAY\n${i + 1}`,
      };
    });
  }, [days, isElevate, week, scheduleSlots, overrides, today]);

  const slot = carousel.find((c) => c.programDay === selected) ?? carousel[0];
  const { title } = splitDayTitle(slot.day?.name ?? (slot.rest ? "Rest" : "Workout"));
  const muscles = slot.day ? musclesFromSubtitle(slot.day.subtitle) : [];
  const exCount = slot.day?.exerciseCount ?? 0;
  const setCount = slot.day?.setCount ?? exCount * 4;
  const minutes = Math.min(75, Math.max(45, (setCount || 12) * 5));

  const trainedThisWeek = useMemo(() => {
    const start = isElevate
      ? startOfElevateWeek(today)
      : (() => {
          const s = new Date(today);
          s.setHours(0, 0, 0, 0);
          s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
          return s;
        })();
    const keys = new Set<string>();
    for (const h of history) {
      const t = new Date(h.startedAt);
      if (t < start) continue;
      if (/rest/i.test(h.dayName)) continue;
      keys.add(dateKey(t));
    }
    return Math.min(4, keys.size);
  }, [history, isElevate, today]);

  async function flipWeek(dir: -1 | 1) {
    if (!isElevate || weekBusy) return;
    const next: "A" | "B" = dir === 1 ? (week === "A" ? "B" : "A") : week === "B" ? "A" : "B";
    setWeekBusy(true);
    const res = await setElevateWeek(next);
    setWeekBusy(false);
    if (!res.ok) return;
    onWeekChange(next);
    clearTabCache("train");
    router.refresh();
  }

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

  const isToday = selected === todayProg;
  const startHref = slot.day ? `/train/${slot.day.id}/session` : null;
  const viewHref = slot.day ? `/train/${slot.day.id}` : null;

  return (
    <div
      className="space-y-4"
      style={{ paddingTop: "max(10px, env(safe-area-inset-top, 0px))" }}
    >
      <div className="flex items-center justify-between px-0.5">
        <Link
          href="/train/schedule"
          prefetch={false}
          className="flex min-w-0 items-center gap-2 active:opacity-70"
        >
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#7c5cbf] text-[11px] font-black text-[var(--text)]"
            aria-hidden
          >
            ≡
          </span>
          <span className="truncate text-[17px] font-bold text-[var(--text)]">
            {programName} <span className="text-white/50">›</span>
          </span>
        </Link>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center text-xl text-[var(--text)]"
          aria-label="Menu"
          onClick={() => setMenu((v) => !v)}
        >
          ☰
        </button>
      </div>

      {menu ? (
        <div className="rounded-md border border-white/10 bg-[#161616] p-2 text-sm">
          <MenuRow href="/train/schedule" label="Switch program / week" />
          <MenuRow href="/train/manage" label="Edit days" />
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left active:bg-white/5"
            onClick={() => {
              setMenu(false);
              onOpenCalendar();
            }}
          >
            Calendar
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left active:bg-white/5"
            onClick={() => {
              setMenu(false);
              onOpenProgress();
            }}
          >
            Progress & history
          </button>
          <div className="px-1 pt-1">
            <MakeupDayButton
              days={days}
              todayName={slot.day?.name ?? null}
              overrides={overrides}
              onOverridesChange={onOverridesChange}
            />
          </div>
        </div>
      ) : null}

      <div className="rounded-md bg-[#1a1a1a] px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold text-[var(--text)]">Accelerate Your Transformation</p>
            <p className="mt-1 text-[12px] italic text-[var(--muted)]">
              4 workouts = 4x more likely to transform.
            </p>
          </div>
          <span className="shrink-0 text-[12px] font-semibold text-[#8b8b8b]">Why 4? ›</span>
        </div>
        <div className="mt-3.5 flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < trainedThisWeek ? "bg-white" : "bg-[#3a3a3a]"
              }`}
            />
          ))}
        </div>
      </div>

      {isElevate ? (
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            className="text-lg text-white/70"
            disabled={weekBusy}
            onClick={() => void flipWeek(-1)}
            aria-label="Previous week"
          >
            ‹
          </button>
          <p className="text-[15px] font-semibold text-[var(--text)]">
            Week {week === "A" ? "1" : "2"}
            {weekBusy ? "…" : ""}
          </p>
          <button
            type="button"
            className="text-lg text-white/70"
            disabled={weekBusy}
            onClick={() => void flipWeek(1)}
            aria-label="Next week"
          >
            ›
          </button>
        </div>
      ) : null}

      <div className="flex items-end justify-between gap-1 px-0.5">
        {carousel.map((c) => {
          const on = c.programDay === selected;
          return (
            <button
              key={c.programDay}
              type="button"
              onClick={() => setSelected(c.programDay)}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${on ? "bg-white" : "bg-transparent"}`}
              />
              {c.rest ? (
                <>
                  <span
                    className={`text-[10px] font-bold tracking-wide ${
                      on ? "text-[var(--text)]" : "text-[var(--dim)]"
                    }`}
                  >
                    REST
                  </span>
                  <span className={`text-[13px] ${on ? "text-[var(--text)]" : "text-[var(--dim)]"}`}>
                    ☾
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={`text-[10px] font-bold tracking-wide ${
                      on ? "text-[var(--text)]" : "text-[var(--dim)]"
                    }`}
                  >
                    DAY
                  </span>
                  <span
                    className={`text-[15px] font-semibold leading-none ${
                      on ? "text-[var(--text)]" : "text-[var(--dim)]"
                    }`}
                  >
                    {c.programDay}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-md bg-[#111]">
        <div className="relative h-[38vh] min-h-[240px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dayHeroUrl(slot.day?.name ?? title, slot.rest)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-4 text-center">
            <h2 className="text-[28px] font-bold leading-tight tracking-tight text-[var(--text)]">
              {slot.rest ? "Rest Day" : title}
            </h2>
            {slot.rest ? (
              <p className="mt-1 text-[13px] text-[var(--muted)]">Recover · walk · sleep</p>
            ) : muscles.length ? (
              <p className="mt-1 text-[13px] text-[var(--muted)]">{muscles.join(" • ")}</p>
            ) : (
              <p className="mt-1 text-[13px] text-[var(--muted)]">{slot.day?.subtitle || "Training"}</p>
            )}
          </div>
        </div>
        {!slot.rest ? (
          <div className="grid grid-cols-3 border-t border-white/10 bg-black/80 py-3 text-center">
            <div>
              <p className="text-[20px] font-bold text-[var(--text)]">{exCount || "—"}</p>
              <p className="text-[11px] text-[var(--muted)]">Exercises</p>
            </div>
            <div>
              <p className="text-[20px] font-bold text-[var(--text)]">{setCount || "—"}</p>
              <p className="text-[11px] text-[var(--muted)]">Sets</p>
            </div>
            <div>
              <p className="text-[20px] font-bold text-[var(--text)]">{minutes}</p>
              <p className="text-[11px] text-[var(--muted)]">Minutes</p>
            </div>
          </div>
        ) : null}
      </div>

      {slot.rest ? (
        <div className="space-y-2">
          {isToday && !todayDone ? (
            <button
              type="button"
              className="flex min-h-[48px] w-full items-center justify-center rounded-md bg-[var(--blue)] text-[15px] font-bold text-[var(--on-blue)] active:scale-[0.98]"
              disabled={restBusy}
              onClick={() => void completeRest()}
            >
              {restBusy ? "Saving…" : "Mark rest complete"}
            </button>
          ) : isToday && todayDone ? (
            <p className="text-center text-sm font-semibold text-[var(--green)]">Rest complete</p>
          ) : (
            <p className="text-center text-sm text-[var(--muted)]">Rest day on the split</p>
          )}
          {restMsg ? <p className="text-center text-xs text-[var(--yellow)]">{restMsg}</p> : null}
          {todayIsRest && isToday ? (
            <Link href="/dashboard" className="block text-center text-xs font-bold text-[var(--blue)]">
              Log steps & water on Home →
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {viewHref ? (
            <Link
              href={viewHref}
              prefetch={false}
              className="flex min-h-[48px] items-center justify-center rounded-md bg-[#2a2a2a] text-[15px] font-semibold text-[var(--text)] active:scale-[0.98]"
            >
              View workout
            </Link>
          ) : null}
          {startHref ? (
            <Link
              href={startHref}
              prefetch={false}
              className="flex min-h-[48px] items-center justify-center rounded-md bg-[var(--blue)] text-[15px] font-bold text-[var(--on-blue)] active:scale-[0.98]"
            >
              Start Day {slot.programDay}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

function MenuRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex w-full items-center justify-between rounded-md px-3 py-2.5 active:bg-white/5"
    >
      {label}
    </Link>
  );
}
