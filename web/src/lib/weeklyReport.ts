export type ReportSet = { exercise_name: string; set_number: number; weight: number; reps: number; is_warmup?: boolean; side?: string | null; rir?: number | null };
export type ReportSession = { id: string; day_name: string; started_at: string; notes?: string | null; set_logs: ReportSet[] };
export function weekStart(date: Date) {
  const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate() - (d.getDay()+6)%7); return d;
}
export function setText(s?: ReportSet) { return s ? `${s.weight} × ${s.reps}${s.rir != null ? ` (${s.rir} RIR)` : ""}` : "—"; }
const working = (s: ReportSet) => !s.is_warmup && !/warm[\s-]?up/i.test(s.exercise_name) && s.reps > 0;
const key = (s: ReportSet) => `${s.set_number}:${s.side ?? ""}:${!!s.is_warmup}`;
export function buildWeeklyReport(history: ReportSession[], start: Date, end: Date) {
  const ordered = [...history].sort((a,b) => a.started_at.localeCompare(b.started_at) || a.id.localeCompare(b.id));
  return ordered.filter(s => new Date(s.started_at) >= start && new Date(s.started_at) < end).map(session => {
    const prior = ordered.filter(s => s.started_at < session.started_at);
    const lifts = [...new Set(session.set_logs.map(s => s.exercise_name))].map(name => {
      const sets = session.set_logs.filter(s => s.exercise_name === name).sort((a,b) => a.set_number-b.set_number || (a.side ?? "").localeCompare(b.side ?? ""));
      const previous = [...prior].reverse().find(s => s.set_logs.some(r => r.exercise_name === name));
      const old = previous?.set_logs.filter(s => s.exercise_name === name) ?? [];
      const allOld = prior.flatMap(s => s.set_logs).filter(s => s.exercise_name === name && working(s));
      const now = sets.filter(working);
      const repPR = now.some(s => { const same = allOld.filter(p => p.weight === s.weight && (p.side ?? "") === (s.side ?? "")); return same.length > 0 && s.reps > Math.max(...same.map(p => p.reps)); });
      const loadPR = now.some(s => { const side = allOld.filter(p => (p.side ?? "") === (s.side ?? "")); return side.length > 0 && s.weight > Math.max(...side.map(p => p.weight)); });
      const oldWorking = old.filter(working);
      const unchanged = now.length > 0 && now.length === oldWorking.length && now.every(s => oldWorking.some(p => key(p) === key(s) && p.weight === s.weight && p.reps === s.reps));
      const status = repPR && loadPR ? "Rep + load PR" : repPR ? "Rep PR" : loadPR ? "Load PR" : unchanged ? "Unchanged" : !allOld.length ? "Baseline" : "Changed";
      return { name, previous, status, isPR: repPR || loadPR, rows: sets.map(s => ({ current: s, previous: old.find(p => key(p) === key(s)) })) };
    });
    return { ...session, lifts };
  });
}
export function weeklyCopy(report: ReturnType<typeof buildWeeklyReport>, label: string) {
  const lifts = report.flatMap(s => s.lifts);
  return [`Weekly lift report · ${label}`, `${report.length} workouts logged.`,
    `PRs: ${[...new Set(lifts.filter(l => l.isPR).map(l => l.name))].join(", ") || "None recorded"}.`,
    `Unchanged: ${[...new Set(lifts.filter(l => l.status === "Unchanged").map(l => l.name))].join(", ") || "None"}.`,
    "Units: lb × reps. PRs compare working sets against earlier logged history. Unchanged means load/reps, not effort or a confirmed plateau.",
    ...report.flatMap(s => ["", `${s.day_name} · ${new Date(s.started_at).toLocaleDateString()}`,
      ...s.lifts.flatMap(l => [`${l.name} — ${l.status}`, ...l.rows.map(r => `  Set ${r.current.set_number}${r.current.side ? ` ${r.current.side}` : ""}${r.current.is_warmup ? " (warm-up)" : ""}: ${setText(r.current)} | Previous: ${setText(r.previous)}`)]),
      ...(s.notes ? [`Notes: ${s.notes}`] : [])])].join("\n");
}
