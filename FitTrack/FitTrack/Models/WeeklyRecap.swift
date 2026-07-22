import Foundation

struct WeeklyRecap: Equatable {
    let weekStart: Date
    let weekEnd: Date
    let sessionsDone: Int
    let trainingDaysInWeek: Int
    let prCount: Int
    let avgProteinG: Int?
    let proteinGoalG: Int
    let bestLiftName: String?
    let bestLiftDetail: String?
    let tonnage: Int
    let isWeekendSpotlight: Bool

    var weekLabel: String {
        let start = weekStart.formatted(.dateTime.month(.abbreviated).day())
        let end = weekEnd.formatted(.dateTime.month(.abbreviated).day())
        return "\(start)–\(end)"
    }

    var sessionsLine: String {
        "\(sessionsDone)/\(max(trainingDaysInWeek, 1)) sessions"
    }

    var proteinLine: String? {
        guard let avgProteinG else { return nil }
        return "\(avgProteinG)g avg protein · goal \(proteinGoalG)g"
    }
}

enum WeeklyRecapEngine {
    static func build(
        settings: AppSettings,
        sessions: [WorkoutSession],
        nutritionEntries: [NutritionEntry],
        now: Date = .now
    ) -> WeeklyRecap {
        let cal = Calendar.current
        let weekStart = cal.dateInterval(of: .weekOfYear, for: now)?.start
            ?? cal.startOfDay(for: now)
        let weekEnd = cal.date(byAdding: .day, value: 6, to: weekStart) ?? weekStart

        let completed = sessions.filter { $0.endedAt != nil }
        let weekSessions = completed.filter { session in
            let day = cal.startOfDay(for: session.endedAt ?? session.startedAt)
            return day >= weekStart && day <= weekEnd
        }

        var trainingDays = 0
        for offset in 0..<7 {
            guard let date = cal.date(byAdding: .day, value: offset, to: weekStart) else { continue }
            if WorkoutRotation.scheduledName(on: date, settings: settings) != nil {
                trainingDays += 1
            }
        }

        let prCount = weekSessions.reduce(0) { $0 + $1.prsHit.count }

        let tonnage = weekSessions.reduce(0) { partial, session in
            partial + session.exerciseLogs.reduce(0) { inner, log in
                inner + log.sets.filter(\.isCompleted).reduce(0) { setSum, set in
                    setSum + Int((set.weight * Double(set.reps)).rounded())
                }
            }
        }

        let proteinByDay = proteinTotalsByDay(entries: nutritionEntries, weekStart: weekStart, weekEnd: weekEnd)
        let avgProtein: Int? = {
            guard !proteinByDay.isEmpty else { return nil }
            let sum = proteinByDay.values.reduce(0, +)
            return Int((Double(sum) / Double(proteinByDay.count)).rounded())
        }()

        let (bestName, bestDetail) = bestLift(from: weekSessions)

        let weekday = cal.component(.weekday, from: now) // 1=Sun
        let isWeekendSpotlight = weekday == 1 || weekday >= 6 // Fri–Sun

        return WeeklyRecap(
            weekStart: weekStart,
            weekEnd: weekEnd,
            sessionsDone: weekSessions.count,
            trainingDaysInWeek: max(trainingDays, 1),
            prCount: prCount,
            avgProteinG: avgProtein,
            proteinGoalG: settings.proteinGoalG,
            bestLiftName: bestName,
            bestLiftDetail: bestDetail,
            tonnage: tonnage,
            isWeekendSpotlight: isWeekendSpotlight
        )
    }

    private static func proteinTotalsByDay(
        entries: [NutritionEntry],
        weekStart: Date,
        weekEnd: Date
    ) -> [Date: Int] {
        let cal = Calendar.current
        var map: [Date: Int] = [:]
        for entry in entries {
            let day = cal.startOfDay(for: entry.loggedAt)
            guard day >= weekStart && day <= weekEnd else { continue }
            map[day, default: 0] += entry.proteinG
        }
        return map
    }

    private static func bestLift(from sessions: [WorkoutSession]) -> (String?, String?) {
        // Prefer a PR hit this week if any.
        for session in sessions.sorted(by: { $0.startedAt > $1.startedAt }) {
            if let pr = session.prsHit.first {
                // Find matching set weight if possible.
                if let log = session.exerciseLogs.first(where: { $0.exerciseName == pr }),
                   let top = log.sets.filter(\.isCompleted).max(by: { $0.weight < $1.weight }) {
                    return (pr, "\(WeightFormat.display(top.weight))×\(top.reps) PR")
                }
                return (pr, "PR this week")
            }
        }

        var best: (name: String, weight: Double, reps: Int, e1rm: Double)?
        for session in sessions {
            for log in session.exerciseLogs {
                for set in log.sets where set.isCompleted && set.weight > 0 {
                    let e1rm = WorkoutAnalytics.epleyE1RM(weight: set.weight, reps: set.reps)
                    if let current = best, e1rm <= current.e1rm { continue }
                    best = (log.exerciseName, set.weight, set.reps, e1rm)
                }
            }
        }
        guard let best else { return (nil, nil) }
        return (best.name, "\(WeightFormat.display(best.weight))×\(best.reps)")
    }
}
