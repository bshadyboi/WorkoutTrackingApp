import { createClient } from "@/lib/supabase/client";
import type { MealItem } from "@/components/FoodSearchModal";
import { STAPLE_FOODS } from "@/lib/foods";

export type MealSlot = MealItem["meal"];

/** One food inside a saved meal, macros already scaled to the portion. */
export type SavedMealItem = {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingLabel: string;
};

export type SavedMeal = {
  id: string;
  name: string;
  meal: MealSlot;
  items: SavedMealItem[];
};

export const MEAL_SLOTS: MealSlot[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

const LOCAL_KEY = "ft-saved-meals-v2";
const SEEDED_KEY = "ft-saved-meals-seeded";

type Row = { id: string; name: string; meal: string; items: unknown };

function toSlot(v: string): MealSlot {
  return (MEAL_SLOTS as string[]).includes(v) ? (v as MealSlot) : "Snacks";
}

function toItems(v: unknown): SavedMealItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
    .map((x) => ({
      name: String(x.name ?? "Food"),
      brand: x.brand ? String(x.brand) : undefined,
      calories: Number(x.calories) || 0,
      protein: Number(x.protein) || 0,
      carbs: Number(x.carbs) || 0,
      fat: Number(x.fat) || 0,
      servingLabel: String(x.servingLabel ?? ""),
    }));
}

function fromRow(r: Row): SavedMeal {
  return { id: r.id, name: r.name, meal: toSlot(r.meal), items: toItems(r.items) };
}

export function mealTotals(items: Pick<SavedMealItem, "calories" | "protein" | "carbs" | "fat">[]) {
  return items.reduce(
    (a, m) => ({
      calories: a.calories + m.calories,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/** Macros keep one decimal ("65.5 g"); float sums would otherwise show 71.49999. */
export function roundMacro(n: number) {
  return Math.round(n * 10) / 10;
}

/** Turn a saved meal into log entries for the given day's slot. */
export function toLogItems(meal: SavedMeal, slot: MealSlot = meal.meal): MealItem[] {
  const stamp = Date.now();
  return meal.items.map((it, i) => ({
    id: `${stamp}-${i}-saved`,
    meal: slot,
    name: it.name,
    brand: it.brand,
    calories: it.calories,
    protein: it.protein,
    carbs: it.carbs,
    fat: it.fat,
    servingLabel: it.servingLabel,
  }));
}

/**
 * The table ships as schema_saved_meals.sql, which has to be run by hand in
 * Supabase. Until it exists every query fails with a missing-relation error;
 * rather than leave the feature dead until then, keep meals on this device.
 */
function isMissingTable(message: string | undefined) {
  return /saved_meals|does not exist|schema cache/i.test(message ?? "");
}

function readLocal(): SavedMeal[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map((m: Row & { meal: string }) => ({ ...fromRow(m) }))
      : [];
  } catch {
    return [];
  }
}

function writeLocal(list: SavedMeal[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export type SavedMealsResult = { meals: SavedMeal[]; deviceOnly: boolean };

async function fetchAll(): Promise<SavedMealsResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("saved_meals")
    .select("id, name, meal, items")
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingTable(error.message)) return { meals: readLocal(), deviceOnly: true };
    throw new Error(error.message);
  }
  return { meals: (data as Row[]).map(fromRow), deviceOnly: false };
}

function staple(id: string) {
  const f = STAPLE_FOODS.find((s) => s.id === id)!;
  return {
    name: f.name,
    brand: f.brand,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    servingLabel: f.servingLabel,
  };
}

/** The lunch the lifter eats most days, so one-tap logging works from day one. */
const STARTER_MEALS: Omit<SavedMeal, "id">[] = [
  {
    name: "Beef & rice bowl",
    meal: "Lunch",
    items: [staple("staple-ground-beef-93"), staple("staple-bibigo-rice")],
  },
];

export async function listSavedMeals(): Promise<SavedMealsResult> {
  const result = await fetchAll();
  let seeded = false;
  try {
    seeded = localStorage.getItem(SEEDED_KEY) === "1";
  } catch {
    /* treat as unseeded */
  }
  // Seed only an empty library that has never been seeded here, so a meal the
  // lifter deleted on purpose does not come back.
  if (result.meals.length || seeded) return result;
  try {
    localStorage.setItem(SEEDED_KEY, "1");
  } catch {
    /* ignore */
  }
  let latest = result;
  for (const m of STARTER_MEALS) latest = await saveMeal(m);
  return latest;
}

export async function saveMeal(meal: Omit<SavedMeal, "id">): Promise<SavedMealsResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Sign in required");

  const { error } = await supabase
    .from("saved_meals")
    .insert({ user_id: user.id, name: meal.name, meal: meal.meal, items: meal.items });

  if (error) {
    if (!isMissingTable(error.message)) throw new Error(error.message);
    const local = readLocal();
    local.push({ ...meal, id: `local-${Date.now()}` });
    writeLocal(local);
    return { meals: local, deviceOnly: true };
  }
  return fetchAll();
}

export async function deleteSavedMeal(id: string): Promise<SavedMealsResult> {
  if (id.startsWith("local-")) {
    const local = readLocal().filter((m) => m.id !== id);
    writeLocal(local);
    return { meals: local, deviceOnly: true };
  }
  const supabase = createClient();
  const { error } = await supabase.from("saved_meals").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return fetchAll();
}
