/** Coach-readable session briefs — lifts to scan, not tonnage essays. */

export type SessionSet = {
  exercise_name: string;
  weight: number;
  reps: number;
  set_number: number;
  is_warmup?: boolean;
};

export type SessionBrief = {
  id: string;
  dayName: string;
  startedAt: string;
  durationSeconds: number;
  sets: SessionSet[];
  notes?: string;
  rating?: number | null;
};

export type LiftCompare = {
  name: string;
  last: string | null;
  today: string;
  tag: "up" | "same" | "down" | "new";
};

export type SessionReview = {
  title: string;
  subtitle: string;
  highlights: string[];
  liftLog: LiftCompare[];
  notes: string;
  /** Plain text for Copy / Share / push */
  copyText: string;
};

export type WeeklyScan = {
  title: string;
  weekLabel: string;
  sessionsDone: number;
  dayLines: string[];
  statusLine: string;
  copyText: string;
};

function fmtW(w: number) {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}

export function formatSet(weight: number, reps: number) {
  return `${fmtW(weight)} × ${reps}`;
}

function score(weight: number, reps: number) {
  return weight * 1000 + reps;
}

function topSet(sets: SessionSet[]): SessionSet | null {
  const working = sets.filter((s) => !s.is_warmup);
  const pool = working.length ? working : sets;
  if (!pool.length) return null;
  return [...pool].sort(
    (a, b) => score(b.weight, b.reps) - score(a.weight, a.reps)
  )[0];
}

function setsForExercise(session: SessionBrief, name: string) {
  return session.sets
    .filter((s) => s.exercise_name === name)
    .sort((a, b) => a.set_number - b.set_number);
}

function exerciseLine(session: SessionBrief, name: string) {
  const sets = setsForExercise(session, name);
  if (!sets.length) return null;
  const parts = sets.map((s) => {
    const base = formatSet(s.weight, s.reps);
    return s.is_warmup ? `${base} (W)` : base;
  });
  return `${name} — ${parts.join(", ")}`;
}

function uniqueExercises(session: SessionBrief) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const s of session.sets) {
    if (!seen.has(s.exercise_name)) {
      seen.add(s.exercise_name);
      names.push(s.exercise_name);
    }
  }
  return names;
}

