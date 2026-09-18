import type { FoodHit } from "@/lib/foods";

/**
 * NT Coaching's meal plan — four meals a day, built from foods Brandon already
 * eats, plus the coach's swap tables.
 *
 * Portions follow the plan sheet, and protein weights there are raw: his "8 oz
 * ground beef ≈ 50 g protein" only works uncooked (8 oz cooked is nearer 65 g).
 * Every entry says raw or cooked so the two never get mixed up with the older
 * cooked-weight staples.
 *
 * Numbers come from the labels and USDA figures for each food, not from the
 * plan's per-meal badges, which are rounded. Where the two disagree the badge
 * is the coach's intent and this is the arithmetic; the difference is small.
 */

export type PlanFood = Omit<FoodHit, "id" | "source"> & { id: string };

function food(
  id: string,
  name: string,
  brand: string,
  servingLabel: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number
): PlanFood {
  return { id, name, brand: brand || undefined, servingLabel, calories, protein, carbs, fat };
}

/** Swap one protein for another — each is about 50 g of protein. */
export const NT_PROTEIN_SWAPS: PlanFood[] = [
  food("nt-beef", "Ground beef 93/7", "NT plan", "8 oz raw", 340, 46, 0, 16),
  food("nt-turkey", "Ground turkey 99/1", "NT plan", "8 oz raw", 240, 52, 0, 3),
  food("nt-chicken", "Chicken breast", "NT plan", "7 oz raw", 238, 45, 0, 5),
  food("nt-salmon", "Salmon", "NT plan", "6 oz raw", 354, 34, 0, 22),
  food("nt-tilapia", "Tilapia", "NT plan", "8 oz raw", 218, 45, 0, 4),
  food("nt-fairlife-whey", "Fairlife shake + ½ scoop whey", "NT plan", "1 + ½", 290, 54, 10, 3),
  food("nt-oikos-whey", "Triple Zero + ½ scoop whey", "NT plan", "2 cups + ½", 240, 42, 16, 1),
];

/** Swap one carb for another — each is about 70 g of carbs. */
export const NT_CARB_SWAPS: PlanFood[] = [
  food("nt-rice", "Cooked rice", "Bibigo", "190 g", 262, 5, 61, 0.5),
  food("nt-cream-rice", "Cream of rice (dry)", "Huge Supplements", "80 g", 291, 7, 65, 0),
  food("nt-potatoes", "Golden potatoes", "NT plan", "320 g", 254, 7, 58, 0),
  food("nt-oats", "Oats (dry)", "NT plan", "75 g", 285, 10, 51, 5),
  food("nt-banana-berries", "Banana + blueberries", "NT plan", "1 + 1 cup", 190, 2, 48, 1),
  food("nt-rice-cakes", "Rice cakes + honey", "NT plan", "5 + 1 tbsp", 235, 2, 55, 0.5),
  food("nt-quest-fruit", "Quest chips + fruit", "NT plan", "1 bag + 1 fruit", 245, 20, 48, 4),
];

export type PlanMeal = {
  id: string;
  name: string;
  slot: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  note: string;
  items: PlanFood[];
  /** Which item can be traded, and for what. */
  swaps?: { itemId: string; kind: "protein" | "carb" }[];
};

export const NT_MEALS: PlanMeal[] = [
  {
    id: "nt-pre",
    name: "Pre-Workout",
    slot: "Snacks",
    note: "30–45 min before you lift — fast carbs, light protein",
    items: [
      food("nt-pre-cakes", "Rice cakes + honey", "NT plan", "4 + 1 tbsp", 200, 2, 46, 0.5),
      food("nt-pre-oj", "Orange juice", "NT plan", "6 oz", 84, 1, 21, 0),
      food("nt-pre-whey", "Whey protein", "NT plan", "½ scoop", 60, 12, 2, 0.5),
    ],
    swaps: [{ itemId: "nt-pre-cakes", kind: "carb" }],
  },
  {
    id: "nt-meal-1",
    name: "Meal 1 — Overnight Oats & Yogurt",
    slot: "Breakfast",
    note: "Oats, milk, chia, protein powder, honey",
    items: [
      food("nt-m1-oats", "Overnight oats", "oats · chia · whey · milk · honey", "1 jar", 437, 34, 59, 10),
      food("nt-m1-oikos", "Triple Zero yogurt", "Oikos", "1 cup", 90, 15, 7, 0),
      food("nt-m1-fruit", "Blueberries + ½ banana", "NT plan", "½ cup + ½", 137, 1, 34, 0.5),
    ],
    swaps: [{ itemId: "nt-m1-fruit", kind: "carb" }],
  },
  {
    id: "nt-meal-2",
    name: "Meal 2 — Beef, Rice & Potatoes",
    slot: "Lunch",
    note: "Weigh the beef raw",
    items: [
      food("nt-m2-beef", "Ground beef 93/7", "NT plan", "8 oz raw", 340, 46, 0, 16),
      food("nt-m2-rice", "Cooked rice", "Bibigo", "150 g", 207, 4, 48, 0.5),
      food("nt-m2-potato", "Golden potatoes", "NT plan", "200 g", 159, 4, 36, 0),
    ],
    swaps: [
      { itemId: "nt-m2-beef", kind: "protein" },
      { itemId: "nt-m2-rice", kind: "carb" },
    ],
  },
  {
    id: "nt-meal-3",
    name: "Meal 3 — Lean Protein & Cream of Rice",
    slot: "Dinner",
    note: "Turkey, or salmon/tilapia if you fancy fish",
    items: [
      food("nt-m3-turkey", "Ground turkey 99/1", "NT plan", "8 oz raw", 240, 52, 0, 3),
      food("nt-m3-cor", "Cream of rice (dry)", "Huge Supplements", "80 g", 291, 7, 65, 0),
      food("nt-m3-fruit", "Banana + blueberries", "NT plan", "1 + ½ cup", 147, 2, 37, 0.5),
    ],
    swaps: [
      { itemId: "nt-m3-turkey", kind: "protein" },
      { itemId: "nt-m3-cor", kind: "carb" },
    ],
  },
];

export function planMealTotals(items: PlanFood[]) {
  return items.reduce(
    (t, i) => ({
      calories: t.calories + i.calories,
      protein: t.protein + i.protein,
      carbs: t.carbs + i.carbs,
      fat: t.fat + i.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
