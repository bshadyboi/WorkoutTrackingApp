export type FoodHit = {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingLabel: string;
  source: "openfoodfacts" | "restaurant" | "manual";
  barcode?: string;
  imageUrl?: string;
};

/** Curated restaurant / warehouse / grocery staples Open Food Facts often misses. */
export const RESTAURANT_FOODS: FoodHit[] = [
  // Chipotle
  { id: "chipotle-bowl", name: "Chicken Burrito Bowl", brand: "Chipotle", calories: 640, protein: 52, carbs: 53, fat: 24, servingLabel: "1 bowl", source: "restaurant" },
  { id: "chipotle-steak-bowl", name: "Steak Burrito Bowl", brand: "Chipotle", calories: 670, protein: 50, carbs: 53, fat: 28, servingLabel: "1 bowl", source: "restaurant" },
  { id: "chipotle-carnitas", name: "Carnitas Burrito Bowl", brand: "Chipotle", calories: 710, protein: 45, carbs: 53, fat: 34, servingLabel: "1 bowl", source: "restaurant" },
  { id: "chipotle-barbacoa", name: "Barbacoa Burrito Bowl", brand: "Chipotle", calories: 650, protein: 48, carbs: 53, fat: 26, servingLabel: "1 bowl", source: "restaurant" },
  { id: "chipotle-sofritas", name: "Sofritas Burrito Bowl", brand: "Chipotle", calories: 580, protein: 25, carbs: 60, fat: 26, servingLabel: "1 bowl", source: "restaurant" },
  { id: "chipotle-burrito-chicken", name: "Chicken Burrito", brand: "Chipotle", calories: 1050, protein: 55, carbs: 98, fat: 39, servingLabel: "1 burrito", source: "restaurant" },
  { id: "chipotle-guac", name: "Guacamole (side)", brand: "Chipotle", calories: 230, protein: 2, carbs: 8, fat: 22, servingLabel: "1 side", source: "restaurant" },
  { id: "chipotle-chips", name: "Chips", brand: "Chipotle", calories: 540, protein: 7, carbs: 73, fat: 25, servingLabel: "1 bag", source: "restaurant" },
  { id: "chipotle-chips-guac", name: "Chips & Guacamole", brand: "Chipotle", calories: 770, protein: 9, carbs: 81, fat: 47, servingLabel: "1 order", source: "restaurant" },
  { id: "chipotle-quesadilla", name: "Chicken Quesadilla", brand: "Chipotle", calories: 1060, protein: 58, carbs: 66, fat: 60, servingLabel: "1 quesadilla", source: "restaurant" },
  { id: "chipotle-white-rice", name: "Cilantro-Lime Rice", brand: "Chipotle", calories: 210, protein: 4, carbs: 40, fat: 4, servingLabel: "1 serving", source: "restaurant" },
  { id: "chipotle-black-beans", name: "Black Beans", brand: "Chipotle", calories: 130, protein: 8, carbs: 22, fat: 1, servingLabel: "1 serving", source: "restaurant" },
  { id: "chipotle-chicken", name: "Chicken (portion)", brand: "Chipotle", calories: 180, protein: 32, carbs: 0, fat: 7, servingLabel: "4 oz", source: "restaurant" },

  // Costco
  { id: "costco-chicken-bake", name: "Chicken Bake", brand: "Costco Food Court", calories: 900, protein: 50, carbs: 80, fat: 40, servingLabel: "1 bake", source: "restaurant" },
  { id: "costco-pizza-slice", name: "Cheese Pizza Slice", brand: "Costco Food Court", calories: 710, protein: 33, carbs: 74, fat: 30, servingLabel: "1 slice", source: "restaurant" },
  { id: "costco-pepperoni", name: "Pepperoni Pizza Slice", brand: "Costco Food Court", calories: 750, protein: 34, carbs: 72, fat: 34, servingLabel: "1 slice", source: "restaurant" },
  { id: "costco-hotdog", name: "Hot Dog + Soda Combo", brand: "Costco Food Court", calories: 570, protein: 22, carbs: 55, fat: 33, servingLabel: "1 combo", source: "restaurant" },
  { id: "costco-kirkland-protein", name: "Kirkland Protein Bar", brand: "Costco", calories: 190, protein: 21, carbs: 22, fat: 5, servingLabel: "1 bar", source: "restaurant" },
  { id: "costco-rotisserie", name: "Rotisserie Chicken (breast)", brand: "Costco", calories: 190, protein: 32, carbs: 0, fat: 7, servingLabel: "4 oz", source: "restaurant" },
  { id: "costco-kirkland-eggs", name: "Kirkland Cage-Free Eggs", brand: "Costco", calories: 70, protein: 6, carbs: 0, fat: 5, servingLabel: "1 large", source: "restaurant" },
  { id: "costco-chicken-breast", name: "Kirkland Chicken Breast", brand: "Costco", calories: 110, protein: 23, carbs: 0, fat: 1, servingLabel: "4 oz cooked", source: "restaurant" },
  { id: "costco-greek-yogurt", name: "Kirkland Greek Yogurt", brand: "Costco", calories: 120, protein: 20, carbs: 8, fat: 0, servingLabel: "170g", source: "restaurant" },
  { id: "costco-almonds", name: "Kirkland Almonds", brand: "Costco", calories: 170, protein: 6, carbs: 6, fat: 15, servingLabel: "1 oz", source: "restaurant" },

  // Walmart / Great Value
  { id: "walmart-rotisserie", name: "Rotisserie Chicken (breast)", brand: "Walmart", calories: 180, protein: 28, carbs: 0, fat: 7, servingLabel: "4 oz", source: "restaurant" },
  { id: "walmart-gv-turkey", name: "Great Value Turkey Breast", brand: "Walmart", calories: 50, protein: 10, carbs: 1, fat: 1, servingLabel: "2 oz", source: "restaurant" },
  { id: "walmart-gv-tuna", name: "Great Value Chunk Light Tuna", brand: "Walmart", calories: 70, protein: 16, carbs: 0, fat: 1, servingLabel: "1 can drained", source: "restaurant" },
  { id: "walmart-gv-oats", name: "Great Value Old Fashioned Oats", brand: "Walmart", calories: 150, protein: 5, carbs: 27, fat: 3, servingLabel: "40g dry", source: "restaurant" },
  { id: "walmart-gv-rice", name: "Great Value White Rice", brand: "Walmart", calories: 160, protein: 3, carbs: 36, fat: 0, servingLabel: "1/4 cup dry", source: "restaurant" },
  { id: "walmart-string-cheese", name: "Great Value String Cheese", brand: "Walmart", calories: 80, protein: 7, carbs: 1, fat: 6, servingLabel: "1 stick", source: "restaurant" },
  { id: "walmart-cottage", name: "Great Value Cottage Cheese 2%", brand: "Walmart", calories: 90, protein: 12, carbs: 5, fat: 2, servingLabel: "1/2 cup", source: "restaurant" },
  { id: "walmart-peanut-butter", name: "Great Value Creamy Peanut Butter", brand: "Walmart", calories: 190, protein: 7, carbs: 7, fat: 16, servingLabel: "2 tbsp", source: "restaurant" },
  { id: "walmart-bread", name: "Great Value Whole Wheat Bread", brand: "Walmart", calories: 70, protein: 3, carbs: 13, fat: 1, servingLabel: "1 slice", source: "restaurant" },
  { id: "walmart-banana", name: "Banana", brand: "Walmart Produce", calories: 105, protein: 1, carbs: 27, fat: 0, servingLabel: "1 medium", source: "restaurant" },

  // Fast food / coffee
  { id: "mcdonalds-nuggets", name: "Chicken McNuggets (10 pc)", brand: "McDonald's", calories: 410, protein: 24, carbs: 25, fat: 24, servingLabel: "10 pieces", source: "restaurant" },
  { id: "mcdonalds-bigmac", name: "Big Mac", brand: "McDonald's", calories: 590, protein: 25, carbs: 46, fat: 34, servingLabel: "1 sandwich", source: "restaurant" },
  { id: "mcdonalds-egg-mcmuffin", name: "Egg McMuffin", brand: "McDonald's", calories: 310, protein: 17, carbs: 30, fat: 13, servingLabel: "1 sandwich", source: "restaurant" },
  { id: "chickfila-grill", name: "Grilled Chicken Sandwich", brand: "Chick-fil-A", calories: 320, protein: 28, carbs: 41, fat: 6, servingLabel: "1 sandwich", source: "restaurant" },
  { id: "chickfila-nuggets", name: "Grilled Nuggets (8 ct)", brand: "Chick-fil-A", calories: 130, protein: 25, carbs: 1, fat: 3, servingLabel: "8 pieces", source: "restaurant" },
  { id: "starbucks-protein-box", name: "Eggs & Cheddar Protein Box", brand: "Starbucks", calories: 470, protein: 22, carbs: 40, fat: 25, servingLabel: "1 box", source: "restaurant" },
  { id: "starbucks-sous-vide", name: "Sous Vide Egg Bites Bacon & Gruyère", brand: "Starbucks", calories: 230, protein: 15, carbs: 9, fat: 16, servingLabel: "1 package", source: "restaurant" },
  { id: "panera-fuji", name: "Fuji Apple Chicken Salad", brand: "Panera", calories: 560, protein: 33, carbs: 37, fat: 34, servingLabel: "1 salad", source: "restaurant" },
  { id: "subway-turkey", name: "Turkey Breast Sandwich (6\")", brand: "Subway", calories: 280, protein: 18, carbs: 46, fat: 3.5, servingLabel: "6 inch", source: "restaurant" },

  // Staples
  { id: "greek-yogurt", name: "Nonfat Greek Yogurt", brand: "Generic", calories: 100, protein: 17, carbs: 6, fat: 0, servingLabel: "170g cup", source: "restaurant" },
  { id: "whey-scoop", name: "Whey Protein Scoop", brand: "Generic", calories: 120, protein: 24, carbs: 3, fat: 1, servingLabel: "1 scoop", source: "restaurant" },
  { id: "casein-scoop", name: "Casein Protein Scoop", brand: "Generic", calories: 120, protein: 24, carbs: 3, fat: 1, servingLabel: "1 scoop", source: "restaurant" },
  { id: "rice-cup", name: "White Rice (cooked)", brand: "Generic", calories: 205, protein: 4, carbs: 45, fat: 0, servingLabel: "1 cup", source: "restaurant" },
  { id: "brown-rice", name: "Brown Rice (cooked)", brand: "Generic", calories: 215, protein: 5, carbs: 45, fat: 2, servingLabel: "1 cup", source: "restaurant" },
  { id: "egg-large", name: "Egg (large)", brand: "Generic", calories: 70, protein: 6, carbs: 0, fat: 5, servingLabel: "1 egg", source: "restaurant" },
  { id: "egg-whites", name: "Egg Whites", brand: "Generic", calories: 50, protein: 11, carbs: 1, fat: 0, servingLabel: "1/2 cup", source: "restaurant" },
  { id: "banana", name: "Banana", brand: "Generic", calories: 105, protein: 1, carbs: 27, fat: 0, servingLabel: "1 medium", source: "restaurant" },
  { id: "apple", name: "Apple", brand: "Generic", calories: 95, protein: 0, carbs: 25, fat: 0, servingLabel: "1 medium", source: "restaurant" },
  { id: "olive-oil-tbsp", name: "Olive Oil", brand: "Generic", calories: 120, protein: 0, carbs: 0, fat: 14, servingLabel: "1 tbsp", source: "restaurant" },
  { id: "avocado", name: "Avocado", brand: "Generic", calories: 240, protein: 3, carbs: 12, fat: 22, servingLabel: "1 whole", source: "restaurant" },
  { id: "chicken-breast", name: "Chicken Breast (cooked)", brand: "Generic", calories: 165, protein: 31, carbs: 0, fat: 4, servingLabel: "4 oz", source: "restaurant" },
  { id: "salmon", name: "Salmon (cooked)", brand: "Generic", calories: 230, protein: 25, carbs: 0, fat: 14, servingLabel: "4 oz", source: "restaurant" },
  { id: "sweet-potato", name: "Sweet Potato", brand: "Generic", calories: 115, protein: 2, carbs: 27, fat: 0, servingLabel: "1 medium", source: "restaurant" },
  { id: "broccoli", name: "Broccoli", brand: "Generic", calories: 55, protein: 4, carbs: 11, fat: 0, servingLabel: "1 cup cooked", source: "restaurant" },
  { id: "fairlife-shake", name: "Core Power Elite Protein Shake", brand: "Fairlife", calories: 230, protein: 42, carbs: 8, fat: 2, servingLabel: "14 fl oz", source: "restaurant" },
  { id: "premier-shake", name: "Premier Protein Shake", brand: "Premier Protein", calories: 160, protein: 30, carbs: 4, fat: 3, servingLabel: "11 fl oz", source: "restaurant" },
];

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function searchLocalFoods(query: string, limit = 20): FoodHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return RESTAURANT_FOODS.slice(0, limit);
  return RESTAURANT_FOODS.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      (f.brand ?? "").toLowerCase().includes(q)
  ).slice(0, limit);
}

