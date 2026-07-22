import Foundation

struct MissedDayRecovery: Equatable {
    let missedName: String
    let missedDate: Date
    let missCount: Int
    let recommendation: Recommendation
    let summaryLine: String
    let detailLine: String

    enum Recommendation: Equatable {
        /// Today is free — run the missed session now.
        case doToday
        /// Keep today's plan; slot the miss onto tomorrow.
        case doTomorrow
        /// Swap today's scheduled day for the missed one.
        case swapForToday
        /// Miss is stale — skip it and stay on the rotation.
        case skipAndMoveOn
    }

    var primaryActionTitle: String {
        switch recommendation {
        case .doToday: return "Do \(missedName) today"
        case .doTomorrow: return "Park for tomorrow"
        case .swapForToday: return "Swap in \(missedName)"
        case .skipAndMoveOn: return "Skip \(missedName)"
        }
    }
}

enum MissedDayRecoveryEngine {
    /// Look back this many days for unfinished scheduled sessions.
    private static let lookbackDays = 10
    /// After this many days, prefer skipping instead of stacking debt.
    private static let staleDays = 5

    static func build(
        settings: AppSettings,
        sessions: [WorkoutSession],
        now: Date = .now
    ) -> MissedDayRecovery? {
        let cal = Calendar.current
        let today = cal.startOfDay(for: now)
        let completed = sessions.filter { $0.endedAt != nil }
        let completedDays = Set(completed.map { cal.startOfDay(for: $0.endedAt ?? $0.startedAt) })

        var misses: [(name: String, date: Date)] = []
        for offset in 1...lookbackDays {
            guard let date = cal.date(byAdding: .day, value: -offset, to: today) else { continue }
            let start = cal.startOfDay(for: date)
            guard let name = WorkoutRotation.scheduledName(on: start, settings: settings) else { continue }
            if completedDays.contains(start) { continue }
            if settings.isWorkoutSkipped(on: start) { continue }
            misses.append((name, start))
        }

        guard let latest = misses.first else { return nil }

        let todayName = WorkoutRotation.scheduledName(on: today, settings: settings)
        let alreadyTrainedToday = completedDays.contains(today)
        let ageDays = cal.dateComponents([.day], from: latest.date, to: today).day ?? 0

        let recommendation: MissedDayRecovery.Recommendation
        if ageDays >= staleDays, todayName != nil, !alreadyTrainedToday {
            recommendation = .skipAndMoveOn
        } else if todayName == nil, !alreadyTrainedToday {
            recommendation = .doToday
        } else if alreadyTrainedToday {
            recommendation = .doTomorrow
        } else if todayName != nil {
            // Training day on deck — keep it, offer park-for-tomorrow as primary.
            // Secondary swap is available via the same apply path with .swapForToday from UI if we expose it.
            recommendation = ageDays <= 2 ? .swapForToday : .doTomorrow
        } else {
            recommendation = .doToday
        }

        let dateLabel = latest.date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
        let countNote = misses.count > 1 ? " (\(misses.count) misses in \(lookbackDays)d)" : ""

        let summaryLine: String
        let detailLine: String
        switch recommendation {
        case .doToday:
            summaryLine = "Missed \(latest.name) on \(dateLabel)\(countNote)."
            detailLine = "Today is open — run \(latest.name) now and stay caught up."
        case .doTomorrow:
            summaryLine = "Missed \(latest.name) on \(dateLabel)\(countNote)."
            detailLine = alreadyTrainedToday
                ? "Session already logged today. Park \(latest.name) for tomorrow."
                : "Keep \(todayName ?? "today") as planned. Slot \(latest.name) in tomorrow."
        case .swapForToday:
            summaryLine = "Missed \(latest.name) on \(dateLabel)\(countNote)."
            detailLine = "Fresh miss — swap \(todayName ?? "today") for \(latest.name), then resume the rotation."
        case .skipAndMoveOn:
            summaryLine = "Missed \(latest.name) on \(dateLabel)\(countNote)."
            detailLine = "That one's getting stale. Skip it and stay on today's plan — don't stack debt."
        }

        return MissedDayRecovery(
            missedName: latest.name,
            missedDate: latest.date,
            missCount: misses.count,
            recommendation: recommendation,
            summaryLine: summaryLine,
            detailLine: detailLine
        )
    }

    /// Apply the recommended fix to schedule overrides / skip list.
    @discardableResult
    static func apply(
        _ plan: MissedDayRecovery,
        settings: AppSettings,
        now: Date = .now
    ) -> String? {
        let cal = Calendar.current
        switch plan.recommendation {
        case .doToday, .swapForToday:
            settings.rescheduleWorkout(plan.missedName, from: plan.missedDate, to: now)
            return plan.missedName
        case .doTomorrow:
            guard let tomorrow = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: now)) else {
                return nil
            }
            settings.rescheduleWorkout(plan.missedName, from: plan.missedDate, to: tomorrow)
            return nil
        case .skipAndMoveOn:
            settings.skipWorkout(on: plan.missedDate)
            return nil
        }
    }
}
