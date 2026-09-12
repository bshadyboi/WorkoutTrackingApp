export type MacroTargets = {
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fats: number;
};

/** Used only when the profile has no targets of its own. */
export const DEFAULT_TARGETS: MacroTargets = {
  target_calories: 2100,
  target_protein: 190,
  target_carbs: 222,
  target_fats: 47,
};

export function hasOwnTargets(row: Partial<MacroTargets> | null | undefined): boolean {
  return Boolean(
    Number(row?.target_calories) ||
      Number(row?.target_protein) ||
      Number(row?.target_carbs) ||
      Number(row?.target_fats)
  );
}

export const DEFAULT_STEPS_GOAL = 11000;
export const DEFAULT_STEPS_RANGE = "10,000–12,000";

export function normalizeTargets(row: Partial<MacroTargets> | null | undefined): MacroTargets {
  return {
    target_calories: Number(row?.target_calories) || DEFAULT_TARGETS.target_calories,
    target_protein: Number(row?.target_protein) || DEFAULT_TARGETS.target_protein,
    target_carbs: Number(row?.target_carbs) || DEFAULT_TARGETS.target_carbs,
    target_fats: Number(row?.target_fats) || DEFAULT_TARGETS.target_fats,
  };
}

export function targetsLabel(t: MacroTargets) {
  return `${t.target_calories} · ${t.target_protein}p · ${t.target_carbs}c · ${t.target_fats}f`;
}
