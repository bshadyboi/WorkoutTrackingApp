"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scanMachine, verdictFor, type ScanResult } from "@/lib/scanMachine";
import { getMyExercises, type MyExercise } from "@/lib/myExercises";
import { restrictionFor } from "@/lib/contraindicated";
import {
  getSwapRecommendations,
  searchExerciseCatalog,
  youtubeThumb,
  type SwapRecommendation,
} from "@/lib/exerciseCatalog";
import { exercisePhoto } from "@/lib/exercisePhotos";

/** How sure the scan was, said plainly — the photo decides, not the app. */
const CONFIDENCE = {
  high: {
    label: "Sure",
    color: "var(--green)",
    hint: "Clear match — the machine or its label gave it away.",
  },
  medium: {
    label: "Fairly sure",
    color: "var(--yellow)",
    hint: "Worth a glance at the name before you use it.",
  },
  low: {
    label: "Guessing",
    color: "var(--red)",
    hint: "This machine could be several lifts — pick the one you mean.",
  },
} as const;

function MusclePills({ muscle }: { muscle?: string }) {
  if (!muscle) return null;
  const tags = muscle
    .split(/[,/]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 2);
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className="rounded-md bg-[var(--border-solid)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function SwapRow({
  item,
  selected,
  onSelect,
}: {
  item: SwapRecommendation;
  selected: boolean;
  onSelect: () => void;
}) {
  const thumb = exercisePhoto(item.name) ?? youtubeThumb(item.youtubeUrl);
  return (
    <button
      type="button"
      className={`swap-option flex w-full items-center gap-3 p-2 text-left ${selected ? "selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="exercise-image relative h-16 w-[86px]">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-lg text-[var(--muted)]">
            💪
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--text)]">
          {item.name}
        </p>
        <MusclePills muscle={item.muscle} />
      </div>
      <span
        className={`ml-auto grid h-7 w-7 place-content-center rounded-full border ${selected ? "border-[var(--blue)] bg-[var(--blue)] text-[var(--on-blue)]" : "border-[var(--dim)]"}`}
        aria-hidden
      >
        {selected ? "✓" : ""}
      </span>
    </button>
  );
}

export function SwapExerciseSheet({
  currentName,
  muscle,
  onClose,
  onSwapHere,
  onSwapAll,
}: {
  currentName: string;
  muscle: string;
  onClose: () => void;
  onSwapHere: (name: string) => void;
  onSwapAll: (name: string) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<"session" | "workout">("session");
  const photoRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState("");
  /** Movements this lifter has logged before, catalogued or not. */
  const [mine, setMine] = useState<MyExercise[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getMyExercises().then((list) => {
      if (!cancelled) setMine(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runScan(file: File) {
    setScanning(true);
    setScanError("");
    setScan(null);
    try {
      setScan(await scanMachine(file));
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  const library = useMemo(
    () => getSwapRecommendations(currentName, muscle),
    [currentName, muscle],
  );

  const searchHits = useMemo(
    () => searchExerciseCatalog(query, currentName),
    [query, currentName],
  );

  const searching = query.trim().length >= 2;

  const myMatches = useMemo(() => {
    const current = currentName.trim().toLowerCase();
    const q = query.trim().toLowerCase();
    return mine
      .filter((m) => m.name.toLowerCase() !== current)
      .filter((m) => (searching ? m.name.toLowerCase().includes(q) : true))
      .slice(0, searching ? 8 : 6);
  }, [mine, currentName, query, searching]);
  const recommendations = library.filter((s) => s.recommended);
  const similar = library.filter((s) => s.similar && !s.recommended);
  const list = searching ? searchHits : null;

  const chosen = selected;

  return (
    <div
      className="swap-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="swap-title"
    >
      <div className="swap-dialog">
        <div
          className="flex items-center gap-3 border-b border-[var(--border)] px-4 pb-3"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top, 0px))" }}
        >
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--raised)] text-lg text-[var(--muted)]"
            onClick={onClose}
            aria-label="Back"
          >
            ←
          </button>
          <div>
            <h1 id="swap-title" className="text-lg font-bold">
              Swap exercise
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Replacing {currentName}
            </p>
          </div>
        </div>

        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="mb-2 truncate text-[11px] text-[var(--muted)]">
            Keep the workout. Change one movement.
          </p>
          <div className="flex items-center gap-2">
            <input
              className="field min-w-0 flex-1 !py-2.5"
              placeholder="Search exercises or equipment"
              value={query}
              autoCapitalize="words"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="shrink-0 rounded-md bg-[var(--raised)] px-3 py-2.5 text-[12.5px] font-bold text-[var(--blue)] disabled:opacity-50"
              disabled={scanning}
              onClick={() => photoRef.current?.click()}
            >
              {scanning ? "Reading…" : "Scan machine"}
            </button>
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void runScan(file);
            }}
          />
          {scanError ? (
            <p className="mt-2 text-[12px] text-[var(--red)]">{scanError}</p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
          {myMatches.length ? (
            <section className="mb-4">
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                Your exercises
              </p>
              {myMatches.map((m) => {
                const banned = restrictionFor(m.name);
                return (
                  <div
                    key={m.name}
                    className={`swap-option flex items-center gap-3 p-3 ${chosen === m.name ? "selected" : ""}`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setSelected(m.name)}
                    >
                      <p className="truncate text-sm font-bold text-[var(--text)]">
                        {m.name}
                      </p>
                      <p className="truncate text-[11px] text-[var(--muted)]">
                        {m.sets} {m.sets === 1 ? "set" : "sets"} logged
                        {banned ? ` · ${banned}` : ""}
                      </p>
                    </button>
                    <span
                      className={`grid h-7 w-7 place-content-center rounded-full border ${chosen === m.name ? "border-[var(--blue)] bg-[var(--blue)] text-[var(--on-blue)]" : "border-[var(--dim)]"}`}
                      aria-hidden
                    >
                      {chosen === m.name ? "✓" : ""}
                    </span>
                  </div>
                );
              })}
            </section>
          ) : null}

          {scan ? (
            <section className="mb-4 rounded-md border border-[var(--border-solid)] bg-[var(--card)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                      From your photo
                    </p>
                    {scan.guesses.length ? (
                      <span
                        className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
                        style={{
                          color: CONFIDENCE[scan.confidence].color,
                          background: `color-mix(in srgb, ${CONFIDENCE[scan.confidence].color} 16%, transparent)`,
                        }}
                      >
                        {CONFIDENCE[scan.confidence].label}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[13.5px] font-semibold">
                    {scan.equipment}
                  </p>
                  {scan.label_text ? (
                    <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                      Reads “{scan.label_text}”
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="shrink-0 text-[12px] font-bold text-[var(--muted)]"
                  onClick={() => setScan(null)}
                >
                  Clear
                </button>
              </div>

              {scan.guesses.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-[var(--muted)]">
                  No gym machine in that shot — try again with the whole station
                  in frame.
                </p>
              ) : (
                <div className="mt-2.5 space-y-1.5">
                  {scan.guesses.map((g) => {
                    const verdict = verdictFor(g.name, currentName, muscle);
                    const color =
                      verdict.tone === "avoid"
                        ? "var(--red)"
                        : verdict.tone === "warn"
                          ? "var(--yellow)"
                          : "var(--green)";
                    return (
                      <div
                        key={g.name}
                        className={`rounded-md bg-[var(--surface)] p-2.5 ${
                          chosen === g.name ? "ring-1 ring-[var(--blue)]" : ""
                        }`}
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setSelected(g.name)}
                        >
                          <p className="text-[14px] font-bold">{g.name}</p>
                          <p
                            className="mt-0.5 text-[12px] font-semibold"
                            style={{ color }}
                          >
                            {verdict.line}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                            {g.why}
                          </p>
                        </button>
                        {verdict.tone === "avoid" ? null : (
                          <button
                            type="button"
                            className="mt-2 w-full rounded-[4px] bg-[var(--raised)] py-2 text-[12.5px] font-bold text-[var(--text)]"
                            onClick={() => setSelected(g.name)}
                          >
                            Select replacement
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {scan.setup_tip ? (
                <p className="mt-2.5 text-[12px] text-[var(--muted)]">
                  {scan.setup_tip}
                </p>
              ) : null}
              {scan.guesses.length ? (
                <p className="mt-1.5 text-[11.5px] text-[var(--dim)]">
                  {CONFIDENCE[scan.confidence].hint}
                </p>
              ) : null}
            </section>
          ) : null}
          {searching ? (
            <section className="mb-4">
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                Search results
              </p>
              {list && list.length === 0 ? (
                <p className="px-2 py-6 text-sm text-[var(--muted)]">
                  No matches — try a muscle or a shorter name.
                </p>
              ) : (
                list?.map((item) => (
                  <SwapRow
                    key={item.name}
                    item={item}
                    selected={chosen === item.name}
                    onSelect={() => setSelected(item.name)}
                  />
                ))
              )}
            </section>
          ) : (
            <>
              <section className="mb-4">
                <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  Recommendations
                </p>
                {recommendations.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-[var(--muted)]">
                    No curated swaps yet — check Similar below or search.
                  </p>
                ) : (
                  recommendations.map((item) => (
                    <SwapRow
                      key={item.name}
                      item={item}
                      selected={chosen === item.name}
                      onSelect={() => setSelected(item.name)}
                    />
                  ))
                )}
              </section>
              <section className="mb-4">
                <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  Similar exercises
                </p>
                {similar.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-[var(--muted)]">
                    Nothing else in this muscle family.
                  </p>
                ) : (
                  similar.map((item) => (
                    <SwapRow
                      key={item.name}
                      item={item}
                      selected={chosen === item.name}
                      onSelect={() => setSelected(item.name)}
                    />
                  ))
                )}
              </section>
            </>
          )}
        </div>

        <div className="swap-footer">
          <p className="eyebrow mb-1">Apply to</p>
          <div className="mb-3 grid gap-1 sm:grid-cols-2">
            <label>
              <input
                type="radio"
                name="swap-scope"
                checked={scope === "session"}
                onChange={() => setScope("session")}
              />
              <span>
                <strong className="block">This session only</strong>
                <small className="text-[var(--muted)]">
                  Use it just for today.
                </small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="swap-scope"
                checked={scope === "workout"}
                onChange={() => setScope("workout")}
              />
              <span>
                <strong className="block">Keep in this workout</strong>
                <small className="text-[var(--muted)]">
                  Use it next time too.
                </small>
              </span>
            </label>
          </div>
          <button
            type="button"
            disabled={!chosen || busy}
            className="btn-accent w-full disabled:opacity-40"
            onClick={() => {
              if (!chosen) return;
              if (scope === "session") {
                onSwapHere(chosen);
                return;
              }
              setBusy(true);
              void Promise.resolve(onSwapAll(chosen)).finally(() =>
                setBusy(false),
              );
            }}
          >
            {busy
              ? "Saving…"
              : chosen
                ? `Replace with ${chosen}`
                : "Choose a replacement"}
          </button>
        </div>
      </div>
    </div>
  );
}
