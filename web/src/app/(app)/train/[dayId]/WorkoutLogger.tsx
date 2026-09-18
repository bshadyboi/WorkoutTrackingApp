"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { catalogEntry, formVideoUrl } from "@/lib/exerciseCatalog";
import { SwapExerciseSheet } from "@/components/SwapExerciseSheet";
import { AddExerciseSheet, type AddExercisePick } from "@/components/AddExerciseSheet";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  isWarmupExerciseName,
  type DraftSet,
} from "@/lib/sessionDraft";
import { formatPrescription, setTargetLabel } from "@/lib/workouts";
import { IconCheck, IconMore, IconPlayCircle, IconSwap, IconX } from "@/components/icons";
import { splitWarmupBlock } from "@/lib/prehab";
import { derrickRecompGuidance, derrickRecompWeek } from "@/lib/derrickRecomp";
import { dateKey } from "@/lib/protocol";
import { Explain } from "@/components/Explain";
import { isUnilateral, rightSideKey } from "@/lib/unilateral";
import { leftArmNote, leftShoulderLimited } from "@/lib/shoulderLimits";
import { parseRepRange, suggestOverload } from "@/lib/overload";
import { renameExerciseEverywhere } from "@/lib/exerciseRename";
import {
  isOfflineError,
  queuePendingSession,
  type PendingSessionRow,
} from "@/lib/pendingSessions";
import {
  cancelRestAlert,
  ensureRestNotifyPermission,
  fireRestDoneAlert,
  loadPersistedRest,
  restSecondsLeft,
  scheduleRestAlert,
  shouldFireRestAlert,
} from "@/lib/restAlert";
import {
  formatRestClock,
  getRestPref,
  REST_PRESETS,
  setRestPref,
} from "@/lib/restPrefs";
import {
  formatPlateLoad,
  isBarbellLoadable,
  plateLoadForWeight,
} from "@/lib/plates";
import {
  estimateRemainingSeconds,
  formatEstimateMinutes,
} from "@/lib/sessionEstimate";
import {
  BAR_OPTIONS,
  getBarLb,
  setBarLb,
  suggestedBarLb,
  type BarLb,
} from "@/lib/barPrefs";
import type { BestSet } from "@/lib/wins";
import type { ParsedNote } from "@/lib/sessionNotes";

function setScore(weight: number, reps: number) {
  return weight * 1000 + reps;
}

function fmtSet(weight: number, reps: number) {
  const w = Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
  return `${w} × ${reps}`;
}

type Exercise = {
  id: string;
  name: string;
  muscle: string;
  default_sets: number;
  has_crown_set: boolean;
  crown_rep_range: string;
  working_rep_range: string;
  sort_order: number;
  /** The lifter's answer for a custom exercise; null = infer from the name. */
  unilateral?: boolean | null;
};

function defaultRestSeconds(ex: Exercise, setIndex: number) {
  if (ex.muscle === "Cardio") return 0;
  if (ex.has_crown_set && setIndex === 0) return 240;
  return 180;
}

function formatRest(seconds: number) {
  return formatRestClock(seconds);
}

/**
 * One set row, pre-filled from the matching set last time. Both weight and reps
 * are seeded so a session that repeats last week's numbers is a row of taps;
 * the "previous" label stays visible so an edited value is still comparable.
 */
function fmtPrev(p: { weight: number; reps: number } | undefined) {
  return p ? `${Number.isInteger(p.weight) ? p.weight : p.weight.toFixed(1)} × ${p.reps}` : "—";
}

function buildSet(
  index: number,
  prev: { weight: number; reps: number } | undefined,
  isWarmup: boolean,
  /** Set for one-sided exercises: last time's right side (falls back to prev). */
  prevR?: { weight: number; reps: number } | null
): DraftSet {
  const base: DraftSet = {
    setNumber: index + 1,
    weight: prev ? String(prev.weight) : "",
    reps: prev ? String(prev.reps) : "",
    completed: false,
    isWarmup,
    previous: fmtPrev(prev),
  };
  if (prevR === undefined) return base;
  const r = prevR ?? prev;
  return {
    ...base,
    weightR: r ? String(r.weight) : "",
    repsR: r ? String(r.reps) : "",
    previousR: fmtPrev(r ?? undefined),
  };
}

