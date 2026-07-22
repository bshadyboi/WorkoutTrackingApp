import Foundation
import SwiftUI

enum MuscleGroup: String, CaseIterable, Identifiable {
    case chest
    case shoulders
    case biceps
    case triceps
    case forearms
    case abs
    case quads
    case hamstrings
    case glutes
    case calves
    case back
    case traps

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .back: return "Back / Lats"
        default: return rawValue.capitalized
        }
    }

    static func from(muscleLabel: String) -> MuscleGroup? {
        let m = muscleLabel.lowercased()
        if m.contains("chest") || m.contains("pec") { return .chest }
        if m.contains("shoulder") || m.contains("delt") { return .shoulders }
        if m.contains("bicep") { return .biceps }
        if m.contains("tricep") { return .triceps }
        if m.contains("forearm") { return .forearms }
        if m.contains("ab") || m.contains("core") { return .abs }
        if m.contains("quad") { return .quads }
        if m.contains("hamstring") { return .hamstrings }
        if m.contains("glute") { return .glutes }
        if m.contains("calf") || m.contains("calves") { return .calves }
        if m.contains("trap") || m.contains("rear delt") { return .traps }
        if m.contains("back") || m.contains("lat") { return .back }
        return nil
    }
}

enum MuscleGrowthTier: Int, CaseIterable, Comparable {
    case beginner = 0
    case novice = 1
    case intermediate = 2
    case advanced = 3
    case elite = 4
    case worldClass = 5

    static func < (lhs: MuscleGrowthTier, rhs: MuscleGrowthTier) -> Bool {
        lhs.rawValue < rhs.rawValue
    }

    var label: String {
        switch self {
        case .beginner: return "Beginner"
        case .novice: return "Novice"
        case .intermediate: return "Intermediate"
        case .advanced: return "Advanced"
        case .elite: return "Elite"
        case .worldClass: return "World Class"
        }
    }

    var color: Color {
        switch self {
        case .beginner: return Color(red: 0.55, green: 0.57, blue: 0.60)
        case .novice: return Color(red: 0.23, green: 0.51, blue: 0.96)
        case .intermediate: return Color(red: 0.13, green: 0.77, blue: 0.37)
        case .advanced: return Color(red: 0.66, green: 0.33, blue: 0.97)
        case .elite: return Color(red: 0.98, green: 0.45, blue: 0.09)
        case .worldClass: return Color(red: 0.94, green: 0.27, blue: 0.27)
        }
    }
}

struct MuscleGroupProgress: Identifiable {
    let group: MuscleGroup
    let tier: MuscleGrowthTier
    let strengthChangePercent: Double
    let recentSessions: Int
    let prCount: Int
    let recentSets: Int

    var id: String { group.id }
}

enum MuscleProgressAnalytics {
    static func progress(
        from sessions: [WorkoutSession],
        physiqueScores: [MuscleGroup: Int] = [:]
    ) -> [MuscleGroupProgress] {
        let completed = sessions.filter { $0.endedAt != nil }
        let cutoff = Calendar.current.date(byAdding: .day, value: -56, to: .now) ?? .now
        let mid = Calendar.current.date(byAdding: .day, value: -28, to: .now) ?? .now

        let recent = completed.filter { ($0.endedAt ?? $0.startedAt) >= mid }
        let older = completed.filter {
            let date = $0.endedAt ?? $0.startedAt
            return date >= cutoff && date < mid
        }

        return MuscleGroup.allCases.map { group in
            let recentBest = bestWeight(for: group, in: recent)
            let olderBest = bestWeight(for: group, in: older)
            let change: Double = {
                guard recentBest > 0, olderBest > 0 else { return recentBest > 0 ? 5 : 0 }
                return ((recentBest - olderBest) / olderBest) * 100
            }()

            let recentSets = setCount(for: group, in: recent)
            let prCount = prCount(for: group, in: recent)
            let sessionCount = sessionCount(for: group, in: recent)

            let workoutTier = classify(
                strengthChange: change,
                recentSets: recentSets,
                prCount: prCount,
                sessionCount: sessionCount
            )
            let photoTier = tier(fromPhysiqueScore: physiqueScores[group] ?? 0)
            let tier = max(workoutTier, photoTier)

            return MuscleGroupProgress(
                group: group,
                tier: tier,
                strengthChangePercent: change,
                recentSessions: sessionCount,
                prCount: prCount,
                recentSets: recentSets
            )
        }
    }

    static func tier(fromPhysiqueScore score: Int) -> MuscleGrowthTier {
        switch score {
        case 81...: return .worldClass
        case 61...80: return .elite
        case 41...60: return .advanced
        case 21...40: return .intermediate
        case 1...20: return .novice
        default: return .beginner
        }
    }

    private static func classify(
        strengthChange: Double,
        recentSets: Int,
        prCount: Int,
        sessionCount: Int
    ) -> MuscleGrowthTier {
        if sessionCount == 0 || recentSets == 0 { return .beginner }
        if prCount >= 2 || strengthChange >= 15 { return .worldClass }
        if prCount >= 1 || strengthChange >= 10 { return .elite }
        if strengthChange >= 5 || recentSets >= 16 { return .advanced }
        if recentSets >= 8 { return .intermediate }
        if sessionCount >= 1 { return .novice }
        return .beginner
    }

    private static func bestWeight(for group: MuscleGroup, in sessions: [WorkoutSession]) -> Double {
        var best = 0.0
        for session in sessions {
            for log in session.exerciseLogs {
                guard MuscleGroup.from(muscleLabel: log.muscle) == group else { continue }
                for set in log.sets where set.isCompleted {
                    best = max(best, Double(set.weight))
                }
            }
        }
        return best
    }

    private static func setCount(for group: MuscleGroup, in sessions: [WorkoutSession]) -> Int {
        sessions.reduce(0) { total, session in
            total + session.exerciseLogs.reduce(0) { inner, log in
                guard MuscleGroup.from(muscleLabel: log.muscle) == group else { return inner }
                return inner + log.sets.filter(\.isCompleted).count
            }
        }
    }

    private static func sessionCount(for group: MuscleGroup, in sessions: [WorkoutSession]) -> Int {
        sessions.filter { session in
            session.exerciseLogs.contains { MuscleGroup.from(muscleLabel: $0.muscle) == group }
        }.count
    }

    private static func prCount(for group: MuscleGroup, in sessions: [WorkoutSession]) -> Int {
        sessions.reduce(0) { total, session in
            let groupPRs = session.exerciseLogs.filter { log in
                MuscleGroup.from(muscleLabel: log.muscle) == group
                    && session.prsHit.contains(log.exerciseName)
            }.count
            return total + groupPRs
        }
    }
}
