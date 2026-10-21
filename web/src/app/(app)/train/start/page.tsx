/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseSlots, parseOverrides } from "@/lib/schedule";
import { resolveWeekdayWorkout } from "@/lib/weekdaySchedule";
import { loadDraft } from "@/lib/sessionDraft";
import { workoutPhoto } from "@/lib/workoutPhotos";

type Day = { id: string; name: string; subtitle: string };
export default function StartTrainingPage() {
  const [day, setDay] = useState<Day | null>(null);
  const [resume, setResume] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const db = createClient();
        const { data: { user } } = await db.auth.getUser();
        if (!user) throw new Error("Sign in to see your workout.");
        const [days, schedule] = await Promise.all([
          db.from("workout_days").select("id,name,subtitle").eq("user_id",user.id).order("sort_order"),
          db.from("training_schedules").select("day_ids,date_overrides").eq("user_id",user.id).maybeSingle(),
        ]);
        if (days.error || schedule.error) throw new Error("Couldn't load your plan. Reload to try again.");
        if (cancelled) return;
        const list = (days.data ?? []) as Day[];
        const drafts = list.map(d => ({ day:d, draft:loadDraft(d.id) })).filter(x => x.draft).sort((a,b) => (b.draft?.startedAt ?? 0) - (a.draft?.startedAt ?? 0));
        if (drafts.length) { setDay(drafts[0].day); setResume(true); }
        else { const today = resolveWeekdayWorkout({ days:list, slots:parseSlots(schedule.data?.day_ids), overrides:parseOverrides(schedule.data?.date_overrides) }); setDay(today.scheduled); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load training."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  return <div className="space-y-5"><h1 className="page-heading">{resume ? "Pick up where you left off" : "Ready to train?"}</h1>
    {loading ? <p role="status">Loading your plan…</p> : error ? <p role="alert">{error}</p> : day ? <section className="workout-hero card space-y-4">
      <img className="hero-photo" src={workoutPhoto(day.name)} alt="" />
      <div><h2>{day.name}</h2><p className="mt-2 text-sm">{day.subtitle}</p></div>
      <Link className="btn-accent w-full" href={`/train/${day.id}/session`}>{resume ? "Resume workout" : "Start workout"} →</Link>
    </section> : <div className="card"><h2 className="text-xl font-bold">Rest day</h2><p className="mt-2 text-[var(--muted)]">No workout is scheduled today. You can choose a day from your plan.</p></div>}
    <Link href="/train" className="btn-secondary w-full">Choose from my plan</Link>
  </div>;
}
