"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildWeeklyCheckin,
  weekLabel,
  weekStartKey,
  type SessionBrief,
  type WeeklyScan,
} from "@/lib/checkin";
import { parseSlots } from "@/lib/schedule";
import { CopyShareButton } from "@/components/CopyShareButton";

const FLAG_PREFIX = "ft-weekly-checkin:";

export function WeeklyCheckinCard() {
  const [scan, setScan] = useState<WeeklyScan | null>(null);
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const monday = weekStartKey();
      const label = weekLabel(monday);
      const [y, m, d] = monday.split("-").map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      const [{ data: sessions }, { data: days }, { data: sched }] = await Promise.all([
        supabase
          .from("workout_sessions")
          .select(
            "id, day_name, started_at, duration_seconds, set_logs(exercise_name, weight, reps, set_number)"
          )
          .eq("user_id", user.id)
          .gte("started_at", start.toISOString())
          .lt("started_at", end.toISOString())
          .not("ended_at", "is", null),
        supabase.from("workout_days").select("id, name").eq("user_id", user.id),
        supabase
          .from("training_schedules")
          .select("day_ids")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const briefs: SessionBrief[] = (sessions ?? []).map((s) => ({
        id: s.id,
        dayName: s.day_name,
        startedAt: s.started_at,
        durationSeconds: s.duration_seconds || 0,
        sets: (s.set_logs as SessionBrief["sets"] | null) ?? [],
      }));

      // Unique workout names scheduled this week (from weekly slots)
      const slots = sched?.day_ids ? parseSlots(sched.day_ids) : null;
      const dayById = new Map((days ?? []).map((d) => [d.id, d.name]));
      const scheduledNames = slots
        ? [...new Set(slots.filter(Boolean).map((id) => dayById.get(id!) || "").filter(Boolean))]
        : [];

      const next = buildWeeklyCheckin(briefs, label, scheduledNames);
      setScan(next);

      const isSunday = new Date().getDay() === 0;
      const flag = FLAG_PREFIX + monday;
      if (isSunday && localStorage.getItem(flag) !== "1") {
        localStorage.setItem(flag, "1");
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification(next.title, {
              body: next.statusLine.slice(0, 120),
              icon: "/icons/icon-192.png",
              tag: `checkin-weekly-${monday}`,
              data: { url: "/dashboard" },
            });
            setNotified(true);
          } catch {
            /* ignore */
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!scan) return null;

  return (
    <div className="card space-y-3" style={{ borderColor: "rgba(48, 209, 89, 0.3)" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--green)]">
            {scan.title}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{scan.weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {notified ? (
            <span className="text-[10px] text-[var(--muted)]">notified</span>
          ) : null}
          <CopyShareButton text={scan.copyText} label="Copy summary" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-[var(--muted)]">Sessions</p>
          <p className="text-xl font-bold">{scan.sessionsDone}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-[var(--muted)]">Status</p>
          <p className="text-sm font-semibold text-white">{scan.statusLine}</p>
        </div>
      </div>

      {scan.dayLines.length ? (
        <ul className="space-y-1.5 border-t border-[var(--border)] pt-3">
          {scan.dayLines.map((line) => (
            <li key={line} className="text-sm leading-snug text-white">
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">No sessions yet this week.</p>
      )}

      <Link href="/train" className="text-xs font-bold text-[var(--blue)]">
        Open Train →
      </Link>
    </div>
  );
}
