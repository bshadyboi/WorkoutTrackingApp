/**
 * Temporary limits for the left shoulder while the rotator cuff loosens up
 * (physical therapist, Sep 2026): keep it light, and keep the arm below head
 * height. On by default; the lifter switches it off in Settings once cleared.
 */

const KEY = "ft-left-shoulder-limits";

export function leftShoulderLimited(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setLeftShoulderLimited(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

/**
 * What to tell the left arm on this movement, or null when it's fine as is.
 * Only movements that take the arm to or above head height get a note.
 */
export function leftArmNote(name: string): string | null {
  const n = (name || "").toLowerCase();
  // Only the prehab face pull: the working face pulls stay as the lifter does them.
  if (/face pulls?\s*(?:\+|&|and)\s*external rotation/.test(n)) return "Left: pull to the chin, not the forehead";
  if (/landmine/.test(n)) return "Left: stop at chin height, keep it light";
  if (/pulldown|pull-?up|chin[\s-]?up|assisted chin|pullover/.test(n)) {
    return "Left: start from head height, not arm overhead · light";
  }
  if (/overhead|shoulder press|military|\by raise\b|wall slide/.test(n)) {
    return "Left: stay below head height";
  }
  return null;
}
