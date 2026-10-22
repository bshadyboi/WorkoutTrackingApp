"use client";

import type { summarizeLift } from "@/lib/workoutFinish";

type Lift = ReturnType<typeof summarizeLift> & { name: string };
export function WorkoutFinishSummary({ dayName, minutes, lifts, queued, onContinue }: {
  dayName: string; minutes: number; lifts: Lift[]; queued: boolean; onContinue: () => void;
}) {
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="workout-finished-title">
    <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--green)]">Workout complete</p>
      <h2 id="workout-finished-title" className="mt-1 text-2xl font-bold">{dayName}</h2>
      <p role="status" className="mt-2 text-sm text-[var(--muted)]">{queued ? "Saved on this device · Waiting to sync" : "Saved to your account"}</p>
      <p className="mt-3 text-sm">{minutes} min · {lifts.length} movements · {lifts.reduce((n, l) => n + l.sets.length, 0)} working sets{lifts.some(l => / · [LR]$/.test(l.name)) ? " (each side counted)" : ""}</p>
      {queued && <p className="mt-2 text-xs text-[var(--muted)]">Keep this app’s data on your phone. Open the app online to upload this workout.</p>}
      <div className="mt-5 space-y-3">
        {lifts.length === 0 && <p className="text-sm text-[var(--muted)]">Your completed warm-up or timed sets are recorded. No working lifts to compare.</p>}
        {lifts.map(lift => <section key={lift.name} className="rounded-lg bg-[var(--card-2)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 break-words font-bold">{lift.name}</h3><span className="text-xs font-bold text-[var(--green)]">{lift.pr ? "New best vs recorded best" : lift.improved ? "Up from last time" : "Logged"}</span></div>
          <p className="mt-2 text-sm text-[var(--muted)]">{lift.sets.map(s => `${s.weight} lb × ${s.reps}${s.rir != null ? ` (${s.rir === 4 ? "4+" : s.rir} RIR)` : ""}`).join(" · ")}</p>
          {lift.next.length > 0 && <details className="mt-3 text-sm"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-[var(--blue)]">Next time · view set targets</summary><ul className="space-y-3">{lift.next.map(t => <li key={t.set}><p className="font-semibold">Set {t.set}: {t.label}</p><p className="mt-1 text-xs text-[var(--muted)]">{t.detail}</p></li>)}</ul></details>}
        </section>)}
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">Comparisons use available recorded history. Next targets are editable suggestions; your NT plan stays the same.</p>
      <button autoFocus type="button" className="btn-accent mt-5 min-h-11 w-full" onClick={onContinue}>{queued ? "Done" : "Continue to check-in"}</button>
    </div>
  </div>;
}