export async function searchOpenFoodFacts(query: string, limit = 20): Promise<FoodHit[]> {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=${limit}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "FitTrack/1.0 (workout-tracking)" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const products = (data.products ?? []) as Record<string, unknown>[];

  return products
    .map((p): FoodHit | null => {
      const n = p.nutriments as Record<string, unknown> | undefined;
      if (!n) return null;
      const name = String(p.product_name || p.product_name_en || "").trim();
      if (!name) return null;
      const calories =
        num(n["energy-kcal_serving"]) ||
        num(n["energy-kcal_100g"]) ||
        Math.round(num(n.energy_serving) / 4.184) ||
        Math.round(num(n["energy_100g"]) / 4.184);
      return {
        id: String(p.code || p._id || name),
        name,
        brand: p.brands ? String(p.brands).split(",")[0]?.trim() : undefined,
        calories,
        protein: num(n.proteins_serving) || num(n.proteins_100g),
        carbs: num(n.carbohydrates_serving) || num(n.carbohydrates_100g),
        fat: num(n.fat_serving) || num(n.fat_100g),
        servingLabel: String(
          p.serving_size || "100g / per serving (check label)"
        ),
        source: "openfoodfacts",
        barcode: p.code ? String(p.code) : undefined,
        imageUrl: p.image_front_small_url
          ? String(p.image_front_small_url)
          : undefined,
      };
    })
    .filter((x): x is FoodHit => x != null && x.calories > 0)
    .slice(0, limit);
}

