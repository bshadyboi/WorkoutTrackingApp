"use client";

import { useEffect, useState } from "react";
import { leftShoulderLimited, setLeftShoulderLimited } from "@/lib/shoulderLimits";

/** Settings switch for the temporary left-shoulder limits. */
export function LeftShoulderToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(leftShoulderLimited()), []);

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">Left shoulder limits</p>
          <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">
            {on
              ? "On — left side is never told to add weight, and overhead lifts show a left-arm note."
              : "Off — the left side progresses like the right."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Left shoulder limits"
          onClick={() => {
            const next = !on;
            setOn(next);
            setLeftShoulderLimited(next);
          }}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            on ? "bg-[var(--blue)]" : "bg-[var(--raised)]"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-[var(--text)] transition-all ${
              on ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
      <p className="text-[11.5px] text-[var(--dim)]">Turn off once your physical therapist clears you.</p>
    </div>
  );
}
