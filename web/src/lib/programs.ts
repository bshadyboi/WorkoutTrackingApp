import type { WorkoutTemplate } from "@/lib/workouts";
import { BUILT_IN_WORKOUTS } from "@/lib/workouts";
import {
  ELEVATE_ALL_WORKOUTS,
  ELEVATE_PROGRESSION_NOTE,
  ELEVATE_WEEKLY_LABELS,
} from "@/lib/elevateChallenge";
import {
  DERRICK_RECOMP_TIP,
  DERRICK_RECOMP_WEEKLY_LABELS,
  DERRICK_RECOMP_WORKOUTS,
} from "@/lib/derrickRecomp";
import {
  seedDerrickRecompSlots,
  seedNtCoachingSlots,
  seedElevateChallengeSlots,
  seedPplAestheticsSlots,
  type ScheduleSlots,
} from "@/lib/schedule";
import { NT_TIP, NT_WEEKLY_LABELS, NT_WORKOUTS } from "@/lib/ntCoaching";
import { PPL_WEEKLY_LABELS } from "@/lib/weekdaySchedule";

export type ProgramId = "ppl-aesthetics" | "elevate-challenge" | "derrick-recomp" | "nt-coaching";

export type ProgramDef = {
  id: ProgramId;
  name: string;
  shortName: string;
  description: string;
  /** Weekly layout lines for Schedule UI */
  weeklyLabels: readonly string[];
  tip?: string;
  workouts: WorkoutTemplate[];
  /** Day names that belong to this program (for replace cleanup) */
  dayNames: string[];
  seedSlots: (days: { id: string; name: string }[]) => ScheduleSlots;
};

export const PROGRAMS: Record<ProgramId, ProgramDef> = {
  "nt-coaching": {
    id: "nt-coaching",
    name: "NT Coaching Split",
    shortName: "NT Coaching",
    description:
      "6-day upper/lower from NT Coaching, starting Mon Sep 21. Three identical upper days, two identical lower days, Wednesday off, Sunday stairmaster.",
    weeklyLabels: NT_WEEKLY_LABELS,
    tip: NT_TIP,
    workouts: NT_WORKOUTS,
    dayNames: NT_WORKOUTS.map((w) => w.name),
    seedSlots: seedNtCoachingSlots,
  },
  "derrick-recomp": {
    id: "derrick-recomp",
    name: "Shoulder-Safe Aesthetics",
    shortName: "Shoulder-Safe Aesthetics",
    description:
      "5-day push/pull/legs from Adam Yu's Aesthetics Blueprint under Derrick's shoulder rules. Mon Sep 14 → Nov 8. Weekly calorie rules from Week 3.",
    weeklyLabels: DERRICK_RECOMP_WEEKLY_LABELS,
    tip: DERRICK_RECOMP_TIP,
    workouts: DERRICK_RECOMP_WORKOUTS,
    dayNames: DERRICK_RECOMP_WORKOUTS.map((w) => w.name),
    seedSlots: seedDerrickRecompSlots,
  },
  "ppl-aesthetics": {
    id: "ppl-aesthetics",
    name: "PPL: Aesthetics Blueprint",
    shortName: "PPL Aesthetics",
    description:
      "5-day push/pull/legs split with feeder sets — Push A/B, Pull A/B, hybrid Wednesday legs.",
    weeklyLabels: PPL_WEEKLY_LABELS,
    tip: "Wed = Legs hybrid. Thu Push B · Fri Pull B · Sat/Sun Rest.",
    workouts: BUILT_IN_WORKOUTS,
    dayNames: BUILT_IN_WORKOUTS.map((w) => w.name),
    seedSlots: seedPplAestheticsSlots,
  },
  "elevate-challenge": {
    id: "elevate-challenge",
    name: "Elevate Challenge",
    shortName: "Elevate",
    description:
      "Chris Bumstead 6-week hypertrophy challenge. Friday = Day 1. Day 4 and Day 7 are rest.",
    weeklyLabels: ELEVATE_WEEKLY_LABELS,
    tip: ELEVATE_PROGRESSION_NOTE,
    workouts: ELEVATE_ALL_WORKOUTS,
    dayNames: ELEVATE_ALL_WORKOUTS.map((w) => w.name),
    seedSlots: seedElevateChallengeSlots,
  },
};

export const DEFAULT_PROGRAM_ID: ProgramId = "derrick-recomp";

export function isProgramId(v: unknown): v is ProgramId {
  return (
    v === "ppl-aesthetics" ||
    v === "elevate-challenge" ||
    v === "derrick-recomp" ||
    v === "nt-coaching"
  );
}

export function getProgram(id: ProgramId | string | null | undefined): ProgramDef {
  if (isProgramId(id)) return PROGRAMS[id];
  return PROGRAMS[DEFAULT_PROGRAM_ID];
}

export function allProgramDayNames(): string[] {
  return Object.values(PROGRAMS).flatMap((p) => p.dayNames);
}
