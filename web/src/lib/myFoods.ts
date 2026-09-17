import { createClient } from "@/lib/supabase/client";
import type { FoodHit } from "@/lib/foods";

/**
 * Foods the lifter has checked against the packet themselves.
 *
 * A scanned barcode is looked up here first: once a product's numbers have
 * been confirmed, no database gets a second chance to be wrong about it.
 */

export type MyFood = {
  barcode: string;
  name: string;
  brand: string;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** The table ships as schema_my_foods.sql and is run by hand in Supabase. */
function tableMissing(message?: string) {
  return /my_foods|does not exist|schema cache/i.test(message ?? "");
}

export async function getMyFood(barcode: string): Promise<FoodHit | null> {
  const code = barcode.trim();
  if (!code) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("my_foods")
    .select("barcode, name, brand, serving_label, calories, protein, carbs, fat")
    .eq("barcode", code)
    .maybeSingle();

  if (error || !data) {
    if (error && !tableMissing(error.message)) console.warn(error.message);
    return null;
  }
  return {
    id: `mine-${data.barcode}`,
    name: data.name,
    brand: data.brand || undefined,
    calories: Number(data.calories),
    protein: Number(data.protein),
    carbs: Number(data.carbs),
    fat: Number(data.fat),
    servingLabel: data.serving_label || "1 serving",
    source: "mine",
    barcode: data.barcode,
  };
}

/** Save (or correct) a product's numbers. Returns an error message, or null. */
export async function saveMyFood(food: MyFood): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not signed in";

  const { error } = await supabase.from("my_foods").upsert(
    {
      user_id: user.id,
      barcode: food.barcode,
      name: food.name,
      brand: food.brand,
      serving_label: food.servingLabel,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,barcode" }
  );

  if (!error) return null;
  return tableMissing(error.message)
    ? "Run schema_my_foods.sql in Supabase to save your own foods."
    : error.message;
}
