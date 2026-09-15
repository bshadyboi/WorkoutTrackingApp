/**
 * Prehab / warm-up block detection.
 *
 * Upper days open with a short shoulder prehab block (band pull-aparts through
 * scapular wall slides). Those movements are checked off, not loaded, so the UI
 * collapses them into a checklist instead of full set grids.
 *
 * The template's `notes: "Prehab"` marker is not persisted to workout_exercises,
 * so detection works off the name — and only for the leading contiguous run of a
 * day, so a working movement later on (Upper A logs a real "Face Pull" after the
 * prehab "Face Pulls + External Rotation") is never swallowed.
 */

const PREHAB_PATTERNS: RegExp[] = [
  /\bband pull[\s-]?aparts?\b/i,
  /\bface pulls?\s*(?:\+|&|and)\s*external rotation\b/i,
  /\bprone\s*y\s*(?:\/|,|\+|&)?\s*t\b/i,
  /\bprone\s*t\b/i,
  /\bsmr\b|\bmassage ball\b/i,
  /\bdoorway (?:pec )?stretch\b/i,
  /\bside[\s-]?lying external rotation\b/i,
  /\bscapular\b/i,
  /\bwall slides?\b/i,
  /\brotator cuff\b/i,
  /\bcuff\b/i,
  /\b(?:prehab|warm[\s-]?ups?|activation|mobility|dynamic stretch)\b/i,
];

export function isPrehabName(name: string): boolean {
  const n = (name ?? "").trim();
  if (!n) return false;
  return PREHAB_PATTERNS.some((re) => re.test(n));
}

/**
 * Split a day's exercises (already in display order) into its leading warm-up
 * block and the working movements. Returns an empty warm-up list unless at
 * least one working movement remains, so a day is never entirely warm-up.
 */
export function splitWarmupBlock<T extends { name: string }>(
  ordered: T[]
): { warmups: T[]; main: T[] } {
  let cut = 0;
  while (cut < ordered.length && isPrehabName(ordered[cut].name)) cut++;

  if (cut === 0 || cut === ordered.length) {
    return { warmups: [], main: ordered };
  }

  return { warmups: ordered.slice(0, cut), main: ordered.slice(cut) };
}
