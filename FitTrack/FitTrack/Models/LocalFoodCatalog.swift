import Foundation

enum LocalFoodCatalog {
    static let all: [FoodItem] = staples + proteins + carbs + restaurants + fastFood + coffeeShops + snacks

    static func search(_ query: String) -> [FoodItem] {
        let q = query.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return [] }
        return all.filter { item in
            item.name.lowercased().contains(q)
                || item.brand.lowercased().contains(q)
                || q.split(separator: " ").allSatisfy { token in
                    item.name.lowercased().contains(token)
                        || item.brand.lowercased().contains(token)
                }
        }
    }

    static func matchFromText(_ text: String) -> [FoodItem] {
        let lowered = text.lowercased()
        var scored: [(FoodItem, Int)] = []
        for item in all {
            var score = 0
            let nameTokens = item.name.lowercased().split(separator: " ")
            for token in nameTokens where token.count > 2 && lowered.contains(token) {
                score += token.count > 4 ? 3 : 2
            }
            let brand = item.brand.lowercased()
            if brand.count > 2 && lowered.contains(brand) { score += 5 }
            // Common OCR aliases
            if item.name.lowercased().contains("chicken") && lowered.contains("chicken") { score += 2 }
            if item.name.lowercased().contains("rice") && lowered.contains("rice") { score += 2 }
            if score > 0 { scored.append((item, score)) }
        }
        return scored.sorted { $0.1 > $1.1 }.prefix(12).map(\.0)
    }

    private static let staples: [FoodItem] = [
        item("staple-chicken", "Chicken Breast", "Fresh", 165, 31, 0, 3.6, 170, "6 oz cooked"),
        item("staple-chicken-thigh", "Chicken Thigh", "Skinless", 209, 26, 0, 10.9, 113, "4 oz cooked"),
        item("staple-turkey", "Ground Turkey 93/7", "Fresh", 170, 22, 0, 8, 113, "4 oz cooked"),
        item("staple-rice", "White Rice", "Cooked", 206, 4.3, 45, 0.4, 158, "1 cup"),
        item("staple-brown-rice", "Brown Rice", "Cooked", 215, 5, 45, 1.6, 195, "1 cup"),
        item("staple-eggs", "Large Eggs", "Whole", 143, 12.6, 0.7, 9.5, 100, "2 eggs"),
        item("staple-egg-whites", "Egg Whites", "Carton", 52, 11, 0.7, 0.2, 122, "1/2 cup"),
        item("staple-oats", "Oatmeal", "Dry", 389, 16.9, 66, 6.9, 40, "1/2 cup dry"),
        item("staple-banana", "Banana", "Fresh", 89, 1.1, 23, 0.3, 118, "1 medium"),
        item("staple-apple", "Apple", "Fresh", 95, 0.5, 25, 0.3, 182, "1 medium"),
        item("staple-salmon", "Salmon Fillet", "Fresh", 208, 20, 0, 13, 170, "6 oz"),
        item("staple-ground-beef", "Ground Beef 90/10", "Fresh", 250, 26, 0, 15, 113, "4 oz cooked"),
        item("staple-greek-yogurt", "Greek Yogurt", "Nonfat", 59, 10, 3.6, 0.4, 170, "3/4 cup"),
        item("staple-cottage", "Cottage Cheese", "Lowfat 2%", 90, 13, 5, 2.5, 113, "1/2 cup"),
        item("staple-almonds", "Almonds", "Raw", 579, 21, 22, 50, 28, "1 oz"),
        item("staple-protein-shake", "Whey Protein Shake", "Supplement", 120, 24, 3, 1.5, 330, "1 scoop + water"),
        item("staple-casein", "Casein Shake", "Supplement", 120, 24, 3, 1, 330, "1 scoop + water"),
        item("staple-avocado", "Avocado", "Fresh", 160, 2, 9, 15, 68, "1/2 avocado"),
        item("staple-sweet-potato", "Sweet Potato", "Baked", 103, 2.3, 24, 0.1, 130, "1 medium"),
        item("staple-broccoli", "Broccoli", "Steamed", 55, 3.7, 11, 0.6, 156, "1 cup"),
        item("staple-spinach", "Spinach", "Raw", 7, 0.9, 1.1, 0.1, 30, "1 cup"),
        item("staple-tuna", "Tuna", "Canned in water", 132, 28, 0, 1, 85, "1 can drained"),
        item("staple-pasta", "Pasta", "Cooked", 157, 5.8, 30, 0.9, 140, "1 cup"),
        item("staple-olive-oil", "Olive Oil", "Extra Virgin", 119, 0, 0, 14, 14, "1 tbsp"),
        item("staple-pb", "Peanut Butter", "Natural", 190, 8, 6, 16, 32, "2 tbsp"),
        item("staple-bread", "Sourdough Slice", "Bakery", 120, 4, 22, 1.5, 40, "1 slice"),
        item("staple-tortilla", "Flour Tortilla", "Mission", 140, 4, 24, 3.5, 49, "1 medium"),
        item("staple-milk", "Fairlife Milk", "2%", 130, 13, 6, 4.5, 240, "1 cup"),
        item("staple-creatine", "Creatine", "Supplement", 0, 0, 0, 0, 5, "5g"),
    ]

    private static let proteins: [FoodItem] = [
        item("prot-shrimp", "Shrimp", "Cooked", 99, 24, 0.2, 0.3, 100, "3.5 oz"),
        item("prot-cod", "Cod Fillet", "Baked", 105, 23, 0, 0.9, 113, "4 oz"),
        item("prot-sirloin", "Sirloin Steak", "Grilled", 243, 26, 0, 14, 113, "4 oz"),
        item("prot-pork", "Pork Tenderloin", "Roasted", 143, 26, 0, 3.5, 113, "4 oz"),
        item("prot-tofu", "Firm Tofu", "Extra Firm", 144, 17, 3, 9, 126, "1/2 block"),
        .serving(id: "prot-premier", name: "Premier Protein Shake", brand: "Premier Protein", calories: 160, protein: 30, carbs: 4, fat: 3, label: "1 bottle"),
        .serving(id: "prot-fairlife-core", name: "Core Power Elite", brand: "Fairlife", calories: 230, protein: 42, carbs: 6, fat: 4.5, label: "14 oz"),
        .serving(id: "prot-quest-bar", name: "Quest Bar", brand: "Quest", calories: 200, protein: 21, carbs: 22, fat: 8, label: "1 bar"),
    ]

    private static let carbs: [FoodItem] = [
        item("carb-quinoa", "Quinoa", "Cooked", 222, 8, 39, 3.6, 185, "1 cup"),
        item("carb-potato", "Russet Potato", "Baked", 161, 4.3, 37, 0.2, 173, "1 medium"),
        item("carb-bagel", "Everything Bagel", "Bakery", 290, 11, 56, 2, 105, "1 bagel"),
        item("carb-rice-cakes", "Rice Cakes", "Plain", 35, 0.7, 7, 0.3, 9, "1 cake"),
        item("carb-berries", "Mixed Berries", "Fresh", 70, 1, 17, 0.5, 140, "1 cup"),
        .serving(id: "carb-granola", name: "Granola", brand: "Generic", calories: 230, protein: 6, carbs: 32, fat: 9, label: "1/2 cup"),
    ]

    private static let restaurants: [FoodItem] = [
        .serving(id: "chipotle-bowl", name: "Chicken Bowl", brand: "Chipotle", calories: 665, protein: 42, carbs: 62, fat: 23, label: "1 bowl"),
        .serving(id: "chipotle-steak", name: "Steak Bowl", brand: "Chipotle", calories: 710, protein: 40, carbs: 65, fat: 28, label: "1 bowl"),
        .serving(id: "chipotle-burrito", name: "Chicken Burrito", brand: "Chipotle", calories: 970, protein: 62, carbs: 98, fat: 34, label: "1 burrito"),
        .serving(id: "chipotle-salad", name: "Chicken Salad", brand: "Chipotle", calories: 500, protein: 40, carbs: 21, fat: 28, label: "1 salad"),
        .serving(id: "cfa-sandwich", name: "Chicken Sandwich", brand: "Chick-fil-A", calories: 440, protein: 28, carbs: 41, fat: 18, label: "1 sandwich"),
        .serving(id: "cfa-nuggets", name: "8pc Nuggets", brand: "Chick-fil-A", calories: 250, protein: 27, carbs: 11, fat: 11, label: "8 piece"),
        .serving(id: "cfa-grill-nuggets", name: "8pc Grilled Nuggets", brand: "Chick-fil-A", calories: 130, protein: 25, carbs: 1, fat: 3, label: "8 piece"),
        .serving(id: "panda-orange", name: "Orange Chicken Plate", brand: "Panda Express", calories: 490, protein: 25, carbs: 65, fat: 16, label: "1 plate"),
        .serving(id: "sub-turkey", name: "Turkey Footlong", brand: "Subway", calories: 560, protein: 36, carbs: 78, fat: 12, label: "footlong"),
        .serving(id: "inout-double", name: "Double-Double", brand: "In-N-Out", calories: 670, protein: 37, carbs: 39, fat: 41, label: "1 burger"),
        .serving(id: "inout-protein", name: "Protein Style Double", brand: "In-N-Out", calories: 520, protein: 33, carbs: 11, fat: 39, label: "1 burger"),
        .serving(id: "taco-crunchwrap", name: "Crunchwrap Supreme", brand: "Taco Bell", calories: 530, protein: 16, carbs: 47, fat: 31, label: "1 item"),
        .serving(id: "generic-burger-fries", name: "Burger & Fries", brand: "Restaurant", calories: 980, protein: 35, carbs: 95, fat: 48, label: "1 meal"),
        .serving(id: "generic-sushi", name: "Sushi Roll Order", brand: "Restaurant", calories: 450, protein: 18, carbs: 64, fat: 12, label: "8 pieces"),
        .serving(id: "generic-steak-meal", name: "Steak & Vegetables", brand: "Restaurant", calories: 620, protein: 48, carbs: 28, fat: 32, label: "1 entree"),
        .serving(id: "generic-caesar", name: "Caesar Salad w/ Chicken", brand: "Restaurant", calories: 520, protein: 38, carbs: 18, fat: 32, label: "1 salad"),
        .serving(id: "generic-pizza", name: "Pizza Slice", brand: "Restaurant", calories: 285, protein: 12, carbs: 36, fat: 10, label: "1 slice"),
        .serving(id: "poke-bowl", name: "Poke Bowl", brand: "Restaurant", calories: 550, protein: 32, carbs: 55, fat: 18, label: "1 bowl"),
        .serving(id: "pho-bowl", name: "Chicken Pho", brand: "Restaurant", calories: 450, protein: 30, carbs: 55, fat: 10, label: "1 bowl"),
    ]

    private static let fastFood: [FoodItem] = [
        .serving(id: "mcd-bigmac", name: "Big Mac", brand: "McDonald's", calories: 590, protein: 25, carbs: 46, fat: 34, label: "1 burger"),
        .serving(id: "mcd-mcchicken", name: "McChicken", brand: "McDonald's", calories: 400, protein: 14, carbs: 39, fat: 21, label: "1 sandwich"),
        .serving(id: "mcd-nuggets", name: "10pc McNuggets", brand: "McDonald's", calories: 420, protein: 23, carbs: 26, fat: 25, label: "10 piece"),
        .serving(id: "wendys-daves", name: "Dave's Single", brand: "Wendy's", calories: 590, protein: 29, carbs: 39, fat: 34, label: "1 burger"),
        .serving(id: "bk-whopper", name: "Whopper", brand: "Burger King", calories: 657, protein: 28, carbs: 49, fat: 40, label: "1 burger"),
        .serving(id: "fiveguys-burger", name: "Cheeseburger", brand: "Five Guys", calories: 840, protein: 47, carbs: 40, fat: 55, label: "1 burger"),
    ]

    private static let coffeeShops: [FoodItem] = [
        .serving(id: "sbux-latte", name: "Grande Latte", brand: "Starbucks", calories: 190, protein: 13, carbs: 18, fat: 7, label: "16 oz"),
        .serving(id: "sbux-americano", name: "Grande Americano", brand: "Starbucks", calories: 15, protein: 1, carbs: 2, fat: 0, label: "16 oz"),
        .serving(id: "sbux-protein", name: "Protein Box", brand: "Starbucks", calories: 470, protein: 26, carbs: 39, fat: 23, label: "1 box"),
        .serving(id: "sbux-oatmeal", name: "Classic Oatmeal", brand: "Starbucks", calories: 160, protein: 5, carbs: 28, fat: 2.5, label: "1 bowl"),
        .serving(id: "dunkin-avocado", name: "Avocado Toast", brand: "Dunkin'", calories: 240, protein: 6, carbs: 23, fat: 14, label: "1 toast"),
    ]

    private static let snacks: [FoodItem] = [
        .serving(id: "snack-jerky", name: "Beef Jerky", brand: "Generic", calories: 80, protein: 13, carbs: 3, fat: 1.5, label: "1 oz"),
        .serving(id: "snack-string", name: "String Cheese", brand: "Generic", calories: 80, protein: 7, carbs: 1, fat: 6, label: "1 stick"),
        .serving(id: "snack-rice-krisp", name: "Rice Krispies Treat", brand: "Kellogg's", calories: 90, protein: 1, carbs: 17, fat: 2, label: "1 bar"),
        .serving(id: "snack-kind", name: "KIND Bar", brand: "KIND", calories: 200, protein: 6, carbs: 16, fat: 15, label: "1 bar"),
        .serving(id: "snack-chobani", name: "Chobani Flip", brand: "Chobani", calories: 190, protein: 11, carbs: 24, fat: 5, label: "1 cup"),
    ]

    private static func item(
        _ id: String, _ name: String, _ brand: String,
        _ cal: Double, _ p: Double, _ c: Double, _ f: Double,
        _ grams: Double, _ label: String
    ) -> FoodItem {
        FoodItem(
            id: id,
            name: name,
            brand: brand,
            caloriesPer100g: Int((cal * 100 / grams).rounded()),
            proteinPer100g: p * 100 / grams,
            carbsPer100g: c * 100 / grams,
            fatPer100g: f * 100 / grams,
            servingSizeG: grams,
            servingLabel: label
        )
    }
}
