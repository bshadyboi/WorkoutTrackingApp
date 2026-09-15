"use client";

import { useMemo, useState } from "react";
import { catalogEntry, searchExerciseCatalog } from "@/lib/exerciseCatalog";
import { isContraindicated } from "@/lib/contraindicated";
import { nameLooksUnilateral } from "@/lib/unilateral";

export type AddExercisePick = {
  name: string;
  muscle: string;
  sets: number;
  repRange: string;
  /** The lifter's answer for a custom name; null = infer from the name. */
  sided: boolean | null;
  /** Also add it to the day's plan so it's there next time. */
  keep: boolean;
};

const MUSCLES = ["Chest", "Back", "Lats", "Shoulders", "Side Delts", "Rear Delts", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"];

/**
 * Add a movement partway through a session — a superset, an extra arm finisher,
 * whatever the plan didn't have. Picks from the exercise list or takes any name.
 */
export function AddExerciseSheet({
  dayName,
  busy,
  onClose,
  onAdd,
}: {
  dayName: string;
  busy: boolean;
  onClose: () => void;
  onAdd: (pick: AddExercisePick) => void;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ name: string; muscle: string } | null>(null);
  const [sets, setSets] = useState(3);
  const [repRange, setRepRange] = useState("10–12");
  const [sided, setSided] = useState<boolean | null>(null);
  const [keep, setKeep] = useState(false);

  const hits = useMemo(
    () => searchExerciseCatalog(query).filter((h) => !isContraindicated(h.name)),
    [query]
  );
  const custom = picked ? !catalogEntry(picked.name) : false;
  const needsSide = custom && !nameLooksUnilateral(picked?.name ?? "");

  function choose(name: string, muscle: string) {
    setPicked({ name, muscle });
    setSided(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="flex max-h-[88dvh] w-full max-w-sm flex-col rounded-md border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-lg font-bold">Add exercise</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Log something that isn&apos;t in today&apos;s plan.
        </p>

        {!picked ? (
          <>
            <input
              className="field mt-4 !py-2.5"
              placeholder="Search, e.g. skull crusher"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
              {query.trim().length >= 2 ? (
                <button
                  type="button"
                  className="w-full rounded-md border border-dashed border-[var(--border-solid)] px-3 py-2.5 text-left text-[13.5px] font-semibold text-[var(--blue)]"
                  onClick={() => choose(query.trim(), "")}
                >
                  Use “{query.trim()}”
                </button>
              ) : null}
              {hits.map((h) => (
                <button
                  key={h.name}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left active:bg-white/5"
                  onClick={() => choose(h.name, h.muscle ?? "")}
                >
                  <span className="truncate text-[14px] font-semibold">{h.name}</span>
                  <span className="shrink-0 text-[11px] font-bold text-[var(--muted)]">{h.muscle}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between gap-3 rounded-md bg-[var(--surface)] px-3 py-2.5">
              <p className="min-w-0 truncate text-[14.5px] font-bold">{picked.name}</p>
              <button
                type="button"
                className="shrink-0 text-[12.5px] font-bold text-[var(--blue)]"
                onClick={() => setPicked(null)}
              >
                Change
              </button>
            </div>

            {custom ? (
              <div>
                <p className="label !mb-2">Muscle</p>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={picked.muscle === m}
                      onClick={() => setPicked({ ...picked, muscle: m })}
                      className={`rounded-[4px] px-2.5 py-1.5 text-[12px] font-bold ${
                        picked.muscle === m
                          ? "bg-[var(--blue)] text-[var(--on-blue)]"
                          : "bg-[var(--raised)] text-[var(--muted)]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {needsSide ? (
              <div className="space-y-2">
                <p className="text-[13px] font-semibold">Not in the exercise list — is it one arm or one leg at a time?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      [false, "Both together"],
                      [true, "One side at a time"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={sided === val}
                      onClick={() => setSided(val)}
                      className={`min-h-[44px] rounded-md text-[13px] font-bold ${
                        sided === val
                          ? "bg-[var(--blue)] text-[var(--on-blue)]"
                          : "bg-[var(--raised)] text-[var(--muted)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="label !mb-2">Sets</p>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => setSets((n) => Math.max(1, n - 1))}>
                    −
                  </button>
                  <span className="flex-1 text-center font-mono text-lg font-bold">{sets}</span>
                  <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => setSets((n) => Math.min(8, n + 1))}>
                    +
                  </button>
                </div>
              </div>
              <div>
                <p className="label !mb-2">Reps</p>
                <input className="field !py-2 text-center" value={repRange} onChange={(e) => setRepRange(e.target.value)} />
              </div>
            </div>

            <button
              type="button"
              aria-pressed={keep}
              onClick={() => setKeep((k) => !k)}
              className="flex w-full items-center gap-3 rounded-md bg-[var(--surface)] px-3 py-2.5 text-left"
            >
              <span
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] border-2 text-[13px] font-extrabold ${
                  keep ? "border-[var(--blue)] bg-[var(--blue)] text-[var(--on-blue)]" : "border-[var(--dim)]"
                }`}
              >
                {keep ? "✓" : ""}
              </span>
              <span className="text-[13px] font-semibold">Keep it in {dayName} for next time</span>
            </button>
          </div>
        )}

        {picked ? (
          <button
            type="button"
            className="btn-accent mt-4 w-full !py-2.5"
            disabled={busy || (custom && !picked.muscle) || (needsSide && sided === null)}
            onClick={() =>
              onAdd({
                name: picked.name,
                muscle: picked.muscle || "Other",
                sets,
                repRange: repRange.trim() || "10–12",
                sided: needsSide ? sided : null,
                keep,
              })
            }
          >
            {busy ? "Adding…" : "Add to workout"}
          </button>
        ) : null}
        <button type="button" className="mt-3 w-full text-sm font-semibold text-[var(--muted)]" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
