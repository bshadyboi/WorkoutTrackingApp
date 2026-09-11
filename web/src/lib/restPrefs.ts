/** Persisted rest preferences keyed by exercise display name. */

const KEY = "fittrack-rest-prefs-v1";

export const REST_PRESETS = [60, 90, 120, 180, 240] as const;

export function loadRestPrefs(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getRestPref(exerciseName: string, fallback: number): number {
  const prefs = loadRestPrefs();
  const v = prefs[exerciseName];
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
  return fallback;
}

export function setRestPref(exerciseName: string, seconds: number) {
  if (typeof window === "undefined" || !exerciseName.trim()) return;
  const next = Math.max(0, Math.min(600, Math.round(seconds)));
  const prefs = loadRestPrefs();
  prefs[exerciseName.trim()] = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}

export function formatRestClock(seconds: number) {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}
