"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { dateKey } from "@/lib/protocol";
import { saveDateOverride } from "@/lib/scheduleClient";
import { shortDayLabel, type DateOverrides } from "@/lib/schedule";

type Day = { id: string; name: string; subtitle?: string };

/**
 * One-tap makeup / skip for today — writes a date override only.
 */
export function MakeupDayButton({
  days,
  todayName,
  overrides,
  onOverridesChange,
}: {
  days: Day[];
  todayName: string | null;
  overrides: DateOverrides;
  onOverridesChange: (next: DateOverrides) => void;
}) {
  const router = useRouter();
  const today = dateKey(new Date());
  const hasOverride = Object.prototype.hasOwnProperty.call(overrides, today);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function apply(dayId: string | null | undefined) {
    setBusy(true);
    setMsg("");
    const res = await saveDateOverride(today, dayId);
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    onOverridesChange(res.overrides);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="text-xs font-bold text-[var(--blue)]"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close" : hasOverride ? "Change makeup · Reset" : "Not today? Swap / skip"}
      </button>

      {open ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
          <p className="text-[11px] text-[var(--muted)]">
            Changes <span className="font-semibold text-[var(--text)]">today only</span>
            {todayName ? ` · scheduled ${todayName}` : " · scheduled Rest"}. Weekly template stays
            the same.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {days.map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={busy}
                onClick={() => void apply(d.id)}
                className="rounded-[4px] bg-[var(--raised)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--text)] active:bg-white/10 disabled:opacity-50"
              >
                {shortDayLabel(d.name)}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => void apply(null)}
              className="rounded-[4px] bg-[var(--raised)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--yellow)] disabled:opacity-50"
            >
              Skip · Rest
            </button>
            {hasOverride ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void apply(undefined)}
                className="rounded-[4px] bg-[var(--green)]/15 px-2.5 py-1.5 text-[11px] font-bold text-[var(--green)] disabled:opacity-50"
              >
                Reset to schedule
              </button>
            ) : null}
          </div>

          {msg ? <p className="text-[11px] text-[var(--yellow)]">{msg}</p> : null}
          {busy ? <p className="text-[11px] text-[var(--muted)]">Saving…</p> : null}
        </div>
      ) : null}
    </div>
  );
}
