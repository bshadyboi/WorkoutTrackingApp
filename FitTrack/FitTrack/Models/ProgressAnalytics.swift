import Foundation

enum RecompPhase: String {
    case cutting = "Cutting"
    case recomp = "Body Recomp"
    case bulking = "Building"
    case maintaining = "Maintaining"

    var summary: String {
        switch self {
        case .cutting: return "Weight down with strength holding — fat loss focus."
        case .recomp: return "Weight stable while strength climbs — muscle up, fat down."
        case .bulking: return "Weight and strength trending up — growth phase."
        case .maintaining: return "Metrics holding steady — consistency phase."
        }
    }
}

struct RecompMetrics {
    let phase: RecompPhase
    let weightChangeLbs: Double
    let strengthChangePercent: Double
    let bodyFatChange: Double?
    let leanMassChangeLbs: Double?
    let fatMassChangeLbs: Double?
    let dataSource: String
}

enum ProgressAnalytics {
    static func weightChartPoints(from logs: [BodyWeightLog], days: Int = 90) -> [(date: Date, weight: Double)] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: .now) ?? .now
        return logs
            .filter { $0.loggedAt >= cutoff }
            .sorted { $0.loggedAt < $1.loggedAt }
            .map { ($0.loggedAt, $0.weightLbs) }
    }

    static func computeRecomp(
        sessions: [WorkoutSession],
        bodyWeights: [BodyWeightLog],
        dexaScans: [DexaScanLog],
        healthBodyFatPercent: Double?
    ) -> RecompMetrics {
        let completed = sessions.filter { $0.endedAt != nil }
        let sortedWeights = bodyWeights.sorted { $0.loggedAt < $1.loggedAt }

        let weightChange: Double = {
            guard sortedWeights.count >= 2,
                  let first = sortedWeights.first,
                  let last = sortedWeights.last else { return 0 }
            let windowStart = Calendar.current.date(byAdding: .day, value: -56, to: .now) ?? .now
            let recent = sortedWeights.filter { $0.loggedAt >= windowStart }
            guard recent.count >= 2, let rFirst = recent.first, let rLast = recent.last else {
                return last.weightLbs - first.weightLbs
            }
            return rLast.weightLbs - rFirst.weightLbs
        }()

        let strengthChange = strengthIndexChange(from: completed)

        let sortedDexa = dexaScans.sorted { $0.scannedAt < $1.scannedAt }
        var bodyFatChange: Double?
        var leanChange: Double?
        var fatMassChange: Double?
        var source = "Estimated from workouts & weight"

        if sortedDexa.count >= 2, let first = sortedDexa.first, let last = sortedDexa.last {
            bodyFatChange = last.bodyFatPercent - first.bodyFatPercent
            leanChange = last.leanMassLbs - first.leanMassLbs
            fatMassChange = last.fatMassLbs - first.fatMassLbs
            source = "DEXA scan data"
        } else if let latest = sortedDexa.last {
            bodyFatChange = latest.bodyFatPercent > 0 ? nil : nil
            leanChange = latest.leanMassLbs > 0 ? latest.leanMassLbs : nil
            source = "Latest DEXA scan"
            _ = latest
        } else if let bf = healthBodyFatPercent, bf > 0 {
            source = "Apple Health body composition"
            bodyFatChange = nil
        }

        let phase = classifyPhase(
            weightChange: weightChange,
            strengthChange: strengthChange,
            bodyFatChange: bodyFatChange,
            leanChange: leanChange
        )

        return RecompMetrics(
            phase: phase,
            weightChangeLbs: weightChange,
            strengthChangePercent: strengthChange,
            bodyFatChange: bodyFatChange,
            leanMassChangeLbs: leanChange,
            fatMassChangeLbs: fatMassChange,
            dataSource: source
        )
    }

    private static func strengthIndexChange(from sessions: [WorkoutSession]) -> Double {
        let exercises = WorkoutAnalytics.topTrackedExercises(from: sessions)
        guard !exercises.isEmpty else { return 0 }

        let cutoff = Calendar.current.date(byAdding: .day, value: -56, to: .now) ?? .now
        let recent = sessions.filter { ($0.endedAt ?? $0.startedAt) >= cutoff }
        let older = sessions.filter { ($0.endedAt ?? $0.startedAt) < cutoff }

        var changes: [Double] = []
        for exercise in exercises.prefix(3) {
            let recentBest = bestWeight(for: exercise, in: recent)
            let olderBest = bestWeight(for: exercise, in: older)
            guard recentBest > 0, olderBest > 0 else { continue }
            changes.append(((recentBest - olderBest) / olderBest) * 100)
        }

        guard !changes.isEmpty else { return 0 }
        return changes.reduce(0, +) / Double(changes.count)
    }

    private static func bestWeight(for exercise: String, in sessions: [WorkoutSession]) -> Double {
        var best = 0.0
        for session in sessions {
            for log in session.exerciseLogs where log.exerciseName == exercise {
                for set in log.sets where set.isCompleted {
                    best = max(best, Double(set.weight))
                }
            }
        }
        return best
    }

    private static func classifyPhase(
        weightChange: Double,
        strengthChange: Double,
        bodyFatChange: Double?,
        leanChange: Double?
    ) -> RecompPhase {
        if let bf = bodyFatChange, let lean = leanChange {
            if bf < -0.5 && lean > 0.5 { return .recomp }
            if bf < -0.5 { return .cutting }
            if lean > 1 && bf >= 0 { return .bulking }
        }

        if weightChange <= -2 && strengthChange >= -5 { return .cutting }
        if abs(weightChange) < 2 && strengthChange >= 3 { return .recomp }
        if weightChange >= 2 && strengthChange >= 0 { return .bulking }
        return .maintaining
    }
}
