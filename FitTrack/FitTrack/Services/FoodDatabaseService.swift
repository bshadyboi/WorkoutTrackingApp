import Foundation

enum FoodDatabaseService {
    static func search(query: String) async throws -> [FoodItem] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }

        var results: [FoodItem] = LocalFoodCatalog.search(trimmed)
        var seen = Set(results.map(\.id))

        if let online = try? await searchOpenFoodFacts(trimmed) {
            for item in online where !seen.contains(item.id) {
                results.append(item)
                seen.insert(item.id)
            }
        }

        return Array(results.prefix(25))
    }

    static func lookupBarcode(_ code: String) async throws -> FoodItem? {
        let sanitized = code.filter(\.isNumber)
        guard !sanitized.isEmpty else { return nil }

        if let url = URL(string: "https://us.openfoodfacts.org/api/v2/product/\(sanitized).json") {
            if let item = try? await fetchProduct(from: url) { return item }
        }
        if let url = URL(string: "https://world.openfoodfacts.org/api/v2/product/\(sanitized).json") {
            return try await fetchProduct(from: url)
        }
        return nil
    }

    private static func searchOpenFoodFacts(_ query: String) async throws -> [FoodItem] {
        var components = URLComponents(string: "https://us.openfoodfacts.org/cgi/search.pl")!
        components.queryItems = [
            URLQueryItem(name: "search_terms", value: query),
            URLQueryItem(name: "search_simple", value: "1"),
            URLQueryItem(name: "action", value: "process"),
            URLQueryItem(name: "json", value: "1"),
            URLQueryItem(name: "page_size", value: "15"),
            URLQueryItem(name: "lc", value: "en"),
            URLQueryItem(name: "tagtype_0", value: "countries"),
            URLQueryItem(name: "tag_contains_0", value: "contains"),
            URLQueryItem(name: "tag_0", value: "en:united-states"),
        ]
        guard let url = components.url else { return [] }

        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(OFFSearchResponse.self, from: data)
        return response.products.compactMap { parseProduct($0) }
    }

    private static func fetchProduct(from url: URL) async throws -> FoodItem? {
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(OFFProductResponse.self, from: data)
        guard response.status == 1, let product = response.product else { return nil }
        return parseProduct(product)
    }

    private static func parseProduct(_ product: OFFProduct) -> FoodItem? {
        let name = englishName(from: product)
        guard !name.isEmpty else { return nil }

        let nutriments = product.nutriments ?? OFFNutriments()
        let calories = Int((nutriments.energyKcal100g ?? nutriments.energy100g.map { $0 / 4.184 } ?? 0).rounded())
        guard calories > 0 else { return nil }

        let protein = nutriments.proteins100g ?? 0
        let carbs = nutriments.carbohydrates100g ?? 0
        let fat = nutriments.fat100g ?? 0
        let serving = product.serving_quantity ?? 100

        return FoodItem(
            id: product.code ?? UUID().uuidString,
            name: name,
            brand: englishBrand(from: product),
            barcode: product.code,
            caloriesPer100g: calories,
            proteinPer100g: protein,
            carbsPer100g: carbs,
            fatPer100g: fat,
            servingSizeG: serving > 0 ? serving : 100,
            servingLabel: product.serving_size ?? "100g"
        )
    }

    private static func englishName(from product: OFFProduct) -> String {
        if let en = product.product_name_en?.trimmingCharacters(in: .whitespacesAndNewlines), !en.isEmpty {
            return en
        }
        if let name = product.product_name?.trimmingCharacters(in: .whitespacesAndNewlines), isMostlyEnglish(name) {
            return name
        }
        return ""
    }

    private static func englishBrand(from product: OFFProduct) -> String {
        let brand = product.brands ?? "Packaged Food"
        return isMostlyEnglish(brand) ? brand : "Packaged Food"
    }

    private static func isMostlyEnglish(_ text: String) -> Bool {
        let letters = text.filter(\.isLetter)
        guard !letters.isEmpty else { return false }
        let ascii = letters.filter { $0.isASCII && $0.isLetter }.count
        return Double(ascii) / Double(letters.count) > 0.8
    }
}

private struct OFFSearchResponse: Decodable {
    let products: [OFFProduct]
}

private struct OFFProductResponse: Decodable {
    let status: Int
    let product: OFFProduct?
}

private struct OFFProduct: Decodable {
    let code: String?
    let product_name: String?
    let product_name_en: String?
    let brands: String?
    let serving_quantity: Double?
    let serving_size: String?
    let nutriments: OFFNutriments?
}

private struct OFFNutriments: Decodable {
    let energyKcal100g: Double?
    let energy100g: Double?
    let proteins100g: Double?
    let carbohydrates100g: Double?
    let fat100g: Double?

    enum CodingKeys: String, CodingKey {
        case energyKcal100g = "energy-kcal_100g"
        case energy100g = "energy_100g"
        case proteins100g = "proteins_100g"
        case carbohydrates100g = "carbohydrates_100g"
        case fat100g = "fat_100g"
    }

    init(
        energyKcal100g: Double? = nil,
        energy100g: Double? = nil,
        proteins100g: Double? = nil,
        carbohydrates100g: Double? = nil,
        fat100g: Double? = nil
    ) {
        self.energyKcal100g = energyKcal100g
        self.energy100g = energy100g
        self.proteins100g = proteins100g
        self.carbohydrates100g = carbohydrates100g
        self.fat100g = fat100g
    }
}
