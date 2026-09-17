export type FoodHit = {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingLabel: string;
  source: "mine" | "usda" | "nutritionix" | "openfoodfacts" | "restaurant" | "manual" | "staple";
  barcode?: string;
  imageUrl?: string;
};

/**
 * The lifter's own everyday foods, with the exact macros for the portion they
 * eat. Listed ahead of everything else so an empty search opens on them.
 */
export const STAPLE_FOODS: FoodHit[] = [
  { id: "staple-overnight-oats", name: "Overnight oats", brand: "50g Quaker oats · chia · ISO100 Fruity Pebbles · Silk almond milk · honey", calories: 437, protein: 34, carbs: 59, fat: 10, servingLabel: "1 jar", source: "staple" },
  { id: "staple-cream-of-rice", name: "Cream of Rice", brand: "Huge Supplements", calories: 108, protein: 2, carbs: 25, fat: 0, servingLabel: "1 scoop", source: "staple" },
  { id: "staple-ground-beef-93", name: "Ground beef 93/7", calories: 474, protein: 65.5, carbs: 0, fat: 21.5, servingLabel: "8 oz cooked", source: "staple" },
  { id: "staple-ground-beef-93-1oz", name: "Ground beef 93/7", brand: "1 oz · scale with ×", calories: 59, protein: 8.2, carbs: 0, fat: 2.7, servingLabel: "1 oz cooked", source: "staple" },
  { id: "staple-ground-beef-93-5oz", name: "Ground beef 93/7", brand: "5 oz portion", calories: 296, protein: 41, carbs: 0, fat: 13.4, servingLabel: "5 oz cooked", source: "staple" },
  { id: "staple-bibigo-rice", name: "Sticky Rice bowl", brand: "Bibigo", calories: 290, protein: 6, carbs: 67, fat: 0.5, servingLabel: "210 g", source: "staple" },
  { id: "staple-gold-potato", name: "Gold potato", calories: 164, protein: 4.4, carbs: 37, fat: 0, servingLabel: "1 medium", source: "staple" },
  { id: "staple-quest-chips", name: "Quest chips", brand: "Quest", calories: 140, protein: 19, carbs: 21, fat: 4, servingLabel: "1 bag", source: "staple" },
  { id: "staple-oikos-triple-zero", name: "Triple Zero yogurt", brand: "Oikos", calories: 90, protein: 15, carbs: 7, fat: 0, servingLabel: "1 cup", source: "staple" },
  { id: "staple-banana", name: "Banana", brand: "Medium", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, servingLabel: "1 medium", source: "staple" },
  { id: "staple-nates-honey", name: "Honey", brand: "Nate's", calories: 60, protein: 0, carbs: 17, fat: 0, servingLabel: "1 tbsp", source: "staple" },
];

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
  const pool = [...STAPLE_FOODS, ...RESTAURANT_FOODS];
  if (!q) return pool.slice(0, limit);
  return pool.filter(
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

/**
 * A packaged food's macros, read off the barcode.
 *
 * Two sources, most reliable first: USDA FoodData Central (US branded foods,
 * label-accurate, needs a free key) then Open Food Facts (crowd-sourced, global).
 *
 * Both publish numbers per serving *and* per 100 g, and a product often has one
 * but not the other for a given nutrient. Mixing the two bases silently invents
 * a food — 240 calories per serving next to 25 g of protein per 100 g — so each
 * lookup picks one basis and takes every number from it.
 */
type UsdaFood = Record<string, unknown>;

/** USDA writes branded names in capitals: "KIRKLAND SIGNATURE, CHICKEN BAKES". */
function tidyName(raw: string, brand: string) {
  let name = raw.trim().replace(/\s*,\s*/g, ", ");
  if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
    name = name.slice(brand.length).replace(/^[\s,]+/, "");
  }
  if (name === name.toUpperCase()) {
    name = name
      .toLowerCase()
      .replace(/(^|[\s,(/-])([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase());
  }
  return name || raw.trim();
}

function titleBrand(raw: string) {
  const brand = raw.trim();
  if (brand !== brand.toUpperCase()) return brand;
  return brand
    .toLowerCase()
    .replace(/(^|[\s,(/-])([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase());
}

/**
 * Turn one FoodData Central record into a food, on the label's serving where
 * there is one.
 *
 * Two traps live in this data. Nutrients are listed per 100 g/ml but the list
 * repeats itself on other bases, so only the first appearance of each counts —
 * keeping the last turned a bowl of Cheerios into 23 calories. And serving
 * units arrive as "GRM" / "MLT" as often as "g" / "ml".
 */
function usdaHit(food: UsdaFood, code?: string): FoodHit | null {
  const per100: Record<string, number> = {};
  const keep = (field: string, v: number) => {
    if (Number.isFinite(v) && per100[field] === undefined) per100[field] = v;
  };
  for (const n of (food.foodNutrients as Record<string, unknown>[]) ?? []) {
    const id = Number(n.nutrientId);
    const v = Number(n.value);
    if (id === 1008) keep("calories", v);
    if (id === 1003) keep("protein", v);
    if (id === 1005) keep("carbs", v);
    if (id === 1004) keep("fat", v);
  }
  if (!per100.calories) return null;

  const size = Number(food.servingSize);
  const raw = String(food.servingSizeUnit ?? "").toLowerCase();
  const weighed = raw.startsWith("g") || raw.startsWith("ml") || raw === "grm" || raw === "mlt";
  const scale = Number.isFinite(size) && size > 0 && weighed ? size / 100 : 1;
  const label =
    scale === 1
      ? "100 g"
      : String(
          food.householdServingFullText ||
            `${size} ${raw.startsWith("ml") || raw === "mlt" ? "ml" : "g"}`
        );

  const brand = titleBrand(String(food.brandName || food.brandOwner || ""));
  const barcode = code ?? String(food.gtinUpc ?? "").replace(/^0+/, "") ?? undefined;

  return {
    id: barcode || `usda-${String(food.fdcId ?? Math.random())}`,
    name: tidyName(String(food.description || ""), brand) || "Food",
    brand: brand || undefined,
    calories: Math.round(per100.calories * scale),
    protein: Math.round((per100.protein ?? 0) * scale),
    carbs: Math.round((per100.carbs ?? 0) * scale),
    fat: Math.round((per100.fat ?? 0) * scale),
    servingLabel: label,
    source: "usda",
    barcode: barcode || undefined,
  };
}

async function usdaSearch(params: Record<string, string>): Promise<UsdaFood[]> {
  const key = process.env.USDA_FDC_API_KEY;
  if (!key) return [];
  const query = new URLSearchParams({ ...params, api_key: key });
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${query}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.foods as UsdaFood[]) ?? [];
}

async function lookupUsdaBarcode(code: string): Promise<FoodHit | null> {
  // FoodData Central stores barcodes as 14-digit GTINs and only matches that
  // exact spelling — a scanned 12-digit UPC finds nothing until it is padded.
  const foods = await usdaSearch({
    query: code.padStart(14, "0"),
    dataType: "Branded",
    pageSize: "1",
  });
  const food = foods[0];
  if (!food) return null;
  // The search matches on text too, so make sure we got this exact barcode.
  const gtin = String(food.gtinUpc ?? "").replace(/^0+/, "");
  if (gtin !== code.replace(/^0+/, "")) return null;
  return usdaHit(food, code);
}

/** Branded products by name — the deepest catalogue of US groceries here. */
async function searchUsdaFoods(query: string, limit = 15): Promise<FoodHit[]> {
  // Branded only. The generic tables match loosely on single words — a search
  // for "chicken bake" came back with baked plantains and taco shells, which
  // pushed the actual Costco product off the list.
  const foods = await usdaSearch({
    query,
    dataType: "Branded",
    pageSize: String(limit),
  });
  return foods.map((f) => usdaHit(f)).filter((f): f is FoodHit => f != null);
}

async function lookupOpenFoodFacts(code: string): Promise<FoodHit | null> {
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

  // One basis for all four numbers, never a mix — and only a basis that
  // actually carries the macros. Plenty of products list calories per serving
  // and nothing else, which used to come back as "776 cal, 0g everything".
  const basis = (suffix: "_serving" | "_100g") => {
    const calories =
      suffix === "_serving"
        ? num(n["energy-kcal_serving"])
        : num(n["energy-kcal_100g"]) || Math.round(num(n["energy_100g"]) / 4.184);
    const protein = num(n[`proteins${suffix}`]);
    const carbs = num(n[`carbohydrates${suffix}`]);
    const fat = num(n[`fat${suffix}`]);
    return { calories, protein, carbs, fat, whole: protein + carbs + fat > 0 };
  };

  const perServing = basis("_serving");
  const perHundred = basis("_100g");
  const useServing = perServing.calories > 0 && perServing.whole;
  const picked = useServing ? perServing : perHundred;
  if (!picked.calories || !picked.whole) return null;

  return {
    id: code,
    name,
    brand: p.brands ? String(p.brands).split(",")[0]?.trim() : undefined,
    calories: picked.calories,
    protein: picked.protein,
    carbs: picked.carbs,
    fat: picked.fat,
    servingLabel: useServing ? String(p.serving_size || "1 serving") : "100 g",
    source: "openfoodfacts",
    barcode: code,
    imageUrl: p.image_front_small_url ? String(p.image_front_small_url) : undefined,
  };
}

/**
 * Nutritionix — a commercial catalogue of US branded products, much broader
 * than either free source. Optional: without keys it is simply skipped.
 */
async function lookupNutritionix(code: string): Promise<FoodHit | null> {
  const appId = process.env.NUTRITIONIX_APP_ID;
  const appKey = process.env.NUTRITIONIX_API_KEY;
  if (!appId || !appKey) return null;

  const res = await fetch(
    `https://trackapi.nutritionix.com/v2/search/item?upc=${encodeURIComponent(code)}`,
    { headers: { "x-app-id": appId, "x-app-key": appKey } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const f = data?.foods?.[0] as Record<string, unknown> | undefined;
  if (!f) return null;

  const calories = num(f.nf_calories);
  const protein = num(f.nf_protein);
  const carbs = num(f.nf_total_carbohydrate);
  const fat = num(f.nf_total_fat);
  if (!calories || protein + carbs + fat <= 0) return null;

  // Their numbers are already for one serving, described by these three fields.
  const qty = Number(f.serving_qty);
  const unit = String(f.serving_unit ?? "").trim();
  const grams = Number(f.serving_weight_grams);
  const label = [
    Number.isFinite(qty) && qty > 0 ? `${qty} ${unit}`.trim() : unit,
    Number.isFinite(grams) && grams > 0 ? `(${Math.round(grams)} g)` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: code,
    name: String(f.food_name || "").trim() || "Scanned product",
    brand: f.brand_name ? String(f.brand_name).trim() : undefined,
    calories,
    protein,
    carbs,
    fat,
    servingLabel: label || "1 serving",
    source: "nutritionix",
    barcode: code,
    imageUrl:
      (f.photo as Record<string, unknown> | undefined)?.thumb != null
        ? String((f.photo as Record<string, unknown>).thumb)
        : undefined,
  };
}

export async function lookupBarcode(barcode: string): Promise<FoodHit | null> {
  const code = barcode.trim().replace(/\D/g, "");
  if (!code) return null;
  // Most label-accurate first, broadest last; a source that errors is skipped.
  for (const lookup of [lookupUsdaBarcode, lookupNutritionix, lookupOpenFoodFacts]) {
    try {
      const hit = await lookup(code);
      if (hit) return hit;
    } catch {
      /* try the next source */
    }
  }
  return null;
}

/**
 * Search every catalogue at once: the lifter's own staples first, then USDA's
 * branded data (deepest for US groceries — Kirkland, Great Value and the rest),
 * then Open Food Facts. Duplicates are dropped on brand + name, so the most
 * trustworthy copy of a product is the one shown.
 *
 * Nutritionix is deliberately absent: its search endpoint returns calories
 * without macros, and a food logged as 0 g protein is worse than no result.
 * It still answers barcodes, where the full numbers come back.
 */
export async function searchFoods(query: string): Promise<FoodHit[]> {
  const local = searchLocalFoods(query, 12);
  if (!query.trim()) return local;

  const [usda, off] = await Promise.all([
    searchUsdaFoods(query, 20).catch(() => []),
    searchOpenFoodFacts(query, 12).catch(() => []),
  ]);

  const key = (f: FoodHit) => `${f.brand ?? ""}|${f.name}`.toLowerCase().replace(/\s+/g, " ").trim();
  const seen = new Set(local.map(key));
  const merged = [...local];
  for (const f of [...usda, ...off]) {
    const k = key(f);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(f);
  }
  return merged.slice(0, 30);
}

