import Foundation

/// A single, tasteful progression number that reflects real training work —
/// not XP grinding. Built entirely from signals the app already tracks.
struct AthleteLevel: Equatable {
    let level: Int
    let title: String
    let flavor: String
    let totalXP: Int
    /// XP accumulated within the current level.
    let xpIntoLevel: Int
    /// XP required to advance from the current level to the next.
    let xpForNextLevel: Int
    /// 0...1 progress toward the next level.
    let progress: Double
    let nextTitle: String

    var progressPercent: Int { Int((progress * 100).rounded()) }
    var xpToGo: Int { max(0, xpForNextLevel - xpIntoLevel) }
}

enum AthleteLevelEngine {
    /// Raw signals pulled from lifetime training history.
    struct Signals: Equatable {
        var sessions: Int
        var totalSets: Int
        var prCount: Int
        var streak: Int
        /// 0...1 overall protocol adherence.
        var adherence: Double
    }

    // MARK: - XP weighting (grounded in real work, mostly cumulative)

    private static let xpPerSession = 12
    private static let xpPerSet = 1
    private static let xpPerPR = 30
    private static let xpPerStreakDay = 6
    private static let streakCap = 14
    private static let maxAdherenceBonus = 60

    static func signals(from sessions: [WorkoutSession], adherence: Double) -> Signals {
        let completed = sessions.filter { $0.endedAt != nil }
        let totalSets = completed.reduce(0) { $0 + $1.completedSetsCount }
        let prCount = completed.reduce(0) { $0 + $1.prsHit.count }
        return Signals(
            sessions: completed.count,
            totalSets: totalSets,
            prCount: prCount,
            streak: WorkoutAnalytics.streak(from: completed),
            adherence: max(0, min(1, adherence))
        )
    }

    static func totalXP(from s: Signals) -> Int {
        let base = s.sessions * xpPerSession
            + s.totalSets * xpPerSet
            + s.prCount * xpPerPR
        let streakBonus = min(s.streak, streakCap) * xpPerStreakDay
        let adherenceBonus = Int((s.adherence * Double(maxAdherenceBonus)).rounded())
        return base + streakBonus + adherenceBonus
    }

    /// XP required to advance FROM `level` to `level + 1`. Ramps up gently.
    static func cost(forLevel level: Int) -> Int {
        120 + max(0, level - 1) * 45
    }

    static func compute(from sessions: [WorkoutSession], adherence: Double) -> AthleteLevel {
        compute(signals: signals(from: sessions, adherence: adherence))
    }

    static func compute(signals s: Signals) -> AthleteLevel {
        let xp = totalXP(from: s)

        var level = 1
        var remaining = xp
        while remaining >= cost(forLevel: level) {
            remaining -= cost(forLevel: level)
            level += 1
        }

        let needed = cost(forLevel: level)
        let progress = needed > 0 ? Double(remaining) / Double(needed) : 0

        return AthleteLevel(
            level: level,
            title: title(for: level),
            flavor: flavor(for: level, signals: s),
            totalXP: xp,
            xpIntoLevel: remaining,
            xpForNextLevel: needed,
            progress: max(0, min(1, progress)),
            nextTitle: title(for: level + 1)
        )
    }

    // MARK: - Titles

    static func title(for level: Int) -> String {
        switch level {
        case ..<4: return "Rookie"
        case 4..<8: return "Consistent"
        case 8..<13: return "Grinder"
        case 13..<19: return "Savage"
        case 19..<26: return "Elite"
        default: return "Legend"
        }
    }

    private static func flavor(for level: Int, signals s: Signals) -> String {
        switch title(for: level) {
        case "Rookie": return "Every rep counts. Keep showing up."
        case "Consistent": return "The habit is forming. Stay on it."
        case "Grinder": return "You put in real work. It shows."
        case "Savage": return "Serious lifter energy. Relentless."
        case "Elite": return "Top-tier discipline. Rare air."
        default: return "You've built something few do. Legend."
        }
    }
}
