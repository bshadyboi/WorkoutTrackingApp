import Foundation

struct PersonalRecordDisplay: Identifiable {
    let id = UUID()
    let lift: String
    let weight: String
    let date: String
    let delta: String
}

struct StrengthDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let weight: Int
}

struct WeeklySummary {
    let sessionCount: Int
    let totalSets: Int
    let prCount: Int
    let streak: Int
}

struct PRAlert: Identifiable, Equatable {
    let id = UUID()
    let exerciseName: String
    let weight: Int
    let reps: Int
}

struct OverloadNudge: Equatable {
    let exerciseName: String
    let fromWeight: Int
    let toWeight: Int
}

enum WorkoutAnalytics {
    static func streak(from sessions: [WorkoutSession]) -> Int {
        let calendar = Calendar.current
        let workoutDays = Set(sessions.compactMap { session -> Date? in
            guard session.endedAt != nil else { return nil }
            return calendar.startOfDay(for: session.startedAt)
        })
        guard !workoutDays.isEmpty else { return 0 }

        var streak = 0
        var day = calendar.startOfDay(for: Date.now)

        if !workoutDays.contains(day) {
            day = calendar.date(byAdding: .day, value: -1, to: day) ?? day
        }

        while workoutDays.contains(day) {
            streak += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: day) else { break }
            day = previous
        }
        return streak
    }

    static func personalRecords(from sessions: [WorkoutSession]) -> [PersonalRecordDisplay] {
        bestWeightByExercise(from: sessions).map { name, value in
            PersonalRecordDisplay(
                lift: name,
                weight: "\(WeightFormat.display(value.weight)) lbs",
                date: value.date.formatted(.dateTime.month(.abbreviated).day()),
                delta: "PR"
            )
        }
        .sorted { lhs, rhs in
            let lw = Int(lhs.weight.filter(\.isNumber)) ?? 0
            let rw = Int(rhs.weight.filter(\.isNumber)) ?? 0
            return lw > rw
        }
        .prefix(6)
        .map { $0 }
    }

    static func bestWeightByExercise(from sessions: [WorkoutSession]) -> [String: (weight: Double, date: Date)] {
        var best: [String: (weight: Double, date: Date)] = [:]
        for session in sessions where session.endedAt != nil {
            for log in session.exerciseLogs {
                let maxWeight = log.sets.filter(\.isCompleted).map(\.weight).max() ?? 0
                guard maxWeight > 0 else { continue }
                if let existing = best[log.exerciseName], maxWeight <= existing.weight { continue }
                best[log.exerciseName] = (maxWeight, session.startedAt)
            }
        }
        return best
    }

    static func lastSessionByExercise(from sessions: [WorkoutSession]) -> [String: String] {
        lastSetsByExercise(from: sessions).reduce(into: [:]) { result, pair in
            guard let first = pair.value.first else { return }
            result[pair.key] = WeightFormat.setLabel(weight: first.weight, reps: first.reps)
        }
    }

    struct PreviousSet: Equatable {
        let weight: Double
        let reps: Int
        let rir: Int?
    }

    static func formatPreviousSets(_ sets: [PreviousSet]) -> String? {
        guard !sets.isEmpty else { return nil }
        return sets.map { WeightFormat.setLabel(weight: $0.weight, reps: $0.reps) }.joined(separator: ", ")
    }

    /// Per-exercise set prescriptions from the most recent session that logged that lift (ordered by set number).
    static func lastSetsByExercise(from sessions: [WorkoutSession]) -> [String: [PreviousSet]] {
        var result: [String: [PreviousSet]] = [:]
        let completed = sessions.filter { $0.endedAt != nil }.sorted { $0.startedAt > $1.startedAt }
        for session in completed {
            for log in session.exerciseLogs {
                guard result[log.exerciseName] == nil else { continue }
                let sets = log.sets
                    .filter(\.isCompleted)
                    .sorted { $0.setNumber < $1.setNumber }
                    .map { PreviousSet(weight: $0.weight, reps: $0.reps, rir: $0.rir) }
                if !sets.isEmpty {
                    result[log.exerciseName] = sets
                }
            }
        }
        return result
    }

    static func isNewPR(exerciseName: String, weight: Int, bestByExercise: [String: Double]) -> Bool {
        guard weight > 0 else { return false }
        return Double(weight) > (bestByExercise[exerciseName] ?? 0)
    }

    static func strengthHistory(for exerciseName: String, sessions: [WorkoutSession]) -> [StrengthDataPoint] {
        sessions
            .filter { $0.endedAt != nil }
            .sorted { $0.startedAt < $1.startedAt }
            .compactMap { session -> StrengthDataPoint? in
                guard let log = session.exerciseLogs.first(where: { $0.exerciseName == exerciseName }) else { return nil }
                let maxWeight = log.sets.filter(\.isCompleted).map(\.weight).max() ?? 0
                guard maxWeight > 0 else { return nil }
                return StrengthDataPoint(date: session.startedAt, weight: Int(maxWeight.rounded()))
            }
    }

    static func topTrackedExercises(from sessions: [WorkoutSession], limit: Int = 5) -> [String] {
        var counts: [String: Int] = [:]
        for session in sessions where session.endedAt != nil {
            for log in session.exerciseLogs {
                counts[log.exerciseName, default: 0] += 1
            }
        }
        return counts.sorted { $0.value > $1.value }.prefix(limit).map(\.key)
    }

    static func weeklySummary(from sessions: [WorkoutSession]) -> WeeklySummary {
        let calendar = Calendar.current
        let weekAgo = calendar.date(byAdding: .day, value: -7, to: .now) ?? .now
        let weekSessions = sessions.filter { ($0.endedAt ?? $0.startedAt) >= weekAgo }
        let totalSets = weekSessions.reduce(0) { $0 + $1.completedSetsCount }
        let prCount = weekSessions.reduce(0) { $0 + $1.prsHit.count }
        return WeeklySummary(
            sessionCount: weekSessions.count,
            totalSets: totalSets,
            prCount: prCount,
            streak: streak(from: sessions)
        )
    }

    static func hasWorkoutThisWeek(from sessions: [WorkoutSession]) -> Bool {
        let calendar = Calendar.current
        guard let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: .now)) else {
            return false
        }
        return sessions.contains { session in
            guard session.endedAt != nil else { return false }
            return session.startedAt >= weekStart
        }
    }

    static func epleyE1RM(weight: Double, reps: Int) -> Double {
        guard weight > 0, reps > 0 else { return 0 }
        if reps == 1 { return weight }
        return weight * (1 + Double(reps) / 30.0)
    }

    static func bestE1RM(in log: ExerciseLog) -> Double {
        log.sets.filter(\.isCompleted).map { epleyE1RM(weight: $0.weight, reps: $0.reps) }.max() ?? 0
    }

    struct LiftProgression: Identifiable {
        let id: String
        let name: String
        let sessions: Int
        let e1RM: Int
        let changePercent: Double
        let status: String
        let stalledWeeks: Int
        let sparkWeights: [Double]
    }

    static func liftProgressions(from sessions: [WorkoutSession], days: Int = 90) -> [LiftProgression] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: .now) ?? .now
        let completed = sessions.filter { ($0.endedAt ?? $0.startedAt) >= cutoff && $0.endedAt != nil }
            .sorted { $0.startedAt < $1.startedAt }

        var byExercise: [String: [(date: Date, e1rm: Double)]] = [:]
        for session in completed {
            for log in session.exerciseLogs {
                let e1 = bestE1RM(in: log)
                guard e1 > 0 else { continue }
                byExercise[log.exerciseName, default: []].append((session.startedAt, e1))
            }
        }

        return byExercise.map { name, points in
            let sorted = points.sorted { $0.date < $1.date }
            let values = sorted.map(\.e1rm)
            let latest = values.last ?? 0
            let change = regressionPercentChange(values)
            let stalledWeeks = weeksSinceLastPR(sorted)
            let status: String = {
                if sorted.count <= 2 { return "New" }
                if stalledWeeks >= 3 { return "Stalled" }
                if change >= 2.5 { return "Progressing" }
                if change <= -2.5 { return "Stalled" }
                return "Maintaining"
            }()
            return LiftProgression(
                id: name,
                name: name,
                sessions: sorted.count,
                e1RM: Int(latest.rounded()),
                changePercent: change,
                status: status,
                stalledWeeks: stalledWeeks,
                sparkWeights: values
            )
        }
        .sorted { $0.changePercent > $1.changePercent }
    }

    /// % change from linear regression trend across sessions (EA-style, not first-vs-last).
    static func regressionPercentChange(_ values: [Double]) -> Double {
        guard values.count >= 2 else { return 0 }
        let n = Double(values.count)
        let xs = values.indices.map(Double.init)
        let sumX = xs.reduce(0, +)
        let sumY = values.reduce(0, +)
        let sumXY = zip(xs, values).map(*).reduce(0, +)
        let sumXX = xs.map { $0 * $0 }.reduce(0, +)
        let denom = n * sumXX - sumX * sumX
        guard denom != 0 else { return 0 }
        let slope = (n * sumXY - sumX * sumY) / denom
        let intercept = (sumY - slope * sumX) / n
        let start = intercept
        let end = intercept + slope * (n - 1)
        guard start > 0 else { return 0 }
        return ((end - start) / start) * 100
    }

    private static func weeksSinceLastPR(_ points: [(date: Date, e1rm: Double)]) -> Int {
        guard let best = points.map(\.e1rm).max(),
              let lastBest = points.last(where: { abs($0.e1rm - best) < 0.5 }) else { return 0 }
        let days = Calendar.current.dateComponents([.day], from: lastBest.date, to: .now).day ?? 0
        return max(0, days / 7)
    }

    static func indexedStrengthSeries(from sessions: [WorkoutSession], days: Int) -> [(date: Date, value: Double)] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: .now) ?? .now
        let completed = sessions.filter { ($0.endedAt ?? $0.startedAt) >= cutoff && $0.endedAt != nil }
            .sorted { $0.startedAt < $1.startedAt }
        guard !completed.isEmpty else { return [] }

        var running: [String: Double] = [:]
        var series: [(Date, Double)] = []

        for session in completed {
            for log in session.exerciseLogs {
                let e1 = bestE1RM(in: log)
                if e1 > 0 { running[log.exerciseName] = e1 }
            }
            guard !running.isEmpty else { continue }
            let avg = running.values.reduce(0, +) / Double(running.count)
            series.append((session.startedAt, avg))
        }

        guard let first = series.first?.1, first > 0 else { return [] }
        return series.map { ($0.0, ($0.1 / first) * 100) }
    }

    static func indexedWeightSeries(from logs: [BodyWeightLog], days: Int) -> [(date: Date, value: Double)] {
        let points = ProgressAnalytics.weightChartPoints(from: logs, days: days)
        guard let first = points.first?.weight, first > 0 else { return [] }
        return points.map { ($0.date, ($0.weight / first) * 100) }
    }

    static func nutritionCompliance(
        entries: [NutritionEntry],
        calorieGoal: Int,
        weekOffset: Int
    ) -> (percent: Int, hit: Int, days: Int) {
        let calendar = Calendar.current
        guard let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: .now)),
              let targetStart = calendar.date(byAdding: .weekOfYear, value: -weekOffset, to: weekStart),
              let targetEnd = calendar.date(byAdding: .day, value: 7, to: targetStart) else {
            return (0, 0, 0)
        }

        var byDay: [Date: Int] = [:]
        for entry in entries {
            guard entry.loggedAt >= targetStart && entry.loggedAt < targetEnd else { continue }
            let day = calendar.startOfDay(for: entry.loggedAt)
            byDay[day, default: 0] += entry.calories
        }

        let today = calendar.startOfDay(for: .now)
        let daysInWindow: Int = {
            if weekOffset == 0 {
                return max(1, (calendar.dateComponents([.day], from: targetStart, to: today).day ?? 0) + 1)
            }
            return 7
        }()

        let tolerance = Double(calorieGoal) * 0.10
        let hit = byDay.values.filter {
            abs(Double($0) - Double(calorieGoal)) <= tolerance
        }.count

        let percent = daysInWindow > 0 ? Int((Double(hit) / Double(daysInWindow) * 100).rounded()) : 0
        return (percent, hit, daysInWindow)
    }

    static func weeklyVolumeByMuscle(from sessions: [WorkoutSession], weekOffset: Int = 0) -> [(muscle: String, tonnage: Int)] {
        let calendar = Calendar.current
        let now = Date.now
        guard let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)),
              let targetStart = calendar.date(byAdding: .weekOfYear, value: -weekOffset, to: weekStart),
              let targetEnd = calendar.date(byAdding: .day, value: 7, to: targetStart) else {
            return []
        }

        let order = ["Chest", "Back", "Shoulders", "Quads", "Hamstrings", "Biceps", "Triceps", "Calves", "Abs", "Other"]
        var totals: [String: Int] = [:]
        for session in sessions where session.endedAt != nil {
            let date = session.endedAt ?? session.startedAt
            guard date >= targetStart && date < targetEnd else { continue }
            for log in session.exerciseLogs {
                let group: String = {
                    guard let g = MuscleGroup.from(muscleLabel: log.muscle) else { return "Other" }
                    switch g {
                    case .back, .traps: return "Back"
                    case .chest: return "Chest"
                    case .shoulders: return "Shoulders"
                    case .quads: return "Quads"
                    case .hamstrings, .glutes: return "Hamstrings"
                    case .biceps: return "Biceps"
                    case .triceps: return "Triceps"
                    case .calves: return "Calves"
                    case .abs: return "Abs"
                    default: return "Other"
                    }
                }()
                let tonnage = log.sets.filter(\.isCompleted).reduce(0.0) { $0 + ($1.weight * Double($1.reps)) }
                totals[group, default: 0] += Int(tonnage.rounded())
            }
        }

        return order.map { ($0, totals[$0] ?? 0) }
    }

    static func sessionsCompleted(inWeekOffset offset: Int, goal: Int = 5, sessions: [WorkoutSession]) -> (done: Int, goal: Int) {
        let calendar = Calendar.current
        guard let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: .now)),
              let targetStart = calendar.date(byAdding: .weekOfYear, value: -offset, to: weekStart),
              let targetEnd = calendar.date(byAdding: .day, value: 7, to: targetStart) else {
            return (0, goal)
        }
        let done = sessions.filter {
            guard $0.endedAt != nil else { return false }
            let d = $0.endedAt ?? $0.startedAt
            return d >= targetStart && d < targetEnd
        }.count
        return (done, goal)
    }

    static func scheduledWorkout(for date: Date, days: [WorkoutDay]) -> WorkoutDay? {
        let weekday = Calendar.current.component(.weekday, from: date)
        return days.first { $0.scheduledWeekdays.contains(weekday) }
    }

    static func workoutDaysInMonth(from sessions: [WorkoutSession], month: Date = .now) -> Set<Int> {
        let calendar = Calendar.current
        return Set(sessions.compactMap { session -> Int? in
            guard session.endedAt != nil else { return nil }
            guard calendar.isDate(session.startedAt, equalTo: month, toGranularity: .month) else { return nil }
            return calendar.component(.day, from: session.startedAt)
        })
    }

    static func energyLabel(_ level: Int) -> String {
        switch level {
        case 1: return "Low"
        case 2: return "OK"
        case 3: return "Great"
        default: return "—"
        }
    }

    static func sorenessLabel(_ level: Int) -> String {
        switch level {
        case 1: return "None"
        case 2: return "Moderate"
        case 3: return "Sore"
        default: return "—"
        }
    }
}

enum WeekdaySchedule {
    static let symbols = ["S", "M", "T", "W", "T", "F", "S"]
    static let fullNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    static func weekdayIndex(for symbolIndex: Int) -> Int {
        symbolIndex + 1
    }
}
