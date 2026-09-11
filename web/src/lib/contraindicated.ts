/**
 * Movements the active program rules out on medical grounds.
 *
 * The shoulder-smart program is written around a bench-press injury and names
 * what to stay off until a clinician clears it. The swap sheet draws from a
 * general catalogue that knows nothing about that, so it was happily offering
 * barbell bench press as an alternative to the cable chest press, and a wide
 * pulldown as an alternative to the neutral one — the two movements the plan
 * singles out by name.
 *
 * Filtering happens at the suggestion layer only. Nothing stops the lifter
 * typing an exercise in deliberately; this just keeps the app from proposing it.
 */

export type Restriction = { pattern: RegExp; reason: string };

export const SHOULDER_SMART_RESTRICTIONS: Restriction[] = [
  { pattern: /\bbarbell bench\b|\bbench press\b(?!.*\bfloor\b)/i, reason: "barbell bench is off the plan" },
  { pattern: /wide[\s-]?grip/i, reason: "wide grip is off the plan" },
  { pattern: /behind[\s-]the[\s-]neck/i, reason: "behind-the-neck work is off the plan" },
  { pattern: /\bdips?\b|dip machine/i, reason: "dips are off the plan" },
  { pattern: /upright row/i, reason: "upright rows are off the plan" },
  { pattern: /\bback squat\b/i, reason: "bar on the traps can reproduce the pain" },
];

/** The reason this movement is excluded, or null when it is fine to suggest. */
export function restrictionFor(
  name: string,
  restrictions: Restriction[] = SHOULDER_SMART_RESTRICTIONS
): string | null {
  const n = (name || "").trim();
  if (!n) return null;
  for (const r of restrictions) {
    if (r.pattern.test(n)) return r.reason;
  }
  return null;
}

export function isContraindicated(name: string): boolean {
  return restrictionFor(name) !== null;
}
