import SwiftUI
import SwiftData

enum DailyTracker {
    static func dateKey(for date: Date = .now) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = .current
        return formatter.string(from: date)
    }

    static func todayWaterLog(context: ModelContext, goalOz: Int) -> DailyWaterLog {
        waterLog(context: context, goalOz: goalOz, for: .now)
    }

    static func waterLog(context: ModelContext, goalOz: Int, for date: Date) -> DailyWaterLog {
        let key = dateKey(for: date)
        let descriptor = FetchDescriptor<DailyWaterLog>(
            predicate: #Predicate { $0.dateKey == key }
        )
        if let existing = try? context.fetch(descriptor).first {
            if existing.goalOz != goalOz { existing.goalOz = goalOz }
            return existing
        }
        let log = DailyWaterLog(dateKey: key, goalOz: goalOz)
        context.insert(log)
        try? context.save()
        return log
    }

    static func todayMorningWeight(from logs: [BodyWeightLog]) -> BodyWeightLog? {
        let calendar = Calendar.current
        return logs.first { calendar.isDateInToday($0.loggedAt) }
    }

    static func todayNutritionTotals(from entries: [NutritionEntry]) -> (calories: Int, protein: Int, carbs: Int, fat: Int) {
        let calendar = Calendar.current
        let today = entries.filter { calendar.isDateInToday($0.loggedAt) }
        return (
            today.reduce(0) { $0 + $1.calories },
            today.reduce(0) { $0 + $1.proteinG },
            today.reduce(0) { $0 + $1.carbsG },
            today.reduce(0) { $0 + $1.fatG }
        )
    }
}