/** A + C: session brief highlights + lift log vs last same day. */
export function buildSessionReview(
  session: SessionBrief,
  previousSameDay: SessionBrief | null
): SessionReview {
  const dayName = session.dayName || "";
  const mins = Math.max(1, Math.round(session.durationSeconds / 60));
  const names = uniqueExercises(session);
  const dateLabel = new Date(session.startedAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Highlights: top 3 by top-set score, full set string
  const ranked = names
    .map((name) => {
      const sets = setsForExercise(session, name);
      const top = topSet(sets);
      return { name, sets, top, sc: top ? score(top.weight, top.reps) : 0 };
    })
    .sort((a, b) => b.sc - a.sc);

  const highlights = ranked
    .slice(0, 4)
    .map((r) => exerciseLine(session, r.name))
    .filter(Boolean) as string[];

  const liftLog: LiftCompare[] = names.map((name) => {
    const todaySets = setsForExercise(session, name);
    const todayTop = topSet(todaySets);
    const todayStr = todayTop
      ? formatSet(todayTop.weight, todayTop.reps)
      : "—";

    if (!previousSameDay) {
      return { name, last: null, today: todayStr, tag: "new" as const };
    }
    const lastSets = setsForExercise(previousSameDay, name);
    const lastTop = topSet(lastSets);
    if (!lastTop || !todayTop) {
      return {
        name,
        last: lastTop ? formatSet(lastTop.weight, lastTop.reps) : null,
        today: todayStr,
        tag: lastTop ? ("same" as const) : ("new" as const),
      };
    }
    const lastStr = formatSet(lastTop.weight, lastTop.reps);
    const diff = score(todayTop.weight, todayTop.reps) - score(lastTop.weight, lastTop.reps);
    const tag = diff > 0 ? "up" : diff < 0 ? "down" : "same";
    return { name, last: lastStr, today: todayStr, tag };
  });

  const notes = (session.notes || "").trim();
  const subtitle = `${dateLabel} · ${mins} min · ${names.length} exercise${
    names.length === 1 ? "" : "s"
  } · ${session.sets.length} sets`;

  const copyLines = [
    `FitTrack · ${dayName}`,
    subtitle,
    "",
    "Highlights",
    ...(highlights.length ? highlights : ["(no sets logged)"]),
    "",
    "Top sets vs last time",
    ...liftLog.map((r) => {
      if (!r.last) return `${r.name}: ${r.today} (first log)`;
      const mark =
        r.tag === "up" ? " ↑" : r.tag === "down" ? " ↓" : r.tag === "same" ? "" : "";
      return `${r.name}: ${r.last} → ${r.today}${mark}`;
    }),
  ];
  if (session.rating != null) {
    copyLines.splice(2, 0, `Rated ${session.rating}/10`);
  }
  if (notes) {
    copyLines.push("", "Notes", notes);
  }

  return {
    title: dayName,
    subtitle,
    highlights,
    liftLog,
    notes,
    copyText: copyLines.join("\n"),
  };
}

/** @deprecated use buildSessionReview — kept for any old imports */
export function buildDailyCheckin(session: SessionBrief) {
  const review = buildSessionReview(session, null);
  return {
    title: review.title,
    body: review.highlights.join(" · ") || review.subtitle,
    highlights: review.highlights,
  };
}

/** B · Sunday / week scan — what happened, not pound totals. */
export function buildWeeklyCheckin(
  sessions: SessionBrief[],
  weekLabelStr: string,
  scheduledNames: string[] = []
): WeeklyScan {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  const dayLines = sorted.map((s) => {
    const name = s.dayName || "";
    const d = new Date(s.startedAt);
    const wd = d.toLocaleDateString(undefined, { weekday: "short" });
    const tops = uniqueExercises(s)
      .slice(0, 2)
      .map((n) => {
        const t = topSet(setsForExercise(s, n));
        return t ? `${n} ${formatSet(t.weight, t.reps)}` : null;
      })
      .filter(Boolean);
    const extra = tops.length ? ` · ${tops.join(", ")}` : "";
    return `${wd} ${name} — finished${extra}`;
  });

  const doneNames = new Set(
    sorted.map((s) => (s.dayName || "").toLowerCase())
  );
  const missed = scheduledNames.filter((n) => !doneNames.has(n.toLowerCase()));

  let statusLine: string;
  if (sorted.length === 0) statusLine = "No sessions logged yet this week.";
  else if (missed.length) statusLine = `Missed: ${missed.join(", ")}`;
  else if (scheduledNames.length && sorted.length >= scheduledNames.length)
    statusLine = "On schedule";
  else statusLine = `${sorted.length} session${sorted.length === 1 ? "" : "s"} logged`;

  const isSunday = new Date().getDay() === 0;
  const title = isSunday ? "Weekly check-in" : "This week so far";

  const copyText = [
    `FitTrack · ${title}`,
    weekLabelStr,
    statusLine,
    "",
    ...(dayLines.length ? dayLines : ["(no sessions yet)"]),
  ].join("\n");

  return {
    title,
    weekLabel: weekLabelStr,
    sessionsDone: sorted.length,
    dayLines,
    statusLine,
    copyText,
  };
}

/** Monday date key for the week containing `date` (local). */
export function weekStartKey(date: Date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function weekLabel(mondayKey: string) {
  const [y, m, d] = mondayKey.split("-").map(Number);
  const start = new Date(y, m - 1, d, 12);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function tagLabel(tag: LiftCompare["tag"]) {
  if (tag === "up") return "up";
  if (tag === "down") return "down";
  if (tag === "new") return "new";
  return "same";
}