export async function lookupBarcode(barcode: string): Promise<FoodHit | null> {
  const code = barcode.trim();
  if (!code) return null;
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
    { headers: { "User-Agent": "FitTrack/1.0 (workout-tracking)" } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product as Record<string, unknown>;
  const n = p.nutriments as Record<string, unknown> | undefined;
  if (!n) return null;
  const name = String(p.product_name || "").trim();
  if (!name) return null;
  return {
    id: code,
    name,
    brand: p.brands ? String(p.brands).split(",")[0]?.trim() : undefined,
    calories:
      num(n["energy-kcal_serving"]) ||
      num(n["energy-kcal_100g"]) ||
      Math.round(num(n["energy_100g"]) / 4.184),
    protein: num(n.proteins_serving) || num(n.proteins_100g),
    carbs: num(n.carbohydrates_serving) || num(n.carbohydrates_100g),
    fat: num(n.fat_serving) || num(n.fat_100g),
    servingLabel: String(p.serving_size || "1 serving"),
    source: "openfoodfacts",
    barcode: code,
    imageUrl: p.image_front_small_url
      ? String(p.image_front_small_url)
      : undefined,
  };
}

export async function searchFoods(query: string): Promise<FoodHit[]> {
  const local = searchLocalFoods(query, 12);
  if (!query.trim()) return local;
  try {
    const remote = await searchOpenFoodFacts(query, 15);
    const seen = new Set(local.map((f) => f.name.toLowerCase()));
    const merged = [...local];
    for (const f of remote) {
      const k = f.name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(f);
    }
    return merged.slice(0, 25);
  } catch {
    return local;
  }
}
