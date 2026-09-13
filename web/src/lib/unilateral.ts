/**
 * One-sided exercises — one arm or one leg at a time — are logged per side, so
 * a weaker side can be seen and brought up instead of hiding inside one number.
 */

const ONE_SIDED = /\b(one|single|1)[\s-]?(arm|leg|side)\b|\bunilateral\b|\bper[\s-](arm|leg|side)\b/i;

export function nameLooksUnilateral(name: string): boolean {
  return ONE_SIDED.test(name || "");
}

/** An explicit answer from the lifter wins; otherwise go by the name. */
export function isUnilateral(ex: { name: string; unilateral?: boolean | null }): boolean {
  return typeof ex.unilateral === "boolean" ? ex.unilateral : nameLooksUnilateral(ex.name);
}

/**
 * History key for a movement's right side. Left and ordinary sets keep the
 * plain name, so a lift that becomes one-sided keeps its existing history as
 * the left side's starting point.
 */
export function rightSideKey(name: string): string {
  return `${name} [R]`;
}

/** Human line for the gap between sides, or null when they're level or unknown. */
export function sideGapLine(left: number, right: number): string | null {
  if (!(left > 0) || !(right > 0) || left === right) return null;
  const diff = Math.abs(right - left);
  const d = Number.isInteger(diff) ? String(diff) : diff.toFixed(1);
  return left < right ? `Left is ${d} lb behind right` : `Right is ${d} lb behind left`;
}
