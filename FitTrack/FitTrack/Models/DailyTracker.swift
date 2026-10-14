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

    static func dailyLog(on date: Date, from logs: [DailyLog]) -> DailyLog? {
        let day = Calendar.current.startOfDay(for: date)
        return logs.first { Calendar.current.isDate($0.date, inSameDayAs: day) }
    }

    static func upsertDailyLog(
        context: ModelContext,
        settings: AppSettings,
        on date: Date = .now,
        workoutSession: WorkoutSession? = nil
    ) -> DailyLog {
        let day = Calendar.current.startOfDay(for: date)
        let existing = (try? context.fetch(FetchDescriptor<DailyLog>())) ?? []
        if let found = dailyLog(on: day, from: existing) {
            if found.workoutSession == nil, let workoutSession {
                found.workoutSession = workoutSession
            }
            return found
        }
        let log = DailyLog(
            date: day,
            targetCalories: settings.calorieGoal,
            targetProtein: settings.proteinGoalG,
            targetCarbs: settings.carbsGoalG,
            targetFats: settings.fatGoalG,
            workoutSession: workoutSession
        )
        context.insert(log)
        try? context.save()
        return log
    }
}
