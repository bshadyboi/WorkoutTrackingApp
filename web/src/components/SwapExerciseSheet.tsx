"use client";

import { useMemo, useRef, useState } from "react";
import { scanMachine, verdictFor, type ScanResult } from "@/lib/scanMachine";
import {
  getSwapRecommendations,
  searchExerciseCatalog,
  youtubeThumb,
  type SwapRecommendation,
} from "@/lib/exerciseCatalog";

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
  onSwapHere,
}: {
  item: SwapRecommendation;
  selected: boolean;
  onSelect: () => void;
  onSwapHere: () => void;
}) {
  const thumb = youtubeThumb(item.youtubeUrl);
  return (
    <div
      className={`flex items-center gap-3 rounded-md px-2 py-2 ${
        selected ? "bg-white/8" : ""
      }`}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onSelect}
      >
        <div className="relative h-14 w-[72px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--raised)]">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-lg text-[var(--muted)]">
              💪
            </div>
          )}
          <span className="absolute inset-0 flex items-center justify-center text-white/90">
            ▶
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[var(--text)]">{item.name}</p>
          <MusclePills muscle={item.muscle} />
        </div>
      </button>
      <button
        type="button"
        aria-label={`Swap to ${item.name}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--raised)] text-[var(--muted)]"
        onClick={onSwapHere}
      >
        ⇅
      </button>
    </div>
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
  const photoRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState("");

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
    [currentName, muscle]
  );

  const searchHits = useMemo(
    () => searchExerciseCatalog(query, currentName),
    [query, currentName]
  );

  const searching = query.trim().length >= 2;
  const recommendations = library.filter((s) => s.recommended);
  const similar = library.filter((s) => s.similar && !s.recommended);
  const list = searching ? searchHits : null;

  const chosen = selected;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]">
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
        <h1 className="text-lg font-bold">Swap Exercise</h1>
      </div>

      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="mb-2 truncate text-[11px] text-[var(--muted)]">
          Currently · {currentName}
        </p>
        <div className="flex items-center gap-2">
          <input
            className="field min-w-0 flex-1 !py-2.5"
            placeholder="Explore our exercise database"
            value={query}
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

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-28 pt-2">
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
                <p className="mt-0.5 text-[13.5px] font-semibold">{scan.equipment}</p>
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
                No gym machine in that shot — try again with the whole station in frame.
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
                        <p className="mt-0.5 text-[12px] font-semibold" style={{ color }}>
                          {verdict.line}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">{g.why}</p>
                      </button>
                      {verdict.tone === "avoid" ? null : (
                        <button
                          type="button"
                          className="mt-2 w-full rounded-[4px] bg-[var(--raised)] py-2 text-[12.5px] font-bold text-[var(--text)]"
                          onClick={() => onSwapHere(g.name)}
                        >
                          Use this today
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {scan.setup_tip ? (
              <p className="mt-2.5 text-[12px] text-[var(--muted)]">{scan.setup_tip}</p>
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
                  onSwapHere={() => onSwapHere(item.name)}
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
                    onSwapHere={() => onSwapHere(item.name)}
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
                    onSwapHere={() => onSwapHere(item.name)}
                  />
                ))
              )}
            </section>
          </>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-2 gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 pt-3"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          disabled={!chosen}
          className="rounded-md bg-[var(--raised)] py-3 text-sm font-bold text-[var(--text)] disabled:opacity-40"
          onClick={() => chosen && onSwapHere(chosen)}
        >
          Swap here
        </button>
        <button
          type="button"
          disabled={!chosen || busy}
          className="rounded-md bg-[var(--blue)] py-3 text-sm font-bold text-[var(--on-blue)] disabled:opacity-40"
          onClick={() => {
            if (!chosen) return;
            setBusy(true);
            void Promise.resolve(onSwapAll(chosen)).finally(() => setBusy(false));
          }}
        >
          {busy ? "Saving…" : "Swap all"}
        </button>
      </div>
    </div>
  );
}