export function WorkoutLogger({
  dayId,
  dayName,
  exercises,
  previousByExercise,
  bestByExercise = {},
  lastNotes = {},
  logDate,
}: {
  dayId: string;
  dayName: string;
  exercises: Exercise[];
  previousByExercise: Record<string, { weight: number; reps: number; rir?: number | null }[]>;
  /** All-time best working set per exercise name */
  bestByExercise?: Record<string, BestSet>;
  /** What was written about each movement last time it was trained */
  lastNotes?: Record<string, ParsedNote>;
  /** YYYY-MM-DD when backfilling a past workout */
  logDate?: string;
}) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const [, startTransition] = useTransition();

  const baseSorted = useMemo(
    () => [...exercises].sort((a, b) => a.sort_order - b.sort_order),
    [exercises]
  );
  /** Movements added during this session (kept in the draft until finish). */
  const [addedExercises, setAddedExercises] = useState<Exercise[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const sorted = useMemo(
    () =>
      addedExercises.length
        ? [...baseSorted, ...addedExercises.filter((a) => !baseSorted.some((b) => b.id === a.id))]
        : baseSorted,
    [baseSorted, addedExercises]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});
  const [renameBusy, setRenameBusy] = useState(false);
  /** One-sided answers given this session (custom names), keyed by exercise id. */
  const [unilateralOverride, setUnilateralOverride] = useState<Record<string, boolean>>({});
  const [editOneSided, setEditOneSided] = useState<boolean | null>(null);
  const [restByExercise, setRestByExercise] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const ex of baseSorted) {
      init[ex.id] = getRestPref(ex.name, defaultRestSeconds(ex, 0));
    }
    return init;
  });
  const [sessionDayName, setSessionDayName] = useState(dayName);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [editForId, setEditForId] = useState<string | null>(null);
  const [swapForId, setSwapForId] = useState<string | null>(null);
  const [editNameDraft, setEditNameDraft] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [draftBanner, setDraftBanner] = useState(false);
  const [activeRest, setActiveRest] = useState<{
    exerciseId: string;
    afterSet: number;
    endsAt: number;
  } | null>(null);
  const [restTick, setRestTick] = useState(0);
  const [restEditExerciseId, setRestEditExerciseId] = useState<string | null>(null);
  const [ratingSessionId, setRatingSessionId] = useState<string | null>(null);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const pendingFinishRef = useRef<{
    sessionId: string;
    snapshot: {
      dayId: string;
      dayName: string;
      startedAt: number;
      setsByExercise: Record<string, DraftSet[]>;
      notes: Record<string, string>;
      nameOverrides: Record<string, string>;
      restByExercise: Record<string, number>;
      addedExercises: Exercise[];
    };
  } | null>(null);
  /** This week's reps-in-reserve target from the plan, used to flag a set taken too close to failure. */
  const rirTarget = useMemo(
    () => derrickRecompGuidance(derrickRecompWeek(logDate ?? dateKey(new Date())))?.rirTarget ?? null,
    [logDate]
  );
  const [rirExplained, setRirExplained] = useState(true);
  useEffect(() => {
    try {
      setRirExplained(localStorage.getItem("ft-rir-explained") === "1");
    } catch {
      /* treat as explained */
    }
  }, []);
  const [leftLimited, setLeftLimited] = useState(true);
  useEffect(() => {
    setLeftLimited(leftShoulderLimited());
  }, []);
  const [shoulder, setShoulder] = useState<"fine" | "pinchy" | "painful" | null>(null);
  const [shoulderLift, setShoulderLift] = useState<string>("");
  const [prToast, setPrToast] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const [barLb, setBarLbState] = useState<BarLb>(45);
  const [barByExercise, setBarByExercise] = useState<Record<string, BarLb>>({});
  const sessionBestRef = useRef<Record<string, BestSet>>({ ...bestByExercise });
  const prToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [setsByExercise, setSetsByExercise] = useState<Record<string, DraftSet[]>>(() => {
    const init: Record<string, DraftSet[]> = {};
    for (const ex of baseSorted) {
      const prev = previousByExercise[ex.name] ?? [];
      const warmEx = isWarmupExerciseName(ex.name);
      const uni = isUnilateral(ex);
      const prevRList = uni ? previousByExercise[rightSideKey(ex.name)] ?? [] : [];
      init[ex.id] = Array.from({ length: ex.default_sets }, (_, i) =>
        buildSet(
          i,
          prev[i] ?? prev[prev.length - 1],
          warmEx,
          uni ? (prevRList[i] ?? prevRList[prevRList.length - 1] ?? null) : undefined
        )
      );
    }
    return init;
  });

  // Resume draft after mount (crash / save & leave)
  useEffect(() => {
    const draft = loadDraft(dayId, logDate);
    if (draft?.setsByExercise) {
      const overrides = draft.nameOverrides ?? {};
      // An added movement kept in the plan is already in the day's exercises.
      const added = (draft.addedExercises ?? []).filter(
        (a) => !baseSorted.some((b) => b.id === a.id)
      );
      const normalized: Record<string, DraftSet[]> = {};
      for (const [id, sets] of Object.entries(draft.setsByExercise)) {
        const ex = baseSorted.find((e) => e.id === id) ?? added.find((e) => e.id === id);
        const label = overrides[id] ?? ex?.name ?? "";
        const warmEx = isWarmupExerciseName(label);
        normalized[id] = sets.map((s) => ({
          ...s,
          isWarmup: s.isWarmup ?? warmEx,
        }));
      }
      setSetsByExercise((cur) => ({ ...cur, ...normalized }));
      setAddedExercises(added);
      setNotes(draft.notes ?? {});
      setNameOverrides(overrides);
      if (draft.restByExercise) setRestByExercise(draft.restByExercise);
      if (draft.dayName) setSessionDayName(draft.dayName);
      setStartedAt(draft.startedAt);
      setDraftBanner(true);
    }
    setDraftReady(true);
  }, [dayId, logDate, baseSorted]);

  useEffect(() => {
    setBarLbState(getBarLb());
  }, []);

  useEffect(() => {
    sessionBestRef.current = { ...bestByExercise };
  }, [bestByExercise]);

  const hasProgress = useMemo(() => {
    return Object.values(setsByExercise).some((sets) =>
      sets.some((s) => s.completed || s.reps !== "")
    );
  }, [setsByExercise]);

  const completedSetCount = useMemo(() => {
    return Object.values(setsByExercise).reduce(
      (n, sets) => n + sets.filter((s) => s.completed).length,
      0
    );
  }, [setsByExercise]);

  /** Leading shoulder-prehab movements render as a checklist, not set grids. */
  const { warmups, main } = useMemo(() => splitWarmupBlock(sorted), [sorted]);

  /** Header progress tracks working sets only — prehab has its own checklist. */
  const mainProgress = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const ex of main) {
      const sets = setsByExercise[ex.id] ?? [];
      total += sets.length;
      done += sets.filter((s) => s.completed).length;
    }
    return { done, total };
  }, [main, setsByExercise]);

  const warmupsDone = useMemo(() => {
    return warmups.filter((ex) => {
      const sets = setsByExercise[ex.id] ?? [];
      return sets.length > 0 && sets.every((s) => s.completed);
    }).length;
  }, [warmups, setsByExercise]);

  // Autosave draft when there's real progress (crash recovery)
  useEffect(() => {
    if (!draftReady) return;
    if (!hasProgress) return;
    saveDraft({
      dayId,
      dayName: sessionDayName,
      startedAt,
      savedAt: Date.now(),
      setsByExercise,
      notes,
      nameOverrides,
      restByExercise,
      addedExercises,
    }, logDate);
  }, [
    addedExercises,
    draftReady,
    hasProgress,
    dayId,
    sessionDayName,
    startedAt,
    setsByExercise,
    notes,
    nameOverrides,
    restByExercise,
    logDate,
  ]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  // Resume an in-progress rest after reload / return to app
  useEffect(() => {
    const persisted = loadPersistedRest();
    if (!persisted) return;
    if (restSecondsLeft(persisted.endsAt) <= 0) {
      if (shouldFireRestAlert(persisted.endsAt)) {
        void fireRestDoneAlert(persisted.label);
      }
      cancelRestAlert();
      return;
    }
    setActiveRest({
      exerciseId: persisted.exerciseId,
      afterSet: persisted.afterSet,
      endsAt: persisted.endsAt,
    });
    void scheduleRestAlert(persisted);
  }, []);

  // Absolute-time rest countdown (keeps working after backgrounding)
  useEffect(() => {
    if (!activeRest) return;

    const sync = () => {
      const left = restSecondsLeft(activeRest.endsAt);
      setRestTick((n) => n + 1);
      if (left <= 0) {
        if (shouldFireRestAlert(activeRest.endsAt)) {
          const ex = sorted.find((e) => e.id === activeRest.exerciseId);
          const label = ex ? displayName(ex) : undefined;
          cancelRestAlert();
          void fireRestDoneAlert(label);
        } else {
          cancelRestAlert();
        }
        setActiveRest(null);
      }
    };

    sync();
    const t = setInterval(sync, 250);
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRest?.endsAt, activeRest?.exerciseId]);

  const activeRestLeft = activeRest ? restSecondsLeft(activeRest.endsAt) : 0;
  void restTick; // re-render tick

  function displayName(ex: Exercise) {
    return nameOverrides[ex.id] ?? ex.name;
  }

  function clearActiveRest() {
    cancelRestAlert();
    setActiveRest(null);
  }

  async function startRest(ex: Exercise, setIndex: number, seconds: number) {
    const endsAt = Date.now() + seconds * 1000;
    const setsLen = setsByExercise[ex.id]?.length ?? 1;
    const isLastSet = setIndex >= setsLen - 1;
    const exIdx = sorted.findIndex((e) => e.id === ex.id);
    const nextEx = isLastSet && exIdx >= 0 ? sorted[exIdx + 1] : null;
    const label = isLastSet
      ? nextEx
        ? `Next · ${displayName(nextEx)}`
        : `${displayName(ex)} · done`
      : displayName(ex);
    const state = {
      exerciseId: ex.id,
      afterSet: setIndex,
      endsAt,
      label,
      url: window.location.pathname,
    };
    setActiveRest({ exerciseId: ex.id, afterSet: setIndex, endsAt });
    void ensureRestNotifyPermission();
    await scheduleRestAlert(state);
  }

  function requestLeave() {
    setShowLeaveConfirm(true);
  }

  function saveAndLeave() {
    saveDraft({
      dayId,
      dayName: sessionDayName,
      startedAt,
      savedAt: Date.now(),
      setsByExercise,
      notes,
      nameOverrides,
      restByExercise,
      addedExercises,
    }, logDate);
    setShowLeaveConfirm(false);
    router.push(`/train/${dayId}`);
  }

  function discardAndLeave() {
    clearDraft(dayId, logDate);
    setShowLeaveConfirm(false);
    router.push(`/train/${dayId}`);
  }

  // Warn on tab close / refresh while in session
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasProgress && elapsed < 15) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasProgress, elapsed]);

  // Intercept browser back → same leave modal
  useEffect(() => {
    const onPopState = () => {
      window.history.pushState({ fittrackSession: true }, "");
      setShowLeaveConfirm(true);
    };
    window.history.pushState({ fittrackSession: true }, "");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function updateSet(exerciseId: string, setIndex: number, patch: Partial<DraftSet>) {
    setSetsByExercise((prev) => {
      const list = [...(prev[exerciseId] ?? [])];
      list[setIndex] = { ...list[setIndex], ...patch };
      return { ...prev, [exerciseId]: list };
    });
  }

  /**
   * Tick a prehab movement off the warm-up checklist: marks every one of its
   * sets complete and flagged as warm-up, so it lands in history without
   * counting toward working volume or PRs. No rest timer — it's a warm-up.
   */
  function setWarmupDone(exerciseId: string, done: boolean) {
    setSetsByExercise((prev) => {
      const list = (prev[exerciseId] ?? []).map((s) => ({
        ...s,
        completed: done,
        isWarmup: true,
      }));
      return { ...prev, [exerciseId]: list };
    });
    if (activeRest?.exerciseId === exerciseId) clearActiveRest();
  }

  function oneSided(ex: Exercise) {
    return unilateralOverride[ex.id] ?? isUnilateral({ name: displayName(ex), unilateral: ex.unilateral });
  }

  function fillFromPrevious(ex: Exercise, setIndex: number) {
    const name = displayName(ex);
    const prev =
      previousByExercise[name] ?? previousByExercise[ex.name] ?? [];
    const p = prev[setIndex] ?? prev[prev.length - 1];
    if (!p) return;
    updateSet(ex.id, setIndex, {
      weight: String(p.weight),
      reps: String(p.reps),
    });
  }

  function barForExercise(name: string, exerciseId: string): BarLb {
    if (barByExercise[exerciseId]) return barByExercise[exerciseId];
    if (suggestedBarLb(name) === 35) return 35;
    return barLb;
  }

  function chooseBar(exerciseId: string, lb: BarLb) {
    setBarByExercise((m) => ({ ...m, [exerciseId]: lb }));
    setBarLbState(lb);
    setBarLb(lb);
  }

  function showPrToast(title: string, detail: string) {
    if (prToastTimerRef.current) clearTimeout(prToastTimerRef.current);
    setPrToast({ title, detail });
    try {
      navigator.vibrate?.(40);
    } catch {
      /* ignore */
    }
    prToastTimerRef.current = setTimeout(() => setPrToast(null), 4200);
  }

  function toggleComplete(ex: Exercise, setIndex: number) {
    const set = setsByExercise[ex.id]?.[setIndex];
    if (!set) return;
    const next = !set.completed;
    updateSet(ex.id, setIndex, { completed: next });

    if (next && !set.isWarmup) {
      const left = { w: Number(set.weight) || 0, r: Number(set.reps) || 0 };
      const right = { w: Number(set.weightR) || 0, r: Number(set.repsR) || 0 };
      const useRight = oneSided(ex) && setScore(right.w, right.r) > setScore(left.w, left.r);
      const weight = useRight ? right.w : left.w;
      const reps = useRight ? right.r : left.r;
      if (weight > 0 && reps > 0) {
        const name = displayName(ex);
        const prev =
          sessionBestRef.current[name] ?? sessionBestRef.current[ex.name];
        const cur = { weight, reps };
        if (!prev || setScore(cur.weight, cur.reps) > setScore(prev.weight, prev.reps)) {
          sessionBestRef.current[name] = cur;
          showPrToast(
            prev ? `New PR · ${name}` : `First log · ${name}`,
            prev
              ? `${fmtSet(weight, reps)} (was ${fmtSet(prev.weight, prev.reps)})`
              : fmtSet(weight, reps)
          );
        }
      }
    }

    const baseRest = restByExercise[ex.id] ?? defaultRestSeconds(ex, setIndex);
    const rest = set.isWarmup ? Math.min(baseRest, 90) : baseRest;
    // Rest after every completed set — including the last (before next exercise)
    if (next && rest > 0) {
      void ensureRestNotifyPermission().then(() => startRest(ex, setIndex, rest));
    } else if (activeRest?.exerciseId === ex.id && activeRest.afterSet === setIndex) {
      clearActiveRest();
    }
  }

  function openEdit(ex: Exercise) {
    setEditOneSided(unilateralOverride[ex.id] ?? ex.unilateral ?? null);
    setEditForId(ex.id);
    setEditNameDraft(displayName(ex));
  }

  /**
   * Point a movement's un-logged sets at a different exercise's history, so a
   * rename or swap immediately shows that movement's last numbers instead of
   * the ones belonging to the exercise it replaced. Sets already ticked off are
   * left alone — that work happened.
   */
  function reseedFromHistory(exerciseId: string, name: string, sided?: boolean) {
    const prev = previousByExercise[name] ?? [];
    const ex = sorted.find((e) => e.id === exerciseId);
    const uni = sided ?? (ex ? isUnilateral({ name, unilateral: unilateralOverride[exerciseId] ?? ex.unilateral }) : false);
    const prevR = uni ? previousByExercise[rightSideKey(name)] ?? [] : [];
    setSetsByExercise((cur) => {
      const list = (cur[exerciseId] ?? []).map((s, i) => {
        const p = prev[i] ?? prev[prev.length - 1];
        const pr = uni ? (prevR[i] ?? prevR[prevR.length - 1] ?? null) : undefined;
        const fresh = buildSet(i, p, Boolean(s.isWarmup), pr);
        if (s.completed) {
          return { ...s, previous: fresh.previous, previousR: fresh.previousR };
        }
        return { ...fresh, setNumber: s.setNumber };
      });
      return { ...cur, [exerciseId]: list };
    });
  }

  async function applyCustomName() {
    if (!editForId || renameBusy) return;
    const trimmed = editNameDraft.trim();
    if (!trimmed) return;

    const ex = sorted.find((e) => e.id === editForId);
    const from = ex ? displayName(ex) : "";
    const target = editForId;
    const custom = !catalogEntry(trimmed);
    const sided = custom && editOneSided !== null ? editOneSided : undefined;

    setNameOverrides((o) => ({ ...o, [target]: trimmed }));
    if (sided !== undefined) {
      setUnilateralOverride((o) => ({ ...o, [target]: sided }));
      // Stored on the exercise so the next session splits it too. The column
      // arrives with schema_unilateral.sql; without it the answer lasts this session.
      void supabaseRef.current.from("workout_exercises").update({ unilateral: sided }).eq("id", target);
    }
    reseedFromHistory(target, trimmed, sided);

    // Persist so the plan and past logs travel together — otherwise next
    // session looks this movement up under the old name and finds nothing.
    setRenameBusy(true);
    const res = await renameExerciseEverywhere(from, trimmed);
    setRenameBusy(false);
    if (!res.ok) {
      setError(`Renamed for this session only — ${res.error}`);
    }
    setEditForId(null);
  }

  function applySwap(exerciseId: string, newName: string) {
    setNameOverrides((o) => ({ ...o, [exerciseId]: newName }));
    reseedFromHistory(exerciseId, newName);
    setEditNameDraft(newName);
    setSwapForId(null);
    setEditForId(null);
  }

  async function applySwapAll(exerciseId: string, newName: string) {
    applySwap(exerciseId, newName);
    const supabase = createClient();
    await supabase
      .from("workout_exercises")
      .update({ name: newName })
      .eq("id", exerciseId);
  }

  const [addBusy, setAddBusy] = useState(false);

  /**
   * Add a movement mid-session. It goes at the end of the workout; when the
   * lifter asks to keep it, it's also written to the day's plan so next session
   * opens with it (and a resumed draft doesn't list it twice).
   */
  async function addExercise(pick: AddExercisePick) {
    if (addBusy) return;
    const sortOrder = Math.max(0, ...sorted.map((e) => e.sort_order)) + 1;
    let id = `added-${Date.now().toString(36)}`;

    if (pick.keep) {
      setAddBusy(true);
      const row = {
        workout_day_id: dayId,
        name: pick.name,
        muscle: pick.muscle,
        default_sets: pick.sets,
        has_crown_set: false,
        crown_rep_range: "",
        working_rep_range: pick.repRange,
        sort_order: sortOrder,
        unilateral: pick.sided,
      };
      const supabase = supabaseRef.current;
      let res = await supabase.from("workout_exercises").insert(row).select("id").single();
      if (res.error && /unilateral/i.test(res.error.message)) {
        const { unilateral, ...rest } = row;
        void unilateral;
        res = await supabase.from("workout_exercises").insert(rest).select("id").single();
      }
      setAddBusy(false);
      if (res.data?.id) id = res.data.id;
      else setError(`Added for this session only — ${res.error?.message ?? "could not save to plan"}`);
    }

    const ex: Exercise = {
      id,
      name: pick.name,
      muscle: pick.muscle,
      default_sets: pick.sets,
      has_crown_set: false,
      crown_rep_range: "",
      working_rep_range: pick.repRange,
      sort_order: sortOrder,
      unilateral: pick.sided,
    };
    const uni = isUnilateral(ex);
    const prev = previousByExercise[ex.name] ?? [];
    const prevR = uni ? previousByExercise[rightSideKey(ex.name)] ?? [] : [];
    const warmEx = isWarmupExerciseName(ex.name);

    setSetsByExercise((cur) => ({
      ...cur,
      [id]: Array.from({ length: ex.default_sets }, (_, i) =>
        buildSet(
          i,
          prev[i] ?? prev[prev.length - 1],
          warmEx,
          uni ? (prevR[i] ?? prevR[prevR.length - 1] ?? null) : undefined
        )
      ),
    }));
    setRestByExercise((r) => ({ ...r, [id]: getRestPref(ex.name, 180) }));
    if (pick.sided !== null) setUnilateralOverride((o) => ({ ...o, [id]: pick.sided as boolean }));
    setAddedExercises((a) => [...a, ex]);
    setShowAdd(false);
  }

  function bumpRest(exerciseId: string, delta: number) {
    setRestByExercise((r) => {
      const cur = r[exerciseId] ?? 180;
      const next = Math.max(0, Math.min(600, cur + delta));
      const ex = sorted.find((e) => e.id === exerciseId);
      if (ex) setRestPref(displayName(ex), next);
      return { ...r, [exerciseId]: next };
    });
    setActiveRest((ar) => {
      if (!ar || ar.exerciseId !== exerciseId) return ar;
      const endsAt = Math.max(Date.now(), ar.endsAt + delta * 1000);
      const ex = sorted.find((e) => e.id === exerciseId);
      const label = ex ? displayName(ex) : "Next set";
      void scheduleRestAlert({
        exerciseId,
        afterSet: ar.afterSet,
        endsAt,
        label,
        url: window.location.pathname,
      });
      return { ...ar, endsAt };
    });
  }

  function setRestSeconds(exerciseId: string, seconds: number) {
    const next = Math.max(0, Math.min(600, seconds));
    setRestByExercise((r) => ({ ...r, [exerciseId]: next }));
    const ex = sorted.find((e) => e.id === exerciseId);
    if (ex) setRestPref(displayName(ex), next);
  }

  /** Set preferred rest and restart the active countdown to that full duration. */
  function applyRestPreset(exerciseId: string, seconds: number) {
    setRestSeconds(exerciseId, seconds);
    setRestEditExerciseId(null);
    setActiveRest((ar) => {
      if (!ar || ar.exerciseId !== exerciseId) return ar;
      const endsAt = Date.now() + seconds * 1000;
      const ex = sorted.find((e) => e.id === exerciseId);
      const label = ex ? displayName(ex) : "Next set";
      void scheduleRestAlert({
        exerciseId,
        afterSet: ar.afterSet,
        endsAt,
        label,
        url: window.location.pathname,
      });
      return { ...ar, endsAt };
    });
  }

  function requestFinish() {
    setShowFinishConfirm(true);
  }

  /** Build the set rows exactly as they are stored, independent of transport. */
  function buildSetRows() {
    const rows: PendingSessionRow[] = [];
    for (const ex of sorted) {
      const sided = oneSided(ex);
      for (const set of setsByExercise[ex.id] ?? []) {
        if (!set.completed) continue;
        if (sided && !set.isWarmup) {
          for (const side of ["L", "R"] as const) {
            rows.push({
              exercise_name: displayName(ex),
              muscle: ex.muscle,
              set_number: set.setNumber,
              weight: Number(side === "L" ? set.weight : set.weightR) || 0,
              reps: Number(side === "L" ? set.reps : set.repsR) || 0,
              is_completed: true,
              is_warmup: false,
              rir: typeof set.rir === "number" ? set.rir : null,
              side,
            });
          }
          continue;
        }
        rows.push({
          exercise_name: displayName(ex),
          muscle: ex.muscle,
          set_number: set.setNumber,
          weight: Number(set.weight) || 0,
          reps: Number(set.reps) || 0,
          is_completed: true,
          is_warmup: Boolean(set.isWarmup),
          rir: typeof set.rir === "number" ? set.rir : null,
        });
      }
    }
    return rows;
  }

  function buildSessionMeta() {
    const duration = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
    let sessionStart = new Date(startedAt);
    let sessionEnd = new Date();
    if (logDate) {
      const [y, m, d] = logDate.split("-").map(Number);
      sessionEnd = new Date(y, m - 1, d, 12, 0, 0);
      sessionStart = new Date(sessionEnd.getTime() - duration * 1000);
    }
    return {
      day_name: sessionDayName,
      started_at: sessionStart.toISOString(),
      ended_at: sessionEnd.toISOString(),
      duration_seconds: duration,
      notes: Object.entries(notes)
        .filter(([, v]) => v.trim())
        .map(([id, v]) => {
          const ex = sorted.find((e) => e.id === id);
          const name = ex ? displayName(ex) : id;
          return `${name}: ${v}`;
        })
        .join("\n"),
    };
  }

  /**
   * Keep a finished workout on the device when it cannot be uploaded, and leave
   * the session screen as if it had saved — the queue uploads it later. Rating
   * needs a server session id, so a queued workout skips that step.
   */
  function finishOffline() {
    queuePendingSession({ session: buildSessionMeta(), sets: buildSetRows() });
    clearDraft(dayId, logDate);
    clearActiveRest();
    sessionStorage.removeItem("ft-tab:train");
    sessionStorage.removeItem("ft-tab:dashboard");
    setSaving(false);
    router.push("/train");
  }

  function finish() {
    setShowFinishConfirm(false);
    if (completedSetCount === 0) {
      setError("Complete at least one set before finishing.");
      return;
    }
    setSaving(true);
    setError("");

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      finishOffline();
      return;
    }

    startTransition(async () => {
      const supabase = supabaseRef.current;
      let user;
      try {
        const res = await supabase.auth.getUser();
        user = res.data.user;
      } catch (err) {
        if (isOfflineError(err)) return finishOffline();
        setError("Could not verify your session");
        setSaving(false);
        return;
      }
      if (!user) {
        setError("Not signed in");
        setSaving(false);
        return;
      }

      const duration = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
      let sessionStart = new Date(startedAt);
      let sessionEnd = new Date();
      if (logDate) {
        // Anchor finished session to the selected calendar day (noon + duration)
        const [y, m, d] = logDate.split("-").map(Number);
        sessionEnd = new Date(y, m - 1, d, 12, 0, 0);
        sessionStart = new Date(sessionEnd.getTime() - duration * 1000);
      }
      const { data: session, error: sessionErr } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          day_name: sessionDayName,
          started_at: sessionStart.toISOString(),
          ended_at: sessionEnd.toISOString(),
          duration_seconds: duration,
          notes: Object.entries(notes)
            .filter(([, v]) => v.trim())
            .map(([id, v]) => {
              const ex = sorted.find((e) => e.id === id);
              const name = ex ? displayName(ex) : id;
              return `${name}: ${v}`;
            })
            .join("\n"),
        })
        .select("id")
        .single();

      if (sessionErr || !session) {
        if (isOfflineError(sessionErr)) return finishOffline();
        setError(sessionErr?.message ?? "Could not save session");
        setSaving(false);
        return;
      }

      const rows = buildSetRows().map((r) => ({ ...r, session_id: session.id }));

      if (rows.length) {
        let { error: setsErr } = await supabase.from("set_logs").insert(rows);
        if (setsErr?.message?.toLowerCase().includes("is_warmup")) {
          const fallbackRows = rows.map(({ is_warmup, ...rest }) => {
            void is_warmup;
            return rest;
          });
          const retry = await supabase.from("set_logs").insert(fallbackRows);
          setsErr = retry.error;
        }
        if (setsErr && /\b(side|rir)\b/i.test(setsErr.message ?? "")) {
          // Older schema: store each set once, with the left side standing in
          // for a one-sided set, and keep the right side's numbers in the notes.
          const rightLines = rows
            .filter((r) => r.side === "R")
            .map((r) => `${r.exercise_name} set ${r.set_number} right: ${r.weight} × ${r.reps}`);
          const fallbackRows = rows
            .filter((r) => r.side !== "R")
            .map(({ rir, side, ...rest }) => {
              void rir;
              void side;
              return rest;
            });
          const retry = await supabase.from("set_logs").insert(fallbackRows);
          setsErr = retry.error;
          if (!setsErr && rightLines.length) {
            const { data: row } = await supabase.from("workout_sessions").select("notes").eq("id", session.id).maybeSingle();
            await supabase
              .from("workout_sessions")
              .update({ notes: [row?.notes, ...rightLines].filter(Boolean).join("\n") })
              .eq("id", session.id);
          }
        }
        if (setsErr) {
          await supabase.from("workout_sessions").delete().eq("id", session.id);
          if (isOfflineError(setsErr)) return finishOffline();
          setError(setsErr.message);
          setSaving(false);
          return;
        }
      }

      pendingFinishRef.current = {
        sessionId: session.id,
        snapshot: {
          dayId,
          dayName: sessionDayName,
          startedAt,
          setsByExercise,
          notes,
          nameOverrides,
          restByExercise,
          addedExercises,
        },
      };

      clearDraft(dayId, logDate);
      clearActiveRest();
      setSaving(false);
      sessionStorage.removeItem("ft-tab:train");
      sessionStorage.removeItem("ft-tab:dashboard");
      setRatingSessionId(session.id);
    });
  }

  /**
   * The plan's rule is "stop any lift that pinches" and to track a pain score
   * over time. This records the answer per session. Until schema_shoulder.sql
   * is run the columns don't exist, so the answer falls back into notes.
   */
  async function submitShoulder(status: "fine" | "pinchy" | "painful", lift: string) {
    if (!ratingSessionId) return;
    setRatingSaving(true);
    const supabase = supabaseRef.current;
    const { error: shErr } = await supabase
      .from("workout_sessions")
      .update({ shoulder_status: status, shoulder_lift: lift || null })
      .eq("id", ratingSessionId);
    if (shErr) {
      const line = `Shoulder: ${status}${lift ? ` (${lift})` : ""}`;
      const { data: row } = await supabase
        .from("workout_sessions")
        .select("notes")
        .eq("id", ratingSessionId)
        .maybeSingle();
      const notes = [row?.notes, line].filter(Boolean).join("\n");
      await supabase.from("workout_sessions").update({ notes }).eq("id", ratingSessionId);
    }
    const id = ratingSessionId;
    pendingFinishRef.current = null;
    setRatingSessionId(null);
    setRatingSaving(false);
    router.push(`/train/history/${id}?fresh=1`);
    router.refresh();
  }

  async function undoFinishAndResume() {
    if (!ratingSessionId || ratingSaving) return;
    setRatingSaving(true);
    setError("");

    const supabase = supabaseRef.current;
    const id = ratingSessionId;
    const snap = pendingFinishRef.current?.snapshot;

    const { error: delErr } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", id);

    if (delErr) {
      setError(delErr.message);
      setRatingSaving(false);
      return;
    }

    if (snap) {
      setSetsByExercise(snap.setsByExercise);
      setNotes(snap.notes);
      setNameOverrides(snap.nameOverrides);
      setRestByExercise(snap.restByExercise);
      setAddedExercises(snap.addedExercises);
      setSessionDayName(snap.dayName);
      setStartedAt(snap.startedAt);
      saveDraft({
        ...snap,
        savedAt: Date.now(),
      }, logDate);
      setDraftBanner(true);
    }

    pendingFinishRef.current = null;
    setRatingSessionId(null);
    setRatingSaving(false);
    sessionStorage.removeItem("ft-tab:train");
    sessionStorage.removeItem("ft-tab:dashboard");
  }

  function skipRating() {
    if (!ratingSessionId || ratingSaving) return;
    const id = ratingSessionId;
    pendingFinishRef.current = null;
    setRatingSessionId(null);
    router.push(`/train/history/${id}?fresh=1`);
    router.refresh();
  }

  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  const timerText = `${mm}:${ss.toString().padStart(2, "0")}`;
  const estimateLeft = formatEstimateMinutes(
    estimateRemainingSeconds({
      exercises: sorted,
      setsByExercise,
      restByExercise,
      defaultRest: (ex, i) =>
        defaultRestSeconds(ex as Exercise, i),
    })
  );
  const dateLabel = (() => {
    const d = logDate
      ? (() => {
          const [y, m, day] = logDate.split("-").map(Number);
          return new Date(y, m - 1, day, 12);
        })()
      : new Date();
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  })();

  const editEx = editForId ? sorted.find((e) => e.id === editForId) : null;
  const swapEx = swapForId ? sorted.find((e) => e.id === swapForId) : null;

  return (
    <div className="min-h-dvh pb-28">
      <div
        className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)] px-5 pb-3"
        style={{ paddingTop: "max(14px, env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={requestLeave}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[var(--card-2)] text-[var(--muted)]"
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
          <div className="text-center">
            <p className="font-mono text-[22px] font-extrabold leading-tight tabular-nums tracking-tight">
              {timerText}
            </p>
            <p className="text-[11px] font-semibold text-[var(--muted)]">
              {estimateLeft}
            </p>
          </div>
          <button
            type="button"
            onClick={requestFinish}
            disabled={saving}
            className="flex h-[42px] items-center rounded-full bg-[var(--accent)] px-5 text-[14.5px] font-extrabold text-[var(--on-accent)]"
          >
            {saving ? "…" : "Finish"}
          </button>
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--border-solid)]">
            <div
              className="h-full rounded-full bg-[var(--green)] transition-[width]"
              style={{
                width: `${mainProgress.total ? Math.round((mainProgress.done / mainProgress.total) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="shrink-0 text-[11px] font-bold tabular-nums text-[var(--muted)]">
            {mainProgress.done} of {mainProgress.total} sets
          </p>
        </div>
      </div>

      {prToast ? (
        <div
          className="fixed left-1/2 z-40 w-[min(92vw,360px)] -translate-x-1/2 rounded-md border border-[var(--green)]/50 bg-[#14261a] px-4 py-3 shadow-lg"
          style={{ top: "max(72px, calc(env(safe-area-inset-top, 0px) + 56px))" }}
          role="status"
        >
          <p className="text-sm font-bold text-[var(--green)]">{prToast.title}</p>
          <p className="mt-0.5 text-xs text-white/80">{prToast.detail}</p>
        </div>
      ) : null}

      {draftBanner ? (
        <div className="mx-4 mt-3 rounded-md border border-[var(--blue)]/40 bg-[var(--blue)]/10 px-3 py-2 text-xs text-[var(--blue)]">
          Resumed saved session.{" "}
          <button type="button" className="font-bold underline" onClick={() => setDraftBanner(false)}>
            OK
          </button>
        </div>
      ) : null}

      <div className="px-5 pt-4">
        <input
          className="w-full bg-transparent text-[22px] font-extrabold tracking-tight outline-none"
          value={sessionDayName}
          onChange={(e) => setSessionDayName(e.target.value)}
          aria-label="Workout name"
        />
        <p className="mt-0.5 text-[13px] text-[var(--muted)]">
          {dateLabel}
          {logDate ? " · backfill" : ""} · autosaved · tap name to rename
        </p>
      </div>

      <div className="mt-4 space-y-4 px-4">
        {warmups.length ? (
          <section className="space-y-3 rounded-md border border-[var(--yellow)]/20 bg-[var(--card)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-[17px] font-bold">Warm-up <Explain term="prehab" /></h2>
                <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">
                  Shoulder prehab · {warmupsDone} of {warmups.length} done
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-[4px] bg-[var(--card-2)] px-3 py-2 text-[12.5px] font-bold text-[var(--muted)] active:text-[var(--text)]"
                onClick={() => {
                  const allDone = warmupsDone === warmups.length;
                  for (const ex of warmups) setWarmupDone(ex.id, !allDone);
                }}
              >
                {warmupsDone === warmups.length ? "Clear" : "Check all"}
              </button>
            </div>

            <div className="space-y-1">
              {warmups.map((ex) => {
                const sets = setsByExercise[ex.id] ?? [];
                const done = sets.length > 0 && sets.every((s) => s.completed);
                const name = displayName(ex);
                return (
                  <div key={ex.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWarmupDone(ex.id, !done)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1.5 py-2.5 text-left active:bg-white/5"
                      aria-pressed={done}
                    >
                      <span
                        className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[4px] border-2 ${
                          done
                            ? "border-[var(--green)] bg-[var(--green)] text-[var(--on-green)]"
                            : "border-[var(--dim)] bg-[var(--card-2)] text-transparent"
                        }`}
                      >
                        <IconCheck size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-[14.5px] font-semibold ${
                            done ? "text-[var(--muted)] line-through" : "text-[var(--text)]"
                          }`}
                        >
                          {name}
                        </span>
                        <span className="block truncate text-[12px] text-[var(--muted)]">
                          {ex.working_rep_range || `${ex.default_sets} sets`}
                        </span>
                        {leftLimited && leftArmNote(name) ? (
                          <span className="block truncate text-[11.5px] font-semibold text-[var(--yellow)]">
                            {leftArmNote(name)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    <a
                      href={formVideoUrl(name)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Form video for ${name}`}
                      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[4px] bg-[var(--card-2)] text-[var(--muted)] active:text-[var(--text)]"
                    >
                      <IconPlayCircle size={17} />
                    </a>
                    <button
                      type="button"
                      aria-label={`Options for ${name}`}
                      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[4px] bg-[var(--card-2)] text-[var(--muted)] active:text-[var(--text)]"
                      onClick={() => openEdit(ex)}
                    >
                      <IconMore size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {main.map((ex) => {
          const sets = setsByExercise[ex.id] ?? [];
          const name = displayName(ex);
          const cat = catalogEntry(name) ?? catalogEntry(ex.name);
          const isCardio = ex.muscle === "Cardio";
          const showPlates = !isCardio && isBarbellLoadable(name);
          // Sets × reps is drawn as a dimension line; the prescription text
          // keeps only what the line can't say (effort cues, crown-set detail).
          const range = !isCardio && !ex.has_crown_set ? parseRepRange(ex.working_rep_range) : null;
          const dimension = range
            ? `${ex.default_sets} × ${range.low === range.high ? `${range.low}+` : `${range.low}–${range.high}`}`
            : null;
          const prescriptionNotes = isCardio
            ? []
            : formatPrescription({
                defaultSets: ex.default_sets,
                hasCrownSet: ex.has_crown_set,
                crownRepRange: ex.crown_rep_range,
                workingRepRange: ex.working_rep_range,
              })
                .filter((line) => !dimension || !/^\d+ sets$/.test(line))
                .map((line) => (dimension ? line.replace(/^[0-9]+[–-][0-9]+ reps(\s*·\s*)?/, "") : line))
                .filter(Boolean);

          return (
            <section
              key={ex.id}
              className="space-y-3 rounded-md border border-[var(--border-solid)] bg-[var(--card)] p-4"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 className="text-[17px] font-bold leading-snug">{name}</h2>
                    <span className="rounded-[4px] bg-[var(--card-2)] px-2 py-0.5 text-[11px] font-bold text-[var(--muted)]">
                      {ex.muscle}
                    </span>
                  </div>
                  {prescriptionNotes.length ? (
                    <div className="mt-1.5 space-y-0.5">
                      {prescriptionNotes.map((line) => (
                        <p key={line} className="flex items-center gap-1.5 text-[12.5px] leading-snug text-[var(--muted)]">
                          {line}
                          {/fail/i.test(line) ? <Explain term="failure" /> : null}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {(() => {
                    // What he told himself last time, in front of him before
                    // the first set rather than filed in an old session.
                    const past = lastNotes[name] ?? lastNotes[ex.name];
                    if (!past) return null;
                    const when = new Date(`${past.date}T12:00:00`).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <p className="mt-1.5 rounded-[4px] border-l-2 border-[var(--blue)] bg-[var(--surface)] px-2 py-1.5 text-[12px] leading-snug text-[var(--muted)]">
                        <span className="font-bold text-[var(--blue)]">{when}:</span> {past.note}
                      </p>
                    );
                  })()}
                  {isCardio ? (
                    <p className="mt-1.5 text-[13px] font-semibold text-[var(--blue)]">
                      30 min incline walk
                    </p>
                  ) : null}
                  {leftLimited && leftArmNote(name) ? (
                    <p className="mt-1 text-[12px] font-semibold text-[var(--yellow)]">{leftArmNote(name)}</p>
                  ) : null}
                  {cat?.notes ? (
                    <p className="mt-1 text-[12px] text-[var(--yellow)]">{cat.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <a
                    href={formVideoUrl(name)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Form video"
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-[4px] bg-[var(--card-2)] text-[var(--muted)] active:text-[var(--text)]"
                  >
                    <IconPlayCircle size={17} />
                  </a>
                  <button
                    type="button"
                    aria-label="Swap exercise"
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-[4px] bg-[var(--card-2)] text-[var(--muted)] active:text-[var(--text)]"
                    onClick={() => setSwapForId(ex.id)}
                  >
                    <IconSwap size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label="Edit exercise"
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-[4px] bg-[var(--card-2)] text-[var(--muted)] active:text-[var(--text)]"
                    onClick={() => openEdit(ex)}
                  >
                    <IconMore size={17} />
                  </button>
                </div>
              </div>

              {dimension ? (
                <p className="dim font-mono text-[12.5px] font-medium">
                  <span className="whitespace-nowrap">{dimension}</span>
                </p>
              ) : null}

              {isCardio ? (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--muted)]">
                    30 min incline walk — log pace when done.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="field !py-2 text-center"
                      placeholder="Speed"
                      value={sets[0]?.weight ?? ""}
                      onChange={(e) => updateSet(ex.id, 0, { weight: e.target.value })}
                    />
                    <input
                      className="field !py-2 text-center"
                      placeholder="Incline %"
                      value={sets[0]?.reps ?? ""}
                      onChange={(e) => updateSet(ex.id, 0, { reps: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleComplete(ex, 0)}
                    className={`w-full rounded-md py-3 text-sm font-bold ${
                      sets[0]?.completed
                        ? "bg-[var(--green)] text-[var(--on-green)]"
                        : "bg-[var(--raised)] text-[var(--text)]"
                    }`}
                  >
                    {sets[0]?.completed ? "Cardio done ✓" : "Mark cardio done"}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-[36px_minmax(0,1fr)_64px_56px_44px] items-center gap-1.5 px-0.5 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--dim)]">
                    <span title="Tap set # to mark warm-up">Set</span>
                    <span>Previous</span>
                    <span className="text-center">lbs</span>
                    <span className="text-center">Reps</span>
                    <span></span>
                  </div>

                  {sets.map((set, i) => {
                    const showRest =
                      activeRest?.exerciseId === ex.id &&
                      activeRest.afterSet === i &&
                      activeRestLeft > 0;
                    const prevList =
                      previousByExercise[name] ?? previousByExercise[ex.name] ?? [];
                    const prevRaw = prevList[i] ?? prevList[prevList.length - 1];
                    const sided = oneSided(ex) && !set.isWarmup && !isCardio;
                    const prevRList = sided
                      ? previousByExercise[rightSideKey(name)] ?? previousByExercise[rightSideKey(ex.name)] ?? []
                      : [];
                    const prevRawR = sided ? (prevRList[i] ?? prevRList[prevRList.length - 1] ?? prevRaw) : undefined;
                    // Crown sets carry their own range; everything else uses the
                    // working range for the movement.
                    const suggestion =
                      set.isWarmup || isCardio
                        ? null
                        : suggestOverload({
                            previous: prevRaw,
                            repRange:
                              ex.has_crown_set && i === 0
                                ? ex.crown_rep_range
                                : ex.working_rep_range,
                            noLoadIncrease: sided && leftLimited,
                          });
                    const suggestionR = sided
                      ? suggestOverload({
                          previous: prevRawR,
                          repRange:
                            ex.has_crown_set && i === 0 ? ex.crown_rep_range : ex.working_rep_range,
                        })
                      : null;
                    const shortTarget = (x: typeof suggestion) =>
                      x ? x.label.replace(/^(Try|Hold|Repeat|Aim)\s+/i, "") : "";
                    const targetLabel = set.isWarmup
                      ? "Warm-up"
                      : sided && suggestion && suggestionR && suggestion.kind !== "open"
                        ? `L ${shortTarget(suggestion)} · R ${shortTarget(suggestionR)}`
                        : (suggestion?.label ?? setTargetLabel(ex, i));
                    const canApply =
                      !set.completed &&
                      suggestion != null &&
                      suggestion.kind !== "open" &&
                      suggestion.reps != null;

                    return (
                      <div key={set.setNumber}>
                        <div
                          className={`grid grid-cols-[36px_minmax(0,1fr)_64px_56px_44px] items-center gap-1.5 rounded-md px-0.5 py-1.5 ${
                            set.completed
                              ? set.isWarmup
                                ? "bg-[var(--yellow)]/[0.07]"
                                : "bg-[var(--green)]/[0.07]"
                              : ""
                          } ${set.isWarmup && !set.completed ? "opacity-80" : ""}`}
                        >
                          <button
                            type="button"
                            title={
                              set.isWarmup
                                ? "Warm-up — tap for working"
                                : "Working — tap for warm-up"
                            }
                            onClick={() =>
                              updateSet(ex.id, i, { isWarmup: !set.isWarmup })
                            }
                            className={`mx-auto flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-extrabold ${
                              set.isWarmup
                                ? "bg-[var(--yellow)]/15 text-[var(--yellow)]"
                                : "bg-[var(--card-2)] text-[var(--text)]"
                            }`}
                          >
                            {set.isWarmup
                              ? "W"
                              : ex.has_crown_set && i === 0
                                ? "1"
                                : set.setNumber}
                          </button>
                          <div className="min-w-0">
                            {sided ? (
                              <p className="truncate text-[12px] font-semibold tabular-nums text-[var(--muted)]">
                                L {set.previous ?? "—"} · R {set.previousR ?? "—"}
                              </p>
                            ) : set.previous && set.previous !== "—" ? (
                              <button
                                type="button"
                                className="block w-full truncate text-left text-[13px] font-semibold text-[var(--muted)] active:text-[var(--green)]"
                                title="Tap to use last time’s weight & reps"
                                onClick={() => fillFromPrevious(ex, i)}
                              >
                                {set.previous.replace("×", " × ")}
                              </button>
                            ) : (
                              <p className="truncate text-[13px] text-[var(--muted)]">—</p>
                            )}
                            {canApply ? (
                              <button
                                type="button"
                                title={suggestion?.detail}
                                onClick={() =>
                                  updateSet(ex.id, i, {
                                    weight:
                                      suggestion?.weight != null
                                        ? String(suggestion.weight)
                                        : set.weight,
                                    reps: String(suggestion?.reps ?? ""),
                                    ...(sided && suggestionR
                                      ? {
                                          weightR:
                                            suggestionR.weight != null
                                              ? String(suggestionR.weight)
                                              : (set.weightR ?? ""),
                                          repsR: String(suggestionR.reps ?? ""),
                                        }
                                      : {}),
                                  })
                                }
                                className="block w-full truncate text-left text-[11px] font-bold text-[var(--blue)] underline decoration-dotted underline-offset-2 active:text-[var(--green)]"
                              >
                                {targetLabel}
                              </button>
                            ) : (
                              <p
                                className={`truncate text-[11px] font-bold ${
                                  set.isWarmup
                                    ? "text-[var(--yellow)]"
                                    : "text-[var(--blue)]"
                                }`}
                              >
                                {targetLabel}
                              </p>
                            )}
                          </div>
                          {sided ? (
                            <>
                              <div className="flex flex-col gap-1">
                                {(["L", "R"] as const).map((side) => (
                                  <label key={side} className="relative block">
                                    <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--dim)]">
                                      {side}
                                    </span>
                                    <input
                                      aria-label={`${side === "L" ? "Left" : "Right"} weight`}
                                      className="h-9 w-full rounded-md border border-[var(--border-solid)] bg-[var(--field)] pl-4 pr-1 text-center text-[14px] font-bold text-[var(--text)] outline-none focus:border-[var(--blue)]"
                                      inputMode="decimal"
                                      value={side === "L" ? set.weight : (set.weightR ?? "")}
                                      onChange={(e) =>
                                        updateSet(ex.id, i, side === "L" ? { weight: e.target.value } : { weightR: e.target.value })
                                      }
                                    />
                                  </label>
                                ))}
                              </div>
                              <div className="flex flex-col gap-1">
                                {(["L", "R"] as const).map((side) => (
                                  <input
                                    key={side}
                                    aria-label={`${side === "L" ? "Left" : "Right"} reps`}
                                    className="h-9 w-full rounded-md border border-[var(--border-solid)] bg-[var(--field)] px-1 text-center text-[14px] font-bold text-[var(--text)] outline-none focus:border-[var(--blue)]"
                                    inputMode="numeric"
                                    value={side === "L" ? set.reps : (set.repsR ?? "")}
                                    onChange={(e) =>
                                      updateSet(ex.id, i, side === "L" ? { reps: e.target.value } : { repsR: e.target.value })
                                    }
                                  />
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                          <input
                              className="h-11 w-full rounded-md border border-[var(--border-solid)] bg-[var(--field)] px-1 text-center text-[15px] font-bold text-[var(--text)] outline-none focus:border-[var(--blue)]"
                              inputMode="decimal"
                              value={set.weight}
                              onChange={(e) =>
                                updateSet(ex.id, i, { weight: e.target.value })
                              }
                            />
                            <input
                              className="h-11 w-full rounded-md border border-[var(--border-solid)] bg-[var(--field)] px-1 text-center text-[15px] font-bold text-[var(--text)] outline-none focus:border-[var(--blue)]"
                              inputMode="numeric"
                              value={set.reps}
                              onChange={(e) =>
                                updateSet(ex.id, i, { reps: e.target.value })
                              }
                            />
                            </>
                          )}
                          <button
                            type="button"
                            aria-label={set.completed ? "Set done" : "Mark set done"}
                            onClick={() => toggleComplete(ex, i)}
                            className={`mx-auto flex h-10 w-10 items-center justify-center rounded-md ${
                              set.completed
                                ? "bg-[var(--green)] text-[var(--on-green)]"
                                : "bg-[var(--card-2)] text-[var(--dim)]"
                            }`}
                          >
                            <IconCheck size={18} />
                          </button>
                        </div>
                        {set.completed && !set.isWarmup && !isCardio ? (
                          <div className="flex flex-wrap items-center gap-2 px-1 pb-1 pt-1.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                              Left in tank
                              <Explain term="rir" />
                            </span>
                            <div className="flex gap-1">
                              {[0, 1, 2, 3].map((n) => {
                                const on = set.rir === n;
                                return (
                                  <button
                                    key={n}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => {
                                      updateSet(ex.id, i, { rir: on ? undefined : n });
                                      if (!rirExplained) {
                                        setRirExplained(true);
                                        try {
                                          localStorage.setItem("ft-rir-explained", "1");
                                        } catch {
                                          /* ignore */
                                        }
                                      }
                                    }}
                                    className={`h-9 min-w-[40px] rounded-[4px] px-2 text-[13px] font-bold tabular-nums ${
                                      on
                                        ? "bg-[var(--blue)] text-[var(--on-blue)]"
                                        : "bg-[var(--raised)] text-[var(--muted)]"
                                    }`}
                                  >
                                    {n === 3 ? "3+" : n}
                                  </button>
                                );
                              })}
                            </div>
                            {typeof set.rir === "number" && rirTarget != null && set.rir < rirTarget - 1 ? (
                              <span className="basis-full text-[11.5px] text-[var(--yellow)]">
                                Plan wants about {rirTarget} left this week — that set was close to failure.
                              </span>
                            ) : !rirExplained ? (
                              <span className="basis-full text-[11.5px] text-[var(--muted)]">
                                How many more reps could you have done? Your plan wants {rirTarget ?? "1–3"} left this week.
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {showPlates
                          ? (() => {
                              const exerciseBar = barForExercise(name, ex.id);
                              const load = plateLoadForWeight(
                                set.weight,
                                exerciseBar
                              );
                              if (!load && !(Number(set.weight) > 0)) return null;
                              return (
                                <div className="flex flex-wrap items-center gap-2 px-1 py-1">
                                  <div className="flex gap-1">
                                    {BAR_OPTIONS.map((lb) => (
                                      <button
                                        key={lb}
                                        type="button"
                                        onClick={() => chooseBar(ex.id, lb)}
                                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                          exerciseBar === lb
                                            ? "bg-[var(--blue)] text-[var(--on-blue)]"
                                            : "bg-[var(--raised)] text-[var(--muted)]"
                                        }`}
                                      >
                                        {lb}
                                      </button>
                                    ))}
                                  </div>
                                  {load ? (
                                    <p className="text-[10px] leading-snug text-[var(--muted)]">
                                      {formatPlateLoad(load)}
                                      {!load.exact
                                        ? ` · closest ${load.totalLb}`
                                        : ""}
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-[var(--muted)]">
                                      below {exerciseBar} bar
                                    </p>
                                  )}
                                </div>
                              );
                            })()
                          : null}
                        {showRest ? (
                          <div className="my-1.5 flex items-center gap-2.5 rounded-md border border-[var(--blue)]/25 bg-[var(--blue)]/10 px-3.5 py-2.5">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                            <span className="flex-1 font-mono text-[13.5px] font-bold tabular-nums text-[var(--blue)]">
                              Rest · {formatRest(activeRestLeft)}
                            </span>
                            <button
                              type="button"
                              className="text-[12.5px] font-bold text-[var(--muted)]"
                              onClick={() => bumpRest(ex.id, -15)}
                            >
                              −15s
                            </button>
                            <button
                              type="button"
                              className="text-[12.5px] font-bold text-[var(--muted)]"
                              onClick={() => bumpRest(ex.id, 15)}
                            >
                              +15s
                            </button>
                            <button
                              type="button"
                              className="text-[12.5px] font-bold text-[var(--blue)]"
                              onClick={clearActiveRest}
                            >
                              Skip
                            </button>
                          </div>
                        ) : i < sets.length - 1 ? (
                          <div className="py-0.5">
                            {restEditExerciseId === ex.id ? (
                              <div className="flex flex-wrap items-center justify-center gap-1.5 px-1">
                                {REST_PRESETS.map((s) => {
                                  const cur =
                                    restByExercise[ex.id] ?? defaultRestSeconds(ex, i);
                                  const on = cur === s;
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      className={`rounded-[4px] px-2.5 py-1.5 text-[11px] font-bold ${
                                        on
                                          ? "bg-[var(--blue)] text-[var(--on-blue)]"
                                          : "bg-[var(--raised)] text-[var(--muted)]"
                                      }`}
                                      onClick={() => applyRestPreset(ex.id, s)}
                                    >
                                      {formatRest(s)}
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  className="px-2 text-[11px] font-semibold text-[var(--muted)]"
                                  onClick={() => setRestEditExerciseId(null)}
                                >
                                  done
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="flex w-full items-center justify-center gap-3 py-1 text-[11px] text-[var(--muted)] active:text-[var(--text)]"
                                onClick={() => setRestEditExerciseId(ex.id)}
                              >
                                <span className="h-px flex-1 bg-[var(--border-solid)]" />
                                <span className="font-mono">
                                  rest{" "}
                                  {formatRest(
                                    restByExercise[ex.id] ?? defaultRestSeconds(ex, i)
                                  )}{" "}
                                  · presets
                                </span>
                                <span className="h-px flex-1 bg-[var(--border-solid)]" />
                              </button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              <input
                className="field !py-2.5 text-sm"
                placeholder="Session note (optional)"
                value={notes[ex.id] ?? ""}
                onChange={(e) =>
                  setNotes((n) => ({ ...n, [ex.id]: e.target.value }))
                }
              />
            </section>
          );
        })}

        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="w-full rounded-md border border-dashed border-[var(--border-solid)] py-3.5 text-[14px] font-bold text-[var(--blue)] active:bg-white/5"
        >
          + Add exercise
        </button>
      </div>

      {error ? <p className="px-4 pt-3 text-sm text-red-400">{error}</p> : null}

      {showAdd ? (
        <AddExerciseSheet
          dayName={sessionDayName}
          busy={addBusy}
          onClose={() => setShowAdd(false)}
          onAdd={(pick) => void addExercise(pick)}
        />
      ) : null}

      {showFinishConfirm ? (
        <div
          className="fixed inset-0 z-[65] flex items-end justify-center bg-black/75 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finish-title"
        >
          <div className="w-full max-w-sm rounded-md border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl">
            <p id="finish-title" className="text-lg font-bold">
              Finish workout?
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {completedSetCount > 0
                ? `${completedSetCount} set${completedSetCount === 1 ? "" : "s"} logged. You can undo on the next screen if you tapped by mistake.`
                : "Complete at least one set before finishing."}
            </p>
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                className="btn-accent w-full"
                onClick={finish}
                disabled={saving || completedSetCount === 0}
              >
                {saving ? "Saving…" : "Finish & rate"}
              </button>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => setShowFinishConfirm(false)}
              >
                Keep going
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLeaveConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-title"
        >
          <div className="w-full max-w-sm rounded-md border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl">
            <p id="leave-title" className="text-lg font-bold">
              Leave workout?
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Your sets can be saved on this device so you can resume later. Discarding
              clears the in-progress session.
            </p>
            <div className="mt-5 space-y-2.5">
              <button type="button" className="btn-accent w-full" onClick={saveAndLeave}>
                Save & resume later
              </button>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => setShowLeaveConfirm(false)}
              >
                Keep going
              </button>
              <button
                type="button"
                className="w-full rounded-md border border-[var(--border-solid)] px-4 py-3 text-sm font-bold text-[var(--red)]"
                onClick={discardAndLeave}
              >
                Discard & leave
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {swapEx ? (
        <SwapExerciseSheet
          currentName={displayName(swapEx)}
          muscle={swapEx.muscle}
          onClose={() => setSwapForId(null)}
          onSwapHere={(name) => applySwap(swapEx.id, name)}
          onSwapAll={(name) => applySwapAll(swapEx.id, name)}
        />
      ) : null}

      {editEx ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-md border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-lg font-bold">Edit exercise</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Rename, pick a swap, or change rest for this movement.
            </p>

            <label className="label mt-4">Name</label>
            <input
              className="field !py-2.5"
              value={editNameDraft}
              onChange={(e) => setEditNameDraft(e.target.value)}
              placeholder="Custom exercise name"
            />
            <p className="mt-1.5 text-[11px] text-[var(--muted)]">
              Saved to your plan and past logs, so next session opens with these
              numbers already filled in.
            </p>
            {editNameDraft.trim() && !catalogEntry(editNameDraft.trim()) ? (
              <div className="mt-3 space-y-2 rounded-md border border-[var(--border-solid)] bg-[var(--surface)] p-3">
                <p className="text-[13px] font-semibold">Not in the exercise list — is it one arm or one leg at a time?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      [false, "Both together"],
                      [true, "One side at a time"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={editOneSided === val}
                      onClick={() => setEditOneSided(val)}
                      className={`min-h-[44px] rounded-md text-[13px] font-bold ${
                        editOneSided === val
                          ? "bg-[var(--blue)] text-[var(--on-blue)]"
                          : "bg-[var(--raised)] text-[var(--muted)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--muted)]">One side at a time logs a left and right weight for every set.</p>
              </div>
            ) : null}
            <button
              type="button"
              className="btn-accent mt-2 w-full !py-2.5"
              disabled={renameBusy}
              onClick={() => void applyCustomName()}
            >
              {renameBusy ? "Saving…" : "Save name"}
            </button>

            {editEx.muscle !== "Cardio" ? (
              <div className="mt-4">
                <p className="label !mb-2">Rest between sets</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-2"
                    onClick={() => bumpRest(editEx.id, -15)}
                  >
                    −15s
                  </button>
                  <span className="flex-1 text-center font-mono text-lg font-bold">
                    {formatRest(restByExercise[editEx.id] ?? defaultRestSeconds(editEx, 0))}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-2"
                    onClick={() => bumpRest(editEx.id, 15)}
                  >
                    +15s
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {REST_PRESETS.map((s) => {
                    const cur =
                      restByExercise[editEx.id] ?? defaultRestSeconds(editEx, 0);
                    const on = cur === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`rounded-[4px] py-1.5 text-[11px] font-semibold ${
                          on
                            ? "bg-[var(--blue)] text-[var(--on-blue)]"
                            : "bg-[var(--raised)] text-[var(--muted)]"
                        }`}
                        onClick={() => setRestSeconds(editEx.id, s)}
                      >
                        {formatRest(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <p className="label mt-4">Rest / name only</p>
            <p className="mb-2 text-[11px] text-[var(--muted)]">
              Use <span className="text-[var(--blue)]">Swap</span> on the exercise for
              recommendations and similar lifts.
            </p>
            <button
              type="button"
              className="mt-3 w-full text-sm font-semibold text-[var(--muted)]"
              onClick={() => setEditForId(null)}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      {activeRest && activeRestLeft > 0 ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 pt-3 backdrop-blur"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto max-w-lg space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  Rest timer
                </p>
                <p className="font-mono text-3xl font-bold tabular-nums text-[var(--green)]">
                  {formatRest(activeRestLeft)}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {(() => {
                    const ex = sorted.find((e) => e.id === activeRest.exerciseId);
                    if (!ex) return "Rest";
                    const setsLen = setsByExercise[ex.id]?.length ?? 1;
                    const isLast = activeRest.afterSet >= setsLen - 1;
                    const exIdx = sorted.findIndex((e) => e.id === ex.id);
                    const nextEx = isLast && exIdx >= 0 ? sorted[exIdx + 1] : null;
                    if (isLast) {
                      return nextEx
                        ? `Up next · ${displayName(nextEx)}`
                        : `${displayName(ex)} complete`;
                    }
                    return `Next set · ${displayName(ex)}`;
                  })()}
                </p>
                {typeof Notification !== "undefined" &&
                Notification.permission !== "granted" ? (
                  <p className="mt-0.5 text-[10px] text-[var(--yellow)]">
                    Allow notifications for alerts when the app is locked
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-full bg-[var(--raised)] px-3 py-2 text-xs font-bold"
                onClick={() => bumpRest(activeRest.exerciseId, 30)}
              >
                +30s
              </button>
              <button
                type="button"
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--on-accent)]"
                onClick={clearActiveRest}
              >
                Skip
              </button>
            </div>
            <div className="flex gap-1.5">
              {REST_PRESETS.map((s) => {
                const cur =
                  restByExercise[activeRest.exerciseId] ??
                  (() => {
                    const ex = sorted.find((e) => e.id === activeRest.exerciseId);
                    return ex ? defaultRestSeconds(ex, 0) : 180;
                  })();
                const on = cur === s;
                return (
                  <button
                    key={s}
                    type="button"
                    className={`flex-1 rounded-[4px] py-2 text-[11px] font-bold ${
                      on
                        ? "bg-[var(--green)]/20 text-[var(--green)] ring-1 ring-[var(--green)]"
                        : "bg-[var(--raised)] text-[var(--muted)]"
                    }`}
                    onClick={() => applyRestPreset(activeRest.exerciseId, s)}
                  >
                    {formatRest(s)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {ratingSessionId ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rating-title"
        >
          <div className="w-full max-w-sm rounded-md border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl">
            <p id="rating-title" className="text-lg font-bold">
              How did the shoulder feel?
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Your plan&apos;s rule: stop any lift that pinches. This keeps the trend.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(
                [
                  ["fine", "Fine", "text-[var(--green)] border-[var(--green)]"],
                  ["pinchy", "Pinchy", "text-[var(--yellow)] border-[var(--yellow)]"],
                  ["painful", "Painful", "text-[var(--red)] border-[var(--red)]"],
                ] as const
              ).map(([key, label, tone]) => (
                <button
                  key={key}
                  type="button"
                  disabled={ratingSaving}
                  aria-pressed={shoulder === key}
                  onClick={() => {
                    setShoulder(key);
                    if (key === "fine") void submitShoulder("fine", "");
                  }}
                  className={`flex h-12 items-center justify-center rounded-md border text-[15px] font-bold ${
                    shoulder === key ? `${tone} bg-[var(--raised)]` : "border-[var(--border-solid)] text-[var(--text)]"
                  } disabled:opacity-50`}
                >
                  {label}
                </button>
              ))}
            </div>
            {shoulder && shoulder !== "fine" ? (
              <div className="mt-3 space-y-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">On which lift?</p>
                <div className="flex flex-wrap gap-1.5">
                  {main.map((ex) => {
                    const n = displayName(ex);
                    const on = shoulderLift === n;
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setShoulderLift(on ? "" : n)}
                        className={`rounded-[4px] px-2.5 py-1.5 text-[12px] font-semibold ${
                          on ? "bg-[var(--blue)] text-[var(--on-blue)]" : "bg-[var(--raised)] text-[var(--muted)]"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn-accent w-full"
                  disabled={ratingSaving}
                  onClick={() => void submitShoulder(shoulder, shoulderLift)}
                >
                  {ratingSaving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="mt-4 w-full rounded-md border border-[var(--blue)]/50 bg-[var(--blue)]/10 px-4 py-3 text-sm font-bold text-[var(--blue)]"
              disabled={ratingSaving}
              onClick={() => void undoFinishAndResume()}
            >
              {ratingSaving ? "Restoring…" : "Keep training — undo finish"}
            </button>
            <button
              type="button"
              className="mt-3 w-full text-sm font-semibold text-[var(--muted)]"
              disabled={ratingSaving}
              onClick={skipRating}
            >
              Skip
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
