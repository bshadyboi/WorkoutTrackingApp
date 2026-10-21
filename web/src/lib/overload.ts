/**
 * Double progression — the rule the programs already state in prose.
 *
 * Derrick Recomp writes it on the exercise itself ("1–3 RIR · add reps before
 * load"), and it is the same rule the Aesthetics Blueprint runs on: work up
 * through the rep range at a fixed load, and only when the top of the range is
 * hit does the weight go up and the reps reset to the bottom.
 *
 * The app already knew both halves — the prescribed range and what was lifted
 * last time — but only ever showed the range, so the lifter did this arithmetic
 * in their head between sets. This turns it into the next target.
 */

export type RepRange = { low: number; high: number };

export type OverloadSuggestion = {
  /** add-reps and add-load are progressions; hold repeats a missed target. */
  kind: "add-reps" | "add-load" | "hold" | "open";
  weight: number | null;
  reps: number | null;
  /** Short imperative for the set row, e.g. "Try 55 × 9". */
  label: string;
  /** Why, for the lifter who wants to check the reasoning. */
  detail: string;
};

export function parseRepRange(raw: string): RepRange | null {
  const text = (raw || "").trim();
  if (!text) return null;

  // Carries and timed holds are prescribed in distance or seconds ("3×30–40m",
  // "45–60s"). Those are not reps, and double progression does not apply.
  if (/\d\s*[–-]\s*\d+\s*(m|km|yd|ft|s|sec|secs|min|mins)\b/i.test(text)) {
    return null;
  }

  const range = text.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (range) {
    const low = Number(range[1]);
    const high = Number(range[2]);
    if (low > 0 && high >= low) return { low, high };
  }

  // "8+" style: treat the stated number as both floor and target.
  const plus = text.match(/(\d+)\s*\+/);
  if (plus) {
    const n = Number(plus[1]);
    if (n > 0) return { low: n, high: n };
  }

  return null;
}

/**
 * Smallest honest jump for a given load. Dumbbells and cable stacks move in
 * 5 lb steps at these weights; very light isolation work can take 2.5.
 */
export function loadStep(weight: number): number {
  if (weight <= 0) return 5;
  if (weight < 30) return 2.5;
  if (weight < 120) return 5;
  return 10;
}

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}

export function suggestOverload(input: {
  /** rir = reps left in the tank last time, when the lifter tapped it. */
  previous?: { weight: number; reps: number; rir?: number | null } | null;
  repRange: string;
  /** Bodyweight or unloaded movements progress on reps only. */
  loadable?: boolean;
  /**
   * Never raise the weight — a side kept light on medical advice. Where the
   * rule would add load, hold at the top of the range instead.
   */
  noLoadIncrease?: boolean;
}): OverloadSuggestion | null {
  const suggestion = suggestOverloadUncapped(input);
  if (!input.noLoadIncrease || !suggestion || suggestion.kind !== "add-load") return suggestion;
  const prev = input.previous!;
  const range = parseRepRange(input.repRange)!;
  const w = Number.isInteger(prev.weight) ? String(prev.weight) : prev.weight.toFixed(1);
  const detail = "Left shoulder is kept light for now — no added weight until you switch the limit off in Settings.";
  // Still room in the range: progress on reps. At the top: hold there.
  if (prev.reps < range.high) {
    const reps = Math.max(prev.reps + 1, range.low);
    return { kind: "add-reps", weight: prev.weight || null, reps, label: `Try ${w} × ${reps}`, detail };
  }
  return { kind: "hold", weight: prev.weight || null, reps: range.high, label: `Hold ${w} × ${range.high}`, detail };
}

