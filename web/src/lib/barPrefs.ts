/** Persisted Olympic bar weight for plate calculator. */

const KEY = "fittrack-bar-lb-v1";

export const BAR_OPTIONS = [45, 35] as const;
export type BarLb = (typeof BAR_OPTIONS)[number];

export function getBarLb(): BarLb {
  if (typeof window === "undefined") return 45;
  try {
    const raw = localStorage.getItem(KEY);
    const n = Number(raw);
    if (n === 35 || n === 45) return n;
  } catch {
    /* ignore */
  }
  return 45;
}

export function setBarLb(lb: BarLb) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, String(lb));
  } catch {
    /* ignore quota */
  }
}

/** Suggest 35 for EZ-bar / skull crusher style lifts. */
export function suggestedBarLb(exerciseName: string): BarLb {
  if (/ez-?bar|skull\s*crushers?/i.test(exerciseName)) return 35;
  return 45;
}
