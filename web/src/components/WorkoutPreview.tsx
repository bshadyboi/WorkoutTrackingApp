"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { catalogEntry, youtubeThumb } from "@/lib/exerciseCatalog";
import { clearDraft, loadDraft } from "@/lib/sessionDraft";

type Exercise = {
  id: string;
  name: string;
  muscle: string;
  default_sets: number;
  has_crown_set: boolean;
  crown_rep_range: string;
  working_rep_range: string;
  sort_order: number;
};

function seriesLabel(index: number) {
  return `${String.fromCharCode(65 + index)} SERIES`;
}

function splitDayTitle(name: string) {
  const m = name.match(/^Day\s+(\d+)\s*·\s*(.+)$/i);
  if (m) return { kicker: `Day ${m[1]}`, title: m[2].replace(/\s+B$/i, "").trim() };
  return { kicker: null as string | null, title: name };
}

/** Reps: 10 10 10 10  ·  Tempo: 4/0/X/0 */
export function parseRepsAndTempo(
  workingRepRange: string,
  defaultSets: number
): { repsLine: string; tempo: string | null } {
  const raw = workingRepRange || "";
  const tempoMatch = raw.match(/Tempo\s+([0-9X](?:\/[0-9X]){3})/i);
  const tempo = tempoMatch?.[1] ?? null;

  if (/∞|amrap/i.test(raw) && !/\d+\s*[x×]\s*\d+/.test(raw.split("·")[0] || "")) {
    const first = (raw.split("·")[0] || "").trim();
    if (/amrap/i.test(first) || first.includes("∞")) {
      return { repsLine: "∞", tempo };
    }
  }

  const listed = raw.match(
    /(\d+\s*(?:,\s*(?:\d+|∞|AMRAP)){2,})/i
  );
  if (listed) {
    const repsLine = listed[1]
      .replace(/AMRAP/gi, "∞")
      .replace(/,/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { repsLine, tempo };
  }

  const setsReps = raw.match(/^(\d+)\s*[x×]\s*([^\s·]+)/i);
  if (setsReps) {
    const n = Number(setsReps[1]) || defaultSets;
    const token = setsReps[2].replace(/AMRAP/i, "∞");
    if (token === "∞" || /amrap/i.test(token)) {
      return { repsLine: "∞", tempo };
    }
    const rep = token.replace(/\/AMRAP/i, "");
    return {
      repsLine: Array.from({ length: n }, () => rep).join(" "),
      tempo,
    };
  }

  if (/^[0-9]+[–-][0-9]+$/.test(raw.trim())) {
    return {
      repsLine: Array.from({ length: defaultSets }, () => raw.trim()).join(" "),
      tempo,
    };
  }

  return {
    repsLine: Array.from({ length: defaultSets }, () => "—").join(" "),
    tempo,
  };
}

function equipmentFromName(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("smith")) return "Smith machine";
  if (n.includes("hammer strength")) return "Hammer Strength";
  if (n.includes("leg press")) return "Leg press";
  if (n.includes("pendulum")) return "Pendulum squat";
  if (n.includes("pec deck")) return "Pec deck";
  if (n.includes("cable") || n.includes("lat pulldown") || n.includes("pushdown"))
    return "Cable stack";
  if (n.includes("ez-bar") || n.includes("ez bar")) return "EZ-bar";
  if (n.includes("barbell") || n.includes("rdl") || n.includes("military"))
    return "Barbell";
  if (n.includes("db ") || n.includes("dumbbell") || n.includes(" db"))
    return "Dumbbells";
  if (n.includes("machine")) return "Machine";
  if (n.includes("chin") || n.includes("pull-up") || n.includes("pull up"))
    return "Pull-up bar";
  if (n.includes("extension") && n.includes("back")) return "Back extension bench";
  return null;
}

