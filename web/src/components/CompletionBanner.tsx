"use client";

import { useEffect, useState } from "react";
import { kindLabel, type Win } from "@/lib/wins";

/** Celebration strip after finishing — surfaces PRs and other wins. */
export function CompletionBanner({
  dayName,
  wins,
  show,
  onDismiss,
}: {
  dayName: string;
  wins?: Win[];
  show: boolean;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(show);
  const top = wins?.find((w) => w.kind === "pr") ?? wins?.[0];
  const prCount = wins?.filter((w) => w.kind === "pr").length ?? 0;

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 5200);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  if (!visible) return null;

  const headline =
    prCount > 1
      ? `${prCount} new PRs · ${dayName}`
      : top?.kind === "pr"
        ? top.title
        : `${dayName} complete`;

  const sub =
    prCount > 1
      ? top?.detail || "Scroll for every win below."
      : top?.kind === "pr"
        ? top.detail || "Personal record locked in."
        : top?.detail || "Session logged — check your wins below.";

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex justify-center px-3"
      style={{ paddingTop: "max(12px, env(safe-area-inset-top, 0px))" }}
    >
      <div
        className="w-full max-w-lg rounded-md border border-[var(--green)]/50 bg-[var(--surface)] px-4 py-3 shadow-lg"
        role="status"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--green)]">
              {top ? kindLabel(top.kind) : "Session done"}
            </p>
            <p className="text-sm font-bold text-[var(--text)]">{headline}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{sub}</p>
          </div>
          <button
            type="button"
            className="shrink-0 text-xs font-bold text-[var(--muted)]"
            onClick={() => {
              setVisible(false);
              onDismiss();
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

/** List of wins on the recap (and reusable elsewhere). */
export function WinsCard({ wins }: { wins: Win[] }) {
  const list = wins.filter((w) => w.kind !== "complete" || wins.length === 1);
  if (!list.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-lg font-bold">Wins</p>
      <div className="space-y-2">
        {list.map((w) => (
          <div
            key={w.id}
            className="rounded-md border px-3 py-2.5"
            style={{
              borderColor:
                w.kind === "pr"
                  ? "rgba(61, 220, 151, 0.45)"
                  : "var(--border)",
              background:
                w.kind === "pr" ? "rgba(61, 220, 151, 0.08)" : "var(--card)",
            }}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-wide ${
                w.kind === "pr" ? "text-[var(--green)]" : "text-[var(--blue)]"
              }`}
            >
              {kindLabel(w.kind)}
            </p>
            <p className="text-sm font-semibold text-[var(--text)]">{w.title}</p>
            {w.detail ? (
              <p className="mt-0.5 text-xs text-[var(--muted)]">{w.detail}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
