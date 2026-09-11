export type DraftSet = {
  setNumber: number;
  weight: string;
  reps: string;
  completed: boolean;
  previous?: string;
  /** Warm-up / feeder — ignored for prev working loads & progress */
  isWarmup?: boolean;
};

/** Named warm-up exercises (e.g. "Hamstring Curl (Warm-up)") */
export function isWarmupExerciseName(name: string) {
  return /warm[\s-]?up/i.test(name);
}

export type SessionDraft = {
  dayId: string;
  dayName: string;
  startedAt: number;
  savedAt: number;
  setsByExercise: Record<string, DraftSet[]>;
  notes: Record<string, string>;
  /** Original exercise id → current display name (after swaps / rename) */
  nameOverrides: Record<string, string>;
  /** Per-exercise rest seconds between sets */
  restByExercise?: Record<string, number>;
};

function key(dayId: string, logDate?: string) {
  return logDate ? `fittrack-draft-${dayId}-${logDate}` : `fittrack-draft-${dayId}`;
}

export function loadDraft(dayId: string, logDate?: string): SessionDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(dayId, logDate));
    if (!raw) return null;
    return JSON.parse(raw) as SessionDraft;
  } catch {
    return null;
  }
}

export function saveDraft(draft: SessionDraft, logDate?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    key(draft.dayId, logDate),
    JSON.stringify({ ...draft, savedAt: Date.now() })
  );
}

export function clearDraft(dayId: string, logDate?: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key(dayId, logDate));
}