export function WorkoutPreview({
  dayId,
  dayName,
  subtitle,
  exercises,
  previousByExercise,
}: {
  dayId: string;
  dayName: string;
  subtitle: string;
  exercises: Exercise[];
  previousByExercise: Record<string, { weight: number; reps: number }[]>;
}) {
  const sorted = [...exercises].sort((a, b) => a.sort_order - b.sort_order);
  const [hasDraft, setHasDraft] = useState(false);
  const [showGear, setShowGear] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const d = loadDraft(dayId);
    setHasDraft(!!d?.setsByExercise);
  }, [dayId]);

  function discardDraft() {
    clearDraft(dayId);
    setHasDraft(false);
  }

  const { kicker, title } = splitDayTitle(dayName);
  const isElevate = /elevate|day \d/i.test(`${dayName} ${subtitle}`);

  const muscles = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ex of sorted) {
      const m = ex.muscle === "Lower Back" ? "Core" : ex.muscle;
      if (!m || seen.has(m)) continue;
      seen.add(m);
      out.push(m);
      if (out.length >= 4) break;
    }
    return out;
  }, [sorted]);

  const totalSets = sorted.reduce((n, ex) => n + (ex.default_sets || 0), 0);
  const minutes = Math.min(75, Math.max(45, totalSets * 5));

  const equipment = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ex of sorted) {
      const item = equipmentFromName(ex.name);
      if (!item || seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
    return out;
  }, [sorted]);

  const heroCat = sorted.map((ex) => catalogEntry(ex.name)).find((c) => c?.youtubeUrl);
  const heroImg = youtubeThumb(heroCat?.youtubeUrl);

  const startHref = `/train/${dayId}/session`;

  return (
    <div className="relative -mb-4">
      <div className="relative h-[42vh] min-h-[280px] overflow-hidden">
        {heroImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImg}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a2038] via-[#12151c] to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />

        <Link
          href="/train"
          prefetch={false}
          className="absolute left-4 z-10 flex items-center gap-1 text-[15px] font-semibold text-white"
          style={{ top: "max(12px, env(safe-area-inset-top, 0px))" }}
        >
          ← Back
        </Link>

        <div className="absolute inset-x-0 bottom-6 px-5 text-center">
          <p className="text-[12px] font-semibold tracking-wide text-[#c4b5fd]">
            {isElevate ? "Advanced" : subtitle ? subtitle.split("·")[0].trim() : "Training"}
          </p>
          {kicker ? (
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              {kicker}
            </p>
          ) : null}
          <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight text-white">
            {title}
          </h1>
          {muscles.length ? (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {muscles.map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm"
                >
                  {m}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="bg-black px-4 pb-28 pt-4">
        <div className="mb-5 grid grid-cols-4 text-center">
          <Link href="/train/schedule" prefetch={false} className="space-y-1 py-1">
            <p className="text-lg">📅</p>
            <p className="text-[11px] font-semibold text-white">Schedule</p>
          </Link>
          <Link href="/train" prefetch={false} className="space-y-1 py-1">
            <p className="text-lg">🕘</p>
            <p className="text-[11px] font-semibold text-white">History</p>
          </Link>
          <Link
            href={`/train/manage/${dayId}`}
            prefetch={false}
            className="space-y-1 py-1"
          >
            <p className="text-lg">✎</p>
            <p className="text-[11px] font-semibold text-white">Edit</p>
          </Link>
          <Link href={startHref} prefetch={false} className="space-y-1 py-1">
            <p className="text-lg">✓</p>
            <p className="text-[11px] font-semibold text-white">Start</p>
          </Link>
        </div>

        <div className="mb-4">
          <p className="text-[17px] font-bold text-white">Workout Overview</p>
          <div className="mt-3 flex items-center justify-between px-2 text-center">
            <div className="flex-1">
              <p className="text-[28px] font-bold leading-none">{sorted.length}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Moves
              </p>
            </div>
            <span className="h-8 w-px bg-white/15" />
            <div className="flex-1">
              <p className="text-[28px] font-bold leading-none">{totalSets}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Sets
              </p>
            </div>
            <span className="h-8 w-px bg-white/15" />
            <div className="flex-1">
              <p className="text-[28px] font-bold leading-none">{minutes}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Min
              </p>
            </div>
          </div>
        </div>

        {hasDraft ? (
          <div className="mb-4 rounded-2xl border border-white/15 bg-white/5 p-3">
            <p className="text-sm font-semibold">Saved session on this device</p>
            <div className="mt-2 flex gap-2">
              <Link
                href={startHref}
                prefetch={false}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-white text-sm font-bold text-black"
              >
                Resume
              </Link>
              <button
                type="button"
                className="min-h-[44px] rounded-xl bg-[#252b38] px-3 text-xs font-bold"
                onClick={discardDraft}
              >
                Discard
              </button>
            </div>
          </div>
        ) : null}

        <div className="divide-y divide-white/10">
          {sorted.map((ex, i) => {
            const cat = catalogEntry(ex.name);
            const thumb = youtubeThumb(cat?.youtubeUrl);
            const { repsLine, tempo } = parseRepsAndTempo(
              ex.working_rep_range,
              ex.default_sets
            );
            const prev = previousByExercise[ex.name] ?? [];
            return (
              <div key={ex.id} className="py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {seriesLabel(i)}
                </p>
                <div className="flex items-start gap-3">
                  {cat?.youtubeUrl ? (
                    <a
                      href={cat.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-md bg-[#252b38]"
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : null}
                      <span className="absolute inset-0 flex items-center justify-center text-white">
                        ▶
                      </span>
                    </a>
                  ) : (
                    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-md bg-[#252b38] text-lg">
                      💪
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold leading-snug text-white">
                      {ex.name}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[var(--muted)]">
                      Reps: {repsLine}
                    </p>
                    {tempo ? (
                      <p className="text-[13px] text-[var(--muted)]">
                        Tempo: {tempo}
                      </p>
                    ) : null}
                    {prev.length ? (
                      <p className="mt-0.5 text-[11px] text-white/45">
                        Last:{" "}
                        {prev
                          .slice(0, 4)
                          .map((s) => `${Number.isInteger(s.weight) ? s.weight : s.weight.toFixed(1)}×${s.reps}`)
                          .join("  ")}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 px-1 text-lg leading-none text-[var(--muted)]"
                    aria-label="Exercise options"
                    onClick={() =>
                      setOpenMenuId((id) => (id === ex.id ? null : ex.id))
                    }
                  >
                    ···
                  </button>
                </div>
                {openMenuId === ex.id ? (
                  <div className="mt-2 ml-[64px] space-y-1 text-[12px]">
                    {cat?.youtubeUrl ? (
                      <a
                        href={cat.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block font-semibold text-white"
                      >
                        Watch form
                      </a>
                    ) : null}
                    <Link
                      href={`/train/${dayId}/session`}
                      className="block font-semibold text-[var(--blue)]"
                    >
                      Swap in session →
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {equipment.length ? (
          <div className="mt-2 border-t border-white/10">
            <button
              type="button"
              className="flex w-full items-center justify-between py-4 text-left"
              onClick={() => setShowGear((v) => !v)}
            >
              <p className="text-[16px] font-bold text-white">
                Equipment List ({equipment.length})
              </p>
              <span className="text-[var(--muted)]">{showGear ? "▾" : "›"}</span>
            </button>
            {showGear ? (
              <ul className="space-y-1.5 pb-3 text-sm text-[var(--muted)]">
                {equipment.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className="fixed inset-x-0 z-30 mx-auto max-w-lg px-4"
        style={{
          bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Link
          href={startHref}
          prefetch={false}
          className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-white text-[16px] font-bold text-black"
        >
          {hasDraft ? "Resume Workout" : "Start Workout"}
        </Link>
      </div>
    </div>
  );
}