function suggestOverloadUncapped(input: {
  previous?: { weight: number; reps: number; rir?: number | null } | null;
  repRange: string;
  loadable?: boolean;
}): OverloadSuggestion | null {
  const range = parseRepRange(input.repRange);
  if (!range) return null;

  const prev = input.previous;
  if (!prev || prev.reps <= 0) {
    return {
      kind: "open",
      weight: prev?.weight ?? null,
      reps: range.low,
      label: `Aim ${range.low}–${range.high} reps`,
      detail: "First time logging this — set your baseline.",
    };
  }

  const loadable = input.loadable !== false && prev.weight > 0;
  const rir = typeof prev.rir === "number" ? prev.rir : null;

  // Reached the top with nothing left: the jump would fail. Repeat it first.
  if (rir === 0 && prev.reps >= range.high) {
    return {
      kind: "hold",
      weight: prev.weight || null,
      reps: prev.reps,
      label: `Repeat ${fmtWeight(prev.weight)} × ${prev.reps}`,
      detail: `Hit ${prev.reps} last time with 0 in reserve — own it once more before adding load.`,
    };
  }

  // Plenty left inside the range: skip the one-rep step and add load now.
  if (rir !== null && rir >= 3 && loadable && prev.reps >= range.low) {
    const next = prev.weight + loadStep(prev.weight);
    return {
      kind: "add-load",
      weight: next,
      reps: range.low,
      label: `Try ${fmtWeight(next)} × ${range.low}`,
      detail: `${prev.reps} reps with ${rir}+ in reserve — too easy, add load.`,
    };
  }

  // Hit the top of the range: add the smallest load and reset to the bottom.
  if (prev.reps >= range.high) {
    if (!loadable) {
      return {
        kind: "add-reps",
        weight: prev.weight || null,
        reps: prev.reps + 1,
        label: `Try ${prev.reps + 1} reps`,
        detail: `Last ${prev.reps} — top of ${range.low}–${range.high}, keep adding reps.`,
      };
    }
    const next = prev.weight + loadStep(prev.weight);
    return {
      kind: "add-load",
      weight: next,
      reps: range.low,
      label: `Try ${fmtWeight(next)} × ${range.low}`,
      detail: `Hit ${prev.reps} at ${fmtWeight(prev.weight)} — top of the range, so add load and reset reps.`,
    };
  }

  // Below the floor: the load is too heavy to progress from yet.
  if (prev.reps < range.low) {
    return {
      kind: "hold",
      weight: prev.weight || null,
      reps: range.low,
      label: `Hold ${fmtWeight(prev.weight)} × ${range.low}`,
      detail: `Last ${prev.reps}, below ${range.low} — stay here until you reach the range.`,
    };
  }

  // Inside the range: one more rep at the same load.
  const reps = prev.reps + 1;
  return {
    kind: "add-reps",
    weight: prev.weight || null,
    reps,
    label: prev.weight > 0 ? `Try ${fmtWeight(prev.weight)} × ${reps}` : `Try ${reps} reps`,
    detail: `Last ${fmtWeight(prev.weight)} × ${prev.reps} — add a rep before adding load.`,
  };
}


/** NT suggestions are optional; the saved program prescription is never edited. */
export function suggestNTTarget(input: {
  previous?: { weight: number; reps: number; rir?: number | null };
  previousSets: { weight: number; reps: number; rir?: number | null }[];
  expectedSets: number;
  repRange: string;
  targetRir: number;
  increment: number;
  noLoadIncrease?: boolean;
}): OverloadSuggestion | null {
  const range = parseRepRange(input.repRange);
  if (!range) return null;
  const p = input.previous;
  if (!p || !Number.isFinite(p.weight) || p.weight < 0 || !Number.isFinite(p.reps) || p.reps <= 0) {
    return { kind: "open", weight: null, reps: range.low, label: `Aim ${range.low}–${range.high} reps`, detail: "No matching set history yet. Choose your starting weight and log a baseline." };
  }
  const hold = (detail: string): OverloadSuggestion => ({ kind: "hold", weight: p.weight, reps: Math.min(p.reps, range.high), label: `Repeat ${fmtWeight(p.weight)} × ${Math.min(p.reps, range.high)}`, detail });
  const validRir = (rir: unknown): rir is number => typeof rir === "number" && Number.isFinite(rir) && rir >= 0 && rir <= 4;
  if (!validRir(p.rir)) return hold("RIR wasn't recorded. Repeat this set as a starting target, or adjust it yourself; no effort level is assumed.");
  if (p.reps < range.low) return hold(`Last set was below ${range.low} reps. Review the load before trying to progress; the target is editable.`);
  if (p.rir < input.targetRir) return hold(`Last set had ${p.rir} RIR, below the configured ${input.targetRir} RIR target. Repeat or adjust the load rather than forcing an increase.`);
  if (p.reps < range.high) {
    if (p.rir <= input.targetRir) return hold(`You reached the configured ${input.targetRir} RIR target. Repeat this performance before adding reps.`);
    const reps = p.reps + 1;
    return { kind: "add-reps", weight: p.weight, reps, label: `Try ${fmtWeight(p.weight)} × ${reps}`, detail: `Last set: ${p.reps} reps at ${p.rir} RIR. Try one extra rep within ${range.low}–${range.high}; keep the target editable.` };
  }
  if (input.noLoadIncrease) return hold("The left-side load limit is on. Keep the weight unchanged.");
  if (p.weight === 0) return hold("Top of the prescribed range reached. Keep this bodyweight target; change the exercise difficulty manually if appropriate.");
  const group = input.previousSets.slice(0, input.expectedSets);
  const ready = input.expectedSets > 0 && group.length === input.expectedSets && group.every(s => s.weight === p.weight && s.reps >= range.high && validRir(s.rir) && s.rir >= input.targetRir);
  if (!ready) return hold("This set reached the top. Keep the load until every prescribed set at this weight reaches the top with RIR recorded at or above the target.");
  if (!Number.isFinite(input.increment) || input.increment <= 0) return hold("Choose your equipment's weight increment before increasing load.");
  const weight = Math.round((p.weight + input.increment) * 100) / 100;
  return { kind: "add-load", weight, reps: range.low, label: `Try ${fmtWeight(weight)} × ${range.low}`, detail: `All ${input.expectedSets} sets reached ${range.high} reps with sufficient recorded RIR. Add your selected ${input.increment} lb increment and return to ${range.low} reps.` };
}
