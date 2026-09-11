"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { catalogEntry, youtubeThumb } from "@/lib/exerciseCatalog";
import { clearDraft, loadDraft } from "@/lib/sessionDraft";
import { splitWarmupBlock } from "@/lib/prehab";
import {
  IconCalendar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconHistory,
  IconPencil,
  IconPlay,
  IconPlayCircle,
} from "@/components/icons";

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
  /** "Upper B · Vertical Pull + Shoulders" → headline + focus line */
  const titleHead = title.split("·")[0]?.trim() || title;
  const titleTail = title.split("·").slice(1).join("·").trim();

  const { warmups, main } = useMemo(() => splitWarmupBlock(sorted), [sorted]);

  const muscles = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    // Prehab is all rear delts / shoulders — the chips should describe the work.
    for (const ex of main) {
      const m = ex.muscle === "Lower Back" ? "Core" : ex.muscle;
      if (!m || seen.has(m)) continue;
      seen.add(m);
      out.push(m);
      if (out.length >= 4) break;
    }
    return out;
  }, [main]);

  /** Working sets only — the prehab block is a checklist, not loaded volume. */
  const totalSets = main.reduce((n, ex) => n + (ex.default_sets || 0), 0);
  const minutes =
    Math.min(75, Math.max(45, totalSets * 5)) + (warmups.length ? 8 : 0);

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
    <div className="relative -mb-4 bg-[var(--bg)]">
      <div className="relative h-[216px] overflow-hidden">
        {heroImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImg}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover opacity-70"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1d2433] via-[var(--surface)] to-[var(--bg)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/75 to-[var(--bg)]/30" />

        <Link
          href="/train"
          prefetch={false}
          aria-label="Back to Train"
          className="absolute left-4 z-10 flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-sm active:bg-black/60"
          style={{ top: "max(12px, env(safe-area-inset-top, 0px))" }}
        >
          <IconChevronLeft size={20} />
        </Link>

        <div className="absolute inset-x-0 bottom-4 px-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--blue)]">
            {kicker
              ? kicker
              : isElevate
                ? "Advanced"
                : subtitle
                  ? subtitle.split("·")[0].trim()
                  : "Training"}
          </p>
          <h1 className="mt-1 text-[27px] font-extrabold leading-[1.12] tracking-tight text-white">
            {titleHead}
          </h1>
          {titleTail ? (
            <p className="mt-0.5 text-[15px] font-medium text-[var(--muted)]">
              {titleTail}
            </p>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-28 pt-4">
        {muscles.length ? (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {muscles.map((m) => (
              <span
                key={m}
                className="rounded-[10px] bg-[var(--card-2)] px-2.5 py-1 text-[11.5px] font-bold text-[var(--muted)]"
              >
                {m}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mb-5 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/5 bg-[var(--surface)] px-3 py-2.5">
            <p className="text-[20px] font-extrabold leading-none tabular-nums">
              {main.length}
            </p>
            <p className="mt-1 text-[10.5px] font-semibold text-[var(--muted)]">
              Exercises
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[var(--surface)] px-3 py-2.5">
            <p className="text-[20px] font-extrabold leading-none tabular-nums">
              {totalSets}
            </p>
            <p className="mt-1 text-[10.5px] font-semibold text-[var(--muted)]">Sets</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[var(--surface)] px-3 py-2.5">
            <p className="text-[20px] font-extrabold leading-none tabular-nums">
              {minutes}
            </p>
            <p className="mt-1 text-[10.5px] font-semibold text-[var(--muted)]">Min</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2">
          <Link
            href="/train/schedule"
            prefetch={false}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 text-[var(--muted)] active:bg-white/5"
          >
            <IconCalendar size={19} />
            <span className="text-[11.5px] font-semibold text-white">Schedule</span>
          </Link>
          <Link
            href="/train"
            prefetch={false}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 text-[var(--muted)] active:bg-white/5"
          >
            <IconHistory size={19} />
            <span className="text-[11.5px] font-semibold text-white">History</span>
          </Link>
          <Link
            href={`/train/manage/${dayId}`}
            prefetch={false}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 text-[var(--muted)] active:bg-white/5"
          >
            <IconPencil size={19} />
            <span className="text-[11.5px] font-semibold text-white">Edit</span>
          </Link>
        </div>

        {hasDraft ? (
          <div className="mb-5 rounded-2xl border border-[var(--blue)]/30 bg-[var(--blue)]/10 p-3.5">
            <p className="text-[14px] font-bold">Saved session on this device</p>
            <div className="mt-2.5 flex gap-2">
              <Link
                href={startHref}
                prefetch={false}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[var(--green)] text-[14px] font-extrabold text-[var(--on-green)]"
              >
                Resume
              </Link>
              <button
                type="button"
                className="min-h-[44px] rounded-xl bg-[var(--card-2)] px-4 text-[13px] font-bold text-[var(--muted)]"
                onClick={discardDraft}
              >
                Discard
              </button>
            </div>
          </div>
        ) : null}

        {warmups.length ? (
          <section className="mb-5 rounded-[18px] border border-[var(--yellow)]/20 bg-[var(--card)] p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[16px] font-bold">Warm-up</h2>
              <p className="text-[11.5px] font-semibold text-[var(--muted)]">
                {warmups.length} moves · ~8 min
              </p>
            </div>
            <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">
              Shoulder prehab — tick these off in your session.
            </p>
            <ul className="mt-3 space-y-1">
              {warmups.map((ex) => {
                const cat = catalogEntry(ex.name);
                return (
                  <li key={ex.id} className="flex items-center gap-3 py-1.5">
                    <span className="h-[22px] w-[22px] shrink-0 rounded-md border-2 border-[var(--dim)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-white">
                        {ex.name}
                      </span>
                      <span className="block truncate text-[12px] text-[var(--muted)]">
                        {ex.working_rep_range || `${ex.default_sets} sets`}
                      </span>
                    </span>
                    {cat?.youtubeUrl ? (
                      <a
                        href={cat.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Form video for ${ex.name}`}
                        className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--card-2)] text-[var(--muted)] active:text-white"
                      >
                        <IconPlayCircle size={16} />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <h2 className="mb-2 text-[16px] font-bold">
          {warmups.length ? "Workout" : "Exercises"}
        </h2>
        <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--card)]">
          {main.map((ex, i) => {
            const cat = catalogEntry(ex.name);
            const thumb = youtubeThumb(cat?.youtubeUrl);
            const { repsLine, tempo } = parseRepsAndTempo(
              ex.working_rep_range,
              ex.default_sets
            );
            const prev = previousByExercise[ex.name] ?? [];
            return (
              <div key={ex.id} className={i > 0 ? "border-t border-white/5" : ""}>
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <span className="mt-0.5 w-4 shrink-0 text-[13px] font-bold tabular-nums text-[var(--dim)]">
                    {i + 1}
                  </span>
                  {cat?.youtubeUrl ? (
                    <a
                      href={cat.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Form video for ${ex.name}`}
                      className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[10px] bg-[var(--card-2)]"
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover opacity-80"
                        />
                      ) : null}
                      <span className="absolute inset-0 flex items-center justify-center text-white">
                        <IconPlayCircle size={20} />
                      </span>
                    </a>
                  ) : (
                    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--card-2)] text-[var(--dim)]">
                      <IconPlayCircle size={20} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold leading-snug text-white">
                      {ex.name}
                    </p>
                    <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--blue)]">
                      {repsLine}
                    </p>
                    {tempo ? (
                      <p className="text-[12px] text-[var(--muted)]">Tempo {tempo}</p>
                    ) : null}
                    {prev.length ? (
                      <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                        Last{" "}
                        {prev
                          .slice(0, 4)
                          .map(
                            (s) =>
                              `${Number.isInteger(s.weight) ? s.weight : s.weight.toFixed(1)}×${s.reps}`
                          )
                          .join("  ")}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-[var(--dim)]"
                    aria-label={`Options for ${ex.name}`}
                    onClick={() => setOpenMenuId((id) => (id === ex.id ? null : ex.id))}
                  >
                    <IconChevronRight
                      size={18}
                      className={openMenuId === ex.id ? "rotate-90" : ""}
                    />
                  </button>
                </div>
                {openMenuId === ex.id ? (
                  <div className="space-y-1.5 px-4 pb-3.5 pl-[76px] text-[12.5px]">
                    {cat?.youtubeUrl ? (
                      <a
                        href={cat.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block font-bold text-white"
                      >
                        Watch form video
                      </a>
                    ) : null}
                    <Link
                      href={startHref}
                      prefetch={false}
                      className="block font-bold text-[var(--blue)]"
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
          <div className="mt-3 overflow-hidden rounded-[18px] border border-white/5 bg-[var(--surface)]">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              onClick={() => setShowGear((v) => !v)}
            >
              <p className="text-[14.5px] font-bold text-white">
                Equipment ({equipment.length})
              </p>
              <span
                className={`text-[var(--muted)] transition-transform ${
                  showGear ? "rotate-180" : ""
                }`}
              >
                <IconChevronDown size={18} />
              </span>
            </button>
            {showGear ? (
              <ul className="space-y-1.5 px-4 pb-3.5 text-[13px] text-[var(--muted)]">
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
          className="glow-green flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--green)] text-[16px] font-extrabold text-[var(--on-green)] active:scale-[0.99]"
        >
          <IconPlay size={15} />
          {hasDraft ? "Resume Workout" : "Start Workout"}
        </Link>
      </div>
    </div>
  );
}
