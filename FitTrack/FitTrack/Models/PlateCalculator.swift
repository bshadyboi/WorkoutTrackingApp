import Foundation

enum PlateCalculator {
    /// Standard gym plates per side (lbs), largest first.
    static let plates: [Double] = [45, 35, 25, 10, 5, 2.5]

    /// Returns plates per side for a barbell load. Assumes 45 lb bar by default.
    static func platesPerSide(totalWeight: Int, barWeight: Int = 45) -> (perSide: [(plate: Double, count: Int)], remainder: Double)? {
        let load = Double(totalWeight - barWeight)
        guard load > 0 else { return nil }
        var remaining = load / 2.0
        var result: [(Double, Int)] = []
        for plate in plates {
            let count = Int(remaining / plate)
            if count > 0 {
                result.append((plate, count))
                remaining -= Double(count) * plate
            }
        }
        // Ignore tiny floating remainder under 0.1
        if remaining < 0.1 { remaining = 0 }
        return (result, remaining)
    }

    static func summary(totalWeight: Int, barWeight: Int = 45) -> String? {
        guard let calc = platesPerSide(totalWeight: totalWeight, barWeight: barWeight) else {
            if totalWeight <= barWeight { return "Bar only (\(barWeight) lb)" }
            return nil
        }
        if calc.perSide.isEmpty { return "Bar only (\(barWeight) lb)" }
        let parts = calc.perSide.map { plate, count in
            count == 1 ? plateString(plate) : "\(count)×\(plateString(plate))"
        }
        var text = "Per side: " + parts.joined(separator: " + ")
        if calc.remainder >= 0.1 {
            text += " · leftover \(String(format: "%.1f", calc.remainder)) lb"
        }
        return text
    }

    private static func plateString(_ plate: Double) -> String {
        plate.truncatingRemainder(dividingBy: 1) == 0 ? "\(Int(plate))" : String(format: "%.1f", plate)
    }
}
