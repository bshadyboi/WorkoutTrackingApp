"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildWeeklyReport, weeklyCopy, weekStart, setText, type ReportSession } from "@/lib/weeklyReport";
import { programReport, programCopy } from "@/lib/programReport";

export default function CoachPage() {
  const [history, setHistory] = useState<ReportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState("All lifts");
  const [copied, setCopied] = useState("");
  const [fallback, setFallback] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const db = createClient();
        const { data: { user } } = await db.auth.getUser();
        if (!user) throw new Error("Sign in required");
        const rows: ReportSession[] = [];
        // Load all history: never claim an all-time PR from a capped sample.
        for (let from = 0; ; from += 100) {
          const { data, error } = await db.from("workout_sessions")
            .select("id,day_name,started_at,notes,set_logs(*)")
            .eq("user_id", user.id).not("ended_at", "is", null)
            .order("started_at", { ascending: true }).order("id", { ascending: true }).range(from, from + 99);
          if (error) throw error;
          if (cancelled) return;
          rows.push(...(data ?? []).map(s => ({ ...s, set_logs: s.set_logs ?? [] })) as ReportSession[]);
          if (!data || data.length < 100) break;
        }
        if (!cancelled) setHistory(rows);
      } catch { if (!cancelled) setError("Couldn't load your history. Check your connection and sign-in, then retry."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load(); return () => { cancelled = true; };
  }, [retry]);
  const start = weekStart(new Date()); start.setDate(start.getDate() + offset * 7);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const last = new Date(end); last.setDate(last.getDate() - 1);
  const label = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${last.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  const startMs = +start, endMs = +end;
  const report = useMemo(() => buildWeeklyReport(history, new Date(startMs), new Date(endMs)), [history, startMs, endMs]);
  const lifts = report.flatMap(s => s.lifts);
  const prs = lifts.filter(l => l.isPR).length;
  const steady = lifts.filter(l => l.status === "Unchanged").length;
  const program = useMemo(() => programReport(history, new Date(endMs)), [history, endMs]);
  const copy = weeklyCopy(report, label) + programCopy(program);
  async function copyReport() {
    try { await navigator.clipboard.writeText(copy); setCopied("Copied!"); window.setTimeout(() => setCopied(""), 2000); }
    catch { setFallback(true); }
  }
  return <div className="space-y-5 min-w-0">
    <header><p className="eyebrow">Coach</p><h1 className="text-3xl font-extrabold">Weekly lift report</h1><p className="text-sm text-[var(--muted)]">Your sets, progress and notes. Ready to share.</p></header>
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <button className="p-4" aria-label="Previous week" onClick={() => { setOffset(offset - 1); setFallback(false); }}>←</button>
      <span className="text-center text-sm font-bold">{label}</span>
      <button className="p-4 disabled:opacity-30" aria-label="Next week" disabled={offset === 0} onClick={() => { setOffset(offset + 1); setFallback(false); }}>→</button>
    </div>
    {loading ? <p role="status">Loading your training history…</p> : error ? <div role="alert" className="card"><p>{error}</p><button className="btn-secondary mt-3" onClick={() => setRetry(retry + 1)}>Retry</button></div> : <>
      <div className="card grid grid-cols-3 text-center gap-2"><div><strong className="text-2xl">{report.length}</strong><p className="text-xs text-[var(--muted)]">Workouts</p></div><div><strong className="text-2xl text-[var(--green)]">{prs}</strong><p className="text-xs text-[var(--muted)]">PR lift sessions</p></div><div><strong className="text-2xl text-[var(--yellow)]">{steady}</strong><p className="text-xs text-[var(--muted)]">Unchanged</p></div></div>
      <details open className="card space-y-3">
        <summary className="cursor-pointer text-xl font-bold">Since starting NT</summary>
        <p className="text-xs text-[var(--muted)]">{program.start ? `First logged NT workout: ${new Date(program.start).toLocaleDateString()}. Through the selected week.` : "No NT split workouts logged by this week yet."}</p>
        {program.lifts.map(lift => <article key={lift.name} className="rounded-lg border border-[var(--border)] p-3 space-y-2">
          <h2 className="font-bold break-words">{lift.name}</h2>
          {[{ label: "Started", entry: lift.started }, { label: "Latest", entry: lift.latest }, { label: "Best load", entry: lift.best }].map(({label,entry}) => <div key={label} className="flex justify-between gap-3 text-sm"><span className="text-[var(--muted)]">{label}</span><span className="text-right"><strong>{setText(entry.set)}</strong><small className="block text-[var(--muted)]">{new Date(entry.date).toLocaleDateString()}</small></span></div>)}
          <p className="text-xs font-semibold text-[var(--blue)]">{lift.change}</p>
        </article>)}
        {program.start && <p className="text-xs text-[var(--muted)]">Working sets only. Each row uses the highest load, then reps at that load. Weight and rep changes are shown separately, not a strength estimate. New exercises start at their first NT log.</p>}
      </details>
      <div className="flex gap-1 rounded-lg bg-[var(--card)] p-1" aria-label="Filter lifts">{["All lifts", "PRs", "Unchanged"].map(f => <button key={f} aria-pressed={filter === f} className={`flex-1 rounded-md py-3 text-sm font-bold ${filter === f ? "bg-[var(--blue)] text-[var(--on-blue)]" : "text-[var(--muted)]"}`} onClick={() => setFilter(f)}>{f}</button>)}</div>
      {!report.length && <div className="card"><h2 className="font-bold">No completed workouts this week</h2><p className="text-sm text-[var(--muted)]">Finish a workout or choose an earlier week. Unsynced workouts appear after uploading.</p></div>}
      {report.length > 0 && !lifts.some(l => filter === "All lifts" || (filter === "PRs" ? l.isPR : l.status === "Unchanged")) && <p className="text-sm text-[var(--muted)]">No lifts match this filter.</p>}
      {report.map(session => {
        const visible = session.lifts.filter(l => filter === "All lifts" || (filter === "PRs" ? l.isPR : l.status === "Unchanged"));
        if (!visible.length) return null;
        return <details open key={`${session.id}-${filter}`} className="card space-y-3">
          <summary className="cursor-pointer font-bold text-lg break-words">{session.day_name}<span className="block text-xs font-normal text-[var(--muted)]">{new Date(session.started_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {session.lifts.length} exercises</span></summary>
          {visible.map(l => <article key={l.name} className="rounded-xl border border-[var(--border)] p-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3"><h2 className="font-bold break-words">{l.name}</h2><span className={`text-[10px] font-bold uppercase rounded px-2 py-1 bg-[var(--raised)] ${l.isPR ? "text-[var(--green)]" : l.status === "Unchanged" ? "text-[var(--yellow)]" : "text-[var(--muted)]"}`}>{l.status}</span></div>
            <table className="w-full table-fixed text-xs sm:text-sm"><thead className="text-[var(--muted)]"><tr><th className="w-1/5 text-left py-2">Set</th><th>Last time</th><th>This session</th></tr></thead><tbody>{l.rows.map((r,i) => <tr key={i} className="border-t border-[var(--border)]"><td className="py-2">{r.current.set_number} {r.current.side}{r.current.is_warmup ? " W" : ""}</td><td className="text-center break-words p-1">{setText(r.previous)}</td><td className="text-center break-words p-1 font-bold">{setText(r.current)}</td></tr>)}</tbody></table>
            <p className="mt-2 text-[11px] text-[var(--muted)]">lb × reps · W = warm-up{l.previous ? ` · Compared with ${new Date(l.previous.started_at).toLocaleDateString()}` : " · No earlier log"}</p>
          </article>)}
          {session.notes && <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">Notes: {session.notes}</p>}
        </details>;
      })}
      {report.length > 0 && <section className="card space-y-3"><h2 className="font-bold text-lg">Coach summary</h2><p className="text-sm">{report.length} workouts logged. {prs} lift sessions with a PR; {steady} unchanged compared with the previous session.</p><p className="text-xs text-[var(--muted)]">PRs use earlier working-set history; first logs are baselines. Unchanged compares load and reps, not effort or a confirmed plateau. Copy includes every lift, regardless of filter.</p><button className="btn-accent w-full" onClick={() => void copyReport()}>{copied || "Copy full weekly report"}</button><span role="status" className="sr-only">{copied}</span>{fallback && <label className="block text-sm">Select and copy your report<textarea readOnly value={copy} onFocus={e => e.target.select()} className="field mt-2 w-full h-64" /></label>}</section>}
    </>}
  </div>;
}
