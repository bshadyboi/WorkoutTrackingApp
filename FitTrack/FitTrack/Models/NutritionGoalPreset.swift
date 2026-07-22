import Foundation

struct FoodItem: Identifiable, Hashable {
    let id: String
    let name: String
    let brand: String
    let barcode: String?
    let caloriesPer100g: Int
    let proteinPer100g: Double
    let carbsPer100g: Double
    let fatPer100g: Double
    let servingSizeG: Double
    let servingLabel: String
    let isSingleServing: Bool

    init(
        id: String,
        name: String,
        brand: String,
        barcode: String? = nil,
        caloriesPer100g: Int,
        proteinPer100g: Double,
        carbsPer100g: Double,
        fatPer100g: Double,
        servingSizeG: Double = 100,
        servingLabel: String = "100g",
        isSingleServing: Bool = false
    ) {
        self.id = id
        self.name = name
        self.brand = brand
        self.barcode = barcode
        self.caloriesPer100g = caloriesPer100g
        self.proteinPer100g = proteinPer100g
        self.carbsPer100g = carbsPer100g
        self.fatPer100g = fatPer100g
        self.servingSizeG = servingSizeG
        self.servingLabel = servingLabel
        self.isSingleServing = isSingleServing
    }

    /// Per-serving item (restaurants, common portions).
    static func serving(
        id: String,
        name: String,
        brand: String,
        calories: Int,
        protein: Double,
        carbs: Double,
        fat: Double,
        label: String
    ) -> FoodItem {
        FoodItem(
            id: id,
            name: name,
            brand: brand,
            caloriesPer100g: calories,
            proteinPer100g: protein,
            carbsPer100g: carbs,
            fatPer100g: fat,
            servingSizeG: 100,
            servingLabel: label,
            isSingleServing: true
        )
    }

    func macros(forGrams grams: Double) -> (calories: Int, protein: Int, carbs: Int, fat: Int) {
        if isSingleServing {
            return (caloriesPer100g, Int(proteinPer100g.rounded()), Int(carbsPer100g.rounded()), Int(fatPer100g.rounded()))
        }
        let factor = grams / 100.0
        return (
            Int((Double(caloriesPer100g) * factor).rounded()),
            Int((proteinPer100g * factor).rounded()),
            Int((carbsPer100g * factor).rounded()),
            Int((fatPer100g * factor).rounded())
        )
    }

    var defaultServingGrams: Double {
        isSingleServing ? 100 : servingSizeG
    }
}

enum NutritionGoalPreset: String, CaseIterable, Identifiable {
    case cut = "Cut"
    case recomp = "Recomp"
    case maintain = "Maintain"
    case bulk = "Bulk"

    var id: String { rawValue }

    var subtitle: String {
        switch self {
        case .cut: return "Fat loss · higher protein"
        case .recomp: return "Lose fat · gain strength"
        case .maintain: return "Stay steady"
        case .bulk: return "Muscle gain · more calories"
        }
    }

    var calories: Int {
        switch self {
        case .cut: return 2000
        case .recomp: return 2400
        case .maintain: return 2600
        case .bulk: return 3000
        }
    }

    var proteinG: Int {
        switch self {
        case .cut: return 190
        case .recomp: return 180
        case .maintain: return 170
        case .bulk: return 200
        }
    }

    var carbsG: Int {
        switch self {
        case .cut: return 150
        case .recomp: return 220
        case .maintain: return 250
        case .bulk: return 330
        }
    }

    var fatG: Int {
        switch self {
        case .cut: return 65
        case .recomp: return 70
        case .maintain: return 75
        case .bulk: return 85
        }
    }

    func apply(to settings: AppSettings) {
        settings.calorieGoal = calories
        settings.proteinGoalG = proteinG
        settings.carbsGoalG = carbsG
        settings.fatGoalG = fatG
    }
}
