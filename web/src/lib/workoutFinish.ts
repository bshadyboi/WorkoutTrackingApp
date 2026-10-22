import { suggestNTTarget } from "./overload";
import { NT_RIR_TARGET } from "./ntCoaching";

export type FinishSet = { weight: number; reps: number; rir?: number | null };
export function summarizeLift(input: {
  sets: FinishSet[];
  previous: FinishSet[];
  best?: FinishSet;
  repRange: string;
  expectedSets: number;
  increment: number;
  nt: boolean;
  noLoadIncrease?: boolean;
}) {
  const sets = input.sets.filter(s => Number.isFinite(s.weight) && s.weight >= 0 && Number.isFinite(s.reps) && s.reps > 0);
  const pr = !!input.best && sets.some(s =>
    (s.weight > input.best!.weight && s.reps >= input.best!.reps) ||
    (s.weight === input.best!.weight && s.reps > input.best!.reps));
  const improved = sets.some((s, i) => {
    const p = input.previous[i];
    return p && ((s.weight === p.weight && s.reps > p.reps) || (s.weight > p.weight && s.reps >= p.reps));
  });
  const next = input.nt ? sets.map((s, i) => {
    const target = suggestNTTarget({ previous: s, previousSets: sets, expectedSets: input.expectedSets,
      repRange: input.repRange, targetRir: NT_RIR_TARGET, increment: input.increment,
      noLoadIncrease: input.noLoadIncrease });
    return target ? { set: i + 1, label: target.label, detail: target.detail } : null;
  }).filter((x): x is NonNullable<typeof x> => x !== null) : [];
  return { pr, improved, next, sets };
}
