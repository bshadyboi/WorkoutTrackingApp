export type MacroTargets = {
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fats: number;
};

/** Derrick Recomp baseline macros */
export const DEFAULT_TARGETS: MacroTargets = {
  target_calories: 2500,
  target_protein: 185,
  target_carbs: 280,
  target_fats: 70,
};

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
