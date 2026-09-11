/** Barbell plate loading — not for machines or dumbbells. */

export const DEFAULT_BAR_LB = 45;

/** Standard US plates, largest first (per side). */
export const PLATE_SIZES_LB = [45, 35, 25, 10, 5, 2.5] as const;

/**
 * True only for free-weight barbell / EZ-bar / trap-bar style lifts.
 * Machines, cables, Smith, and dumbbells return false.
 */
export function isBarbellLoadable(exerciseName: string): boolean {
  const n = exerciseName.trim().toLowerCase();
  if (!n) return false;

  const hasBarKeyword =
    /\bbarbell\b|\bbb\b|ez-?bar|trap\s*bar|t-?\s*bar\s*row|skull\s*crushers?\b/i.test(
      n
    );

  // Hard no — machines / cables / DBs (unless name also names a barbell option)
  if (
    /\b(machine|cable|dumbbell|dumbells|smith|pec\s*deck|leg\s*press|hack\s*squat|pulldown|pushdown|flye?s?\b|lateral\s*raise|face\s*pull|preacher|curl\s*machine|calf|crunch|pullover|adductor|ab\s*wheel|kettle|band|assisted)\b/i.test(
      n
    ) ||
    /(^|[\s(/])db([\s)/]|$)/i.test(n)
  ) {
    if (!hasBarKeyword) return false;
  }

  if (hasBarKeyword) return true;

  // Common free-bar compounds without the word "barbell"
  if (
    /^(deadlift|romanian deadlift|sldl|stiff-?legged|bench press|overhead press|military press|good morning|hip thrust)\b/i.test(
      n
    )
  ) {
    return true;
  }

  return false;
}

export type PlateLoad = {
  barLb: number;
  /** Plates on one side, largest → smallest */
  perSide: number[];
  totalLb: number;
  /** True when we can hit the target exactly with standard plates */
  exact: boolean;
};

/**
 * Compute plates per side for a target loaded weight (bar + plates).
 */
export function computePlateLoad(
  totalLb: number,
  barLb: number = DEFAULT_BAR_LB
): PlateLoad | null {
  if (!Number.isFinite(totalLb) || totalLb <= 0) return null;
  const target = Math.round(totalLb * 2) / 2; // nearest 0.5
  if (target < barLb) return null;

  let remain = (target - barLb) / 2;
  const perSide: number[] = [];
  for (const p of PLATE_SIZES_LB) {
    while (remain + 1e-9 >= p) {
      perSide.push(p);
      remain -= p;
    }
  }
  const exact = remain < 0.05;
  const loaded = barLb + 2 * perSide.reduce((s, p) => s + p, 0);

  return {
    barLb,
    perSide,
    totalLb: loaded,
    exact,
  };
}

/** Compact label: "45 bar · each side 45 + 10" */
export function formatPlateLoad(load: PlateLoad): string {
  if (load.perSide.length === 0) {
    return `${load.barLb} bar only`;
  }
  const side = load.perSide
    .map((p) => (Number.isInteger(p) ? String(p) : p.toFixed(1)))
    .join(" + ");
  const approx = load.exact ? "" : " ≈";
  return `${load.barLb} bar · each side ${side}${approx}`;
}

export function plateLoadForWeight(
  weight: string | number,
  barLb: number = DEFAULT_BAR_LB
): PlateLoad | null {
  const n = typeof weight === "number" ? weight : Number(weight);
  if (!Number.isFinite(n) || n <= 0) return null;
  return computePlateLoad(n, barLb);
}
