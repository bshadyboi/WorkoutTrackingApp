"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyProgram,
  getActiveProgramId,
  markRestDayComplete,
  setElevateWeek,
} from "@/lib/workoutsClient";
import {
  DEFAULT_PROGRAM_ID,
  getProgram,
  PROGRAMS,
  type ProgramId,
} from "@/lib/programs";

export default function TrainSchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [activeId, setActiveId] = useState<ProgramId>(DEFAULT_PROGRAM_ID);
  const [confirmId, setConfirmId] = useState<ProgramId | null>(null);
  const [elevateWeek, setElevateWeekState] = useState<"A" | "B">("A");

  useEffect(() => {
    void (async () => {
      const id = await getActiveProgramId();
      setActiveId(id);
      try {
        const w = localStorage.getItem("fittrack-elevate-week");
        if (w === "A" || w === "B") setElevateWeekState(w);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  const active = getProgram(activeId);

  async function markRest() {
    setBusy(true);
    setMsg("");
    const res = await markRestDayComplete();
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setMsg("Rest logged");
    router.refresh();
    router.push("/train");
  }

  async function switchProgram(id: ProgramId, replace: boolean) {
    setBusy(true);
    setMsg("");
    setConfirmId(null);
    const res = await applyProgram(id, { replace });
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setActiveId(id);
    setMsg(
      replace
        ? `Switched to ${getProgram(id).shortName} — previous split replaced`
        : `Switched to ${getProgram(id).shortName} — previous days kept in Manage`
    );
    try {
      sessionStorage.removeItem("ft-tab:train");
      sessionStorage.removeItem("ft-tab:dashboard");
    } catch {
      /* ignore */
    }
    router.refresh();
  }

  async function toggleElevateWeek(week: "A" | "B") {
    setBusy(true);
    setMsg("");
    const res = await setElevateWeek(week);
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setElevateWeekState(week);
    setMsg(
      week === "A"
        ? "Week A (odd weeks 1/3/5) schedule active"
        : "Week B (even weeks 2/4/6) schedule active"
    );
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/train" className="text-xs font-semibold text-[var(--blue)]">
          ← Train
        </Link>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight">Schedule</h1>
        <p className="text-sm text-[var(--muted)]">
          Active program · {active.name}
        </p>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-[#1c212b]" />
      ) : (
        <div className="space-y-4">
          <div className="card space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
              Training programs
            </p>
            <p className="text-xs text-[var(--muted)]">
              Switch splits anytime. You’ll be asked whether to replace your
              current days or keep them in Manage.
            </p>
            <div className="space-y-2">
              {(Object.keys(PROGRAMS) as ProgramId[]).map((id) => {
                const p = PROGRAMS[id];
                const isActive = id === activeId;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (isActive) return;
                      setConfirmId(id);
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-left ${
                      isActive
                        ? "border-[var(--green)]/50 bg-[var(--green)]/10"
                        : "border-[var(--border)] bg-[#161a22] active:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">{p.name}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
                          {p.description}
                        </p>
                      </div>
                      {isActive ? (
                        <span className="shrink-0 rounded-full bg-[var(--green)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--green)]">
                          Active
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] font-bold text-[var(--blue)]">
                          Switch
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                This week · {active.shortName}
              </p>
              <ol className="mt-2 space-y-1 text-sm">
                {active.weeklyLabels.map((d) => (
                  <li key={d} className="flex gap-2">
                    <span
                      className={
                        d.includes("Rest")
                          ? "text-[var(--yellow)]"
                          : "text-white"
                      }
                    >
                      {d}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {active.tip ? (
              <div className="rounded-xl border border-[var(--border)] bg-[#1a1f2a] p-3 text-sm">
                <p className="font-semibold text-white">Notes</p>
                <p className="mt-1 text-[var(--muted)]">{active.tip}</p>
              </div>
            ) : null}

            {activeId === "elevate-challenge" ? (
              <div className="rounded-xl border border-[var(--border)] bg-[#1a1f2a] p-3 text-sm">
                <p className="font-semibold text-white">Challenge week</p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  Calendar starts Friday as Day 1. Odd weeks (1/3/5) use A days.
                  Even weeks (2/4/6) use B days.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["A", "B"] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleElevateWeek(w)}
                      className={`rounded-lg py-2 text-xs font-bold ${
                        elevateWeek === w
                          ? "bg-[var(--blue)] text-black"
                          : "bg-[#252b38] text-[var(--muted)]"
                      }`}
                    >
                      Week {w}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activeId === "ppl-aesthetics" ? (
              <div className="rounded-xl border border-[var(--border)] bg-[#1a1f2a] p-3 text-sm">
                <p className="font-semibold text-white">Wednesday swaps</p>
                <p className="mt-1 text-[var(--muted)]">
                  Default is{" "}
                  <strong className="text-white">Legs & Back/Arm Pump</strong>.
                  Use makeup for{" "}
                  <strong className="text-white">Leg Day A</strong> or{" "}
                  <strong className="text-white">Leg Day B</strong>.
                </p>
              </div>
            ) : null}

            <button
              type="button"
              className="btn-secondary w-full"
              disabled={busy}
              onClick={() => void markRest()}
            >
              {busy ? "Saving…" : "Mark today as rest (logged)"}
            </button>
            {msg ? (
              <p className="text-[11px] text-[var(--yellow)]">{msg}</p>
            ) : null}
          </div>
        </div>
      )}

      {confirmId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-[var(--border)] bg-[#161a22] p-4">
            <p className="text-lg font-bold text-white">
              Switch to {getProgram(confirmId).shortName}?
            </p>
            <p className="text-sm text-[var(--muted)]">
              Replace removes your current split’s days and loads this program’s
              workouts + weekly schedule. Keep both leaves old days in Manage
              but switches the calendar.
            </p>
            <button
              type="button"
              className="btn-green w-full"
              disabled={busy}
              onClick={() => void switchProgram(confirmId, true)}
            >
              Replace current split
            </button>
            <button
              type="button"
              className="btn-secondary w-full"
              disabled={busy}
              onClick={() => void switchProgram(confirmId, false)}
            >
              Keep both · switch schedule only
            </button>
            <button
              type="button"
              className="w-full py-2 text-sm font-semibold text-[var(--muted)]"
              disabled={busy}
              onClick={() => setConfirmId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
