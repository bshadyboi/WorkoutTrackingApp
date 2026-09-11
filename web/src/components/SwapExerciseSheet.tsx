"use client";

import { useMemo, useState } from "react";
import {
  getSwapRecommendations,
  searchExerciseCatalog,
  youtubeThumb,
  type SwapRecommendation,
} from "@/lib/exerciseCatalog";

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
          className="rounded-md bg-[#2a3140] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]"
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
      className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
        selected ? "bg-white/8" : ""
      }`}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onSelect}
      >
        <div className="relative h-14 w-[72px] shrink-0 overflow-hidden rounded-lg bg-[#252b38]">
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
          <p className="truncate text-sm font-bold text-white">{item.name}</p>
          <MusclePills muscle={item.muscle} />
        </div>
      </button>
      <button
        type="button"
        aria-label={`Swap to ${item.name}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#252b38] text-[var(--muted)]"
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
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#252b38] text-lg text-[var(--muted)]"
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
        <input
          className="field w-full !py-2.5"
          placeholder="Explore our exercise database"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-28 pt-2">
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
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-2 gap-2 border-t border-[var(--border)] bg-[#12151c] px-4 pt-3"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          disabled={!chosen}
          className="rounded-xl bg-[#252b38] py-3 text-sm font-bold text-white disabled:opacity-40"
          onClick={() => chosen && onSwapHere(chosen)}
        >
          Swap here
        </button>
        <button
          type="button"
          disabled={!chosen || busy}
          className="rounded-xl bg-[#d8dde6] py-3 text-sm font-bold text-black disabled:opacity-40"
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
