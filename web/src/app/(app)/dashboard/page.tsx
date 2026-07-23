import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkoutLibrary } from "@/lib/data";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureWorkoutLibrary(user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, day_name, started_at, ended_at")
    .eq("user_id", user.id)
    .gte("started_at", weekAgo.toISOString())
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false });

  const { data: dailyLogs } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", weekAgo.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  const avgProtein =
    dailyLogs && dailyLogs.length
      ? Math.round(
          dailyLogs.reduce(
            (sum, d) =>
              sum + (d.target_protein > 0 ? d.actual_protein / d.target_protein : 0),
            0
          ) /
            dailyLogs.length *
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

  const stepDays = dailyLogs?.filter((d) => d.steps_count >= 10000).length ?? 0;

  const { count: athleteCount } = await supabase
    .from("coach_links")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user.id)
    .eq("status", "active");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-[var(--muted)]">Welcome back</p>
        <h1 className="text-2xl font-bold">
          {profile?.display_name || user.email?.split("@")[0]}
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card">
          <p className="text-xs text-[var(--muted)]">Sessions</p>
          <p className="mt-1 text-xl font-bold">{sessions?.length ?? 0}</p>
          <p className="text-[10px] text-[var(--muted)]">this week</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--muted)]">Protein</p>
          <p className="mt-1 text-xl font-bold">{avgProtein != null ? `${avgProtein}%` : "—"}</p>
          <p className="text-[10px] text-[var(--muted)]">avg to goal</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--muted)]">Sleep</p>
          <p className="mt-1 text-xl font-bold">{avgSleep ? `${avgSleep}h` : "—"}</p>
          <p className="text-[10px] text-[var(--muted)]">weekly avg</p>
        </div>
      </div>

      <div className="card">
        <p className="text-sm font-semibold">This week</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {stepDays} day{stepDays === 1 ? "" : "s"} hit 10k steps
          {(athleteCount ?? 0) > 0
            ? ` · coaching ${athleteCount} athlete${athleteCount === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>

      <div className="grid gap-3">
        <Link href="/train" className="btn-primary text-center">
          Start training
        </Link>
        <Link href="/daily" className="btn-secondary text-center">
          Log nutrition & sleep
        </Link>
        <Link href="/invite" className="btn-secondary text-center">
          Invite your coach
        </Link>
      </div>

      {(sessions?.length ?? 0) > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--muted)]">Recent sessions</h2>
          {sessions?.slice(0, 5).map((s) => (
            <div key={s.id} className="card py-3">
              <p className="font-semibold">{s.day_name}</p>
              <p className="text-xs text-[var(--muted)]">
                {new Date(s.started_at).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-center text-xs text-[var(--muted)]">
        On iPhone: Share → Add to Home Screen
      </p>
    </div>
  );
}
