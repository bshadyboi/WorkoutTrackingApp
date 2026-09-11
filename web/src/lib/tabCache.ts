/** Instant tab paint — show last payload while refreshing from Supabase. */

const CACHE_TTL_MS = 5 * 60 * 1000;

type Cached<T> = { savedAt: number; value: T };

export function readTabCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`ft-tab:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T> | T;
    if (parsed && typeof parsed === "object" && "savedAt" in parsed && "value" in parsed) {
      const wrapped = parsed as Cached<T>;
      if (Date.now() - wrapped.savedAt > CACHE_TTL_MS) return null;
      return wrapped.value;
    }
    // Legacy unwrapped cache — treat as expired
    return null;
  } catch {
    return null;
  }
}

export function writeTabCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    const payload: Cached<T> = { savedAt: Date.now(), value };
    sessionStorage.setItem(`ft-tab:${key}`, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function clearTabCache(key?: string) {
  if (typeof window === "undefined") return;
  if (key) {
    sessionStorage.removeItem(`ft-tab:${key}`);
    return;
  }
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const k = sessionStorage.key(i);
    if (k?.startsWith("ft-tab:")) sessionStorage.removeItem(k);
  }
}
