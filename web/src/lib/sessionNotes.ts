/**
 * Session notes, read back rather than filed away.
 *
 * Notes are stored as one text blob per session, a line per movement
 * ("EZ-Bar Curl: shoulder felt tight on set 3"). On their own they are a diary
 * nobody opens; parsed back out they can be put in front of the lifter while
 * he is standing at the same machine a week later, which is the only moment
 * the note is worth anything.
 */

export type ParsedNote = {
  exercise: string;
  note: string;
  date: string;
  dayName?: string;
};

/** Lines the app writes itself, which are not something the lifter typed. */
const MACHINE_LINES = /^(shoulder|.+ set \d+ right)\s*:/i;

export function parseSessionNotes(
  notes: string | null | undefined,
  date: string,
  dayName?: string
): ParsedNote[] {
  if (!notes) return [];
  const out: ParsedNote[] = [];
  for (const line of notes.split("\n")) {
    const text = line.trim();
    if (!text || MACHINE_LINES.test(text)) continue;
    const at = text.indexOf(": ");
    if (at <= 0) continue;
    const exercise = text.slice(0, at).trim();
    const note = text.slice(at + 2).trim();
    if (exercise && note) out.push({ exercise, note, date, dayName });
  }
  return out;
}

/**
 * The most recent note for each movement. Sessions must arrive newest first.
 */
export function lastNoteByExercise(
  sessions: { started_at: string; day_name?: string; notes?: string | null }[]
): Record<string, ParsedNote> {
  const map: Record<string, ParsedNote> = {};
  for (const s of sessions) {
    const date = s.started_at.slice(0, 10);
    for (const n of parseSessionNotes(s.notes, date, s.day_name)) {
      if (!map[n.exercise]) map[n.exercise] = n;
    }
  }
  return map;
}

/**
 * Notes worth a second look: something hurt, or something stopped the set
 * happening. Deliberately a small list of words a lifter actually types —
 * a wider net turns the flag into noise and it stops being read.
 */
const CONCERNS: { pattern: RegExp; kind: "pain" | "blocked" }[] = [
  { pattern: /\b(pain|painful|hurts?|hurting|sore|tweak\w*|pinch\w*|ach\w*|strain\w*)\b/i, kind: "pain" },
  { pattern: /\b(tight|impinge\w*|numb|tingl\w*|clicking|grind\w*|unstable)\b/i, kind: "pain" },
  { pattern: /\b(couldn'?t|can'?t|failed|gave out|no reps|dropped|stopped|skipped|won'?t let me|broken|taken|occupied)\b/i, kind: "blocked" },
];

export type FlaggedNote = ParsedNote & { kind: "pain" | "blocked" };

export function flagNotes(notes: ParsedNote[]): FlaggedNote[] {
  const out: FlaggedNote[] = [];
  for (const n of notes) {
    const hit = CONCERNS.find((c) => c.pattern.test(n.note));
    if (hit) out.push({ ...n, kind: hit.kind });
  }
  return out;
}

/** Movements flagged for pain more than once — the pattern worth acting on. */
export function repeatedPain(flagged: FlaggedNote[]): string[] {
  const counts = new Map<string, number>();
  for (const f of flagged) {
    if (f.kind !== "pain") continue;
    counts.set(f.exercise, (counts.get(f.exercise) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name);
}
