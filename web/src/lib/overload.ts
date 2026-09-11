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
  previous?: { weight: number; reps: number } | null;
  repRange: string;
  /** Bodyweight or unloaded movements progress on reps only. */
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
