import { setText, type ReportSession, type ReportSet } from "./weeklyReport";

type Entry = { set: ReportSet; date: string; sessionId: string };
const stronger = (a: Entry, b: Entry) => a.set.weight > b.set.weight || (a.set.weight === b.set.weight && a.set.reps > b.set.reps);
const top = (entries: Entry[]) => entries.reduce((best, entry) => stronger(entry, best) ? entry : best);
export function programReport(history: ReportSession[], before: Date) {
  const sessions = history.filter(s => /^NT\b/i.test(s.day_name.trim()) && new Date(s.started_at) < before)
    .sort((a,b) => a.started_at.localeCompare(b.started_at) || a.id.localeCompare(b.id));
  const groups = new Map<string, { name: string; entries: Entry[] }>();
  for (const session of sessions) for (const set of session.set_logs) {
    if (set.is_warmup || /warm[\s-]?up/i.test(set.exercise_name) || set.reps <= 0) continue;
    const key = JSON.stringify([set.exercise_name, set.side ?? ""]);
    const group = groups.get(key) ?? { name: `${set.exercise_name}${set.side ? ` (${set.side})` : ""}`, entries: [] };
    group.entries.push({ set, date: session.started_at, sessionId: session.id }); groups.set(key, group);
  }
  const lifts = [...groups.values()].map(({ name, entries }) => {
    const firstId = entries[0].sessionId, lastId = entries[entries.length - 1].sessionId;
    const started = top(entries.filter(e => e.sessionId === firstId));
    const latest = top(entries.filter(e => e.sessionId === lastId));
    const best = top(entries);
    const weight = latest.set.weight - started.set.weight;
    const reps = latest.set.reps - started.set.reps;
    const signed = (n: number) => n > 0 ? `+${n}` : `${n}`;
    return { name, started, latest, best, baselineOnly: firstId === lastId,
      change: firstId === lastId ? "First log — baseline set" : `Latest vs start: ${signed(weight)} lb · ${signed(reps)} reps` };
  });
  return { start: sessions[0]?.started_at ?? null, lifts };
}
export function programCopy(report: ReturnType<typeof programReport>) {
  if (!report.start) return "\n\nNT program progress: No NT workouts logged by the end of this week.";
  const format = (e: Entry) => `${setText(e.set)} · ${new Date(e.date).toLocaleDateString()}`;
  return ["", "", `Since starting NT · first logged workout ${new Date(report.start).toLocaleDateString()}`,
    "Through the selected week. Working sets only. Representative/best set = highest load, then reps at that load; not an estimated strength score.",
    ...report.lifts.flatMap(l => ["", l.name, `Started: ${format(l.started)}`, `Latest: ${format(l.latest)}`, `Best logged load: ${format(l.best)}`, l.change])].join("\n");
}
