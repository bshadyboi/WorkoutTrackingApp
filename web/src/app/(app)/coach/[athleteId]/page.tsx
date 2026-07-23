import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrevious, getPreviousSetsByExercise } from "@/lib/data";

export default async function CoachAthletePage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: link } = await supabase
    .from("coach_links")
    .select("id")
    .eq("coach_id", user.id)
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle();

  if (!link) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", athleteId)
    .single();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, day_name, started_at, duration_seconds, set_logs(exercise_name, weight, reps, set_number)")
    .eq("user_id", athleteId)
    .gte("started_at", weekAgo.toISOString())
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false });

  const { data: dailyLogs } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", athleteId)
    .gte("date", weekAgo.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  const previous = await getPreviousSetsByExercise(athleteId);

  const avgProtein =
    dailyLogs && dailyLogs.length
      ? Math.round(
          (dailyLogs.reduce(
            (sum, d) =>
              sum + (d.target_protein > 0 ? d.actual_protein / d.target_protein : 0),
            0
          ) /
            dailyLogs.length) *
            100
        )
      : null;

  const avgSleep =
    dailyLogs && dailyLogs.filter((d) => d.sleep_hours > 0).length
      ? (
          dailyLogs
            .filter((d) => d.sleep_hours > 0)
            .reduce((s, d) => s + d.sleep_hours, 0) /
          dailyLogs.filter((d) => d.sleep_hours > 0).length
        ).toFixed(1)
      : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-[var(--yellow)]">Athlete view · read-only</p>
        <h1 className="text-2xl font-bold">{profile?.display_name || "Athlete"}</h1>
        <p className="text-sm text-[var(--muted)]">{profile?.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card">
          <p className="text-xs text-[var(--muted)]">Sessions</p>
          <p className="text-xl font-bold">{sessions?.length ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--muted)]">Protein</p>
          <p className="text-xl font-bold">{avgProtein != null ? `${avgProtein}%` : "—"}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--muted)]">Sleep</p>
          <p className="text-xl font-bold">{avgSleep ? `${avgSleep}h` : "—"}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[var(--muted)]">Recent sessions</h2>
        {(sessions ?? []).map((s) => (
          <div key={s.id} className="card space-y-2">
            <div className="flex justify-between">
              <p className="font-semibold">{s.day_name}</p>
              <p className="text-xs text-[var(--muted)]">
                {new Date(s.started_at).toLocaleDateString()}
              </p>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {Math.round((s.duration_seconds || 0) / 60)} min ·{" "}
              {(s.set_logs as { exercise_name: string }[] | null)?.length ?? 0} sets logged
            </p>
          </div>
        ))}
        {(sessions?.length ?? 0) === 0 ? (
          <p className="text-sm text-[var(--muted)]">No sessions this week.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[var(--muted)]">Latest lift history</h2>
        <div className="card space-y-2">
          {Object.entries(previous)
            .slice(0, 8)
            .map(([name, sets]) => (
              <div key={name}>
                <p className="text-sm font-semibold text-[var(--blue)]">{name}</p>
                <p className="text-xs text-[var(--muted)]">{formatPrevious(sets)}</p>
              </div>
            ))}
          {Object.keys(previous).length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No lifts logged yet.</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[var(--muted)]">Daily logs</h2>
        {(dailyLogs ?? []).map((d) => (
          <div key={d.id} className="card text-sm">
            <p className="font-semibold">{d.date}</p>
            <p className="text-[var(--muted)]">
              {d.actual_protein}g protein · {d.sleep_hours}h sleep · {d.steps_count} steps
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
