import Foundation

struct BadgeDefinition: Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    let icon: String
    let tier: BadgeTier

    enum BadgeTier: Int, Comparable {
        case bronze = 1
        case silver = 2
        case gold = 3
        case platinum = 4

        static func < (lhs: BadgeTier, rhs: BadgeTier) -> Bool {
            lhs.rawValue < rhs.rawValue
        }
    }
}

enum BadgeCatalog {
    static let all: [BadgeDefinition] = [
        BadgeDefinition(id: "first_session", title: "First Rep", description: "Complete your first workout", icon: "flame.fill", tier: .bronze),
        BadgeDefinition(id: "sessions_5", title: "Regular", description: "Complete 5 workouts", icon: "figure.strengthtraining.traditional", tier: .bronze),
        BadgeDefinition(id: "sessions_10", title: "Dedicated", description: "Complete 10 workouts", icon: "medal.fill", tier: .silver),
        BadgeDefinition(id: "sessions_25", title: "Iron Will", description: "Complete 25 workouts", icon: "shield.fill", tier: .gold),
        BadgeDefinition(id: "streak_3", title: "On Fire", description: "3-day workout streak", icon: "bolt.fill", tier: .bronze),
        BadgeDefinition(id: "streak_7", title: "Unstoppable", description: "7-day workout streak", icon: "flame.circle.fill", tier: .silver),
        BadgeDefinition(id: "streak_14", title: "Legend", description: "14-day workout streak", icon: "crown.fill", tier: .gold),
        BadgeDefinition(id: "first_pr", title: "New Max", description: "Hit your first personal record", icon: "trophy.fill", tier: .bronze),
        BadgeDefinition(id: "prs_5", title: "PR Machine", description: "Hit 5 personal records", icon: "trophy.circle.fill", tier: .silver),
        BadgeDefinition(id: "prs_15", title: "Record Breaker", description: "Hit 15 personal records", icon: "star.circle.fill", tier: .gold),
        BadgeDefinition(id: "early_bird", title: "Early Bird", description: "Train before 7 AM", icon: "sunrise.fill", tier: .bronze),
        BadgeDefinition(id: "night_owl", title: "Night Owl", description: "Train after 9 PM", icon: "moon.stars.fill", tier: .bronze),
        BadgeDefinition(id: "volume_100", title: "Century", description: "Log 100 completed sets", icon: "100.circle.fill", tier: .silver),
        BadgeDefinition(id: "volume_500", title: "Volume King", description: "Log 500 completed sets", icon: "chart.bar.fill", tier: .gold),
        BadgeDefinition(id: "perfect_week", title: "Perfect Week", description: "4+ workouts in one week", icon: "calendar.badge.checkmark", tier: .platinum),
        BadgeDefinition(id: "custom_creator", title: "Coach", description: "Create a custom exercise", icon: "plus.circle.fill", tier: .bronze),
    ]

    static func definition(for id: String) -> BadgeDefinition? {
        all.first { $0.id == id }
    }
}

enum BadgeEvaluator {
    static func eligibleBadgeIDs(sessions: [WorkoutSession], totalPRCount: Int, totalSets: Int, hasCustomExercise: Bool) -> Set<String> {
        let completed = sessions.filter { $0.endedAt != nil }
        var ids = Set<String>()

        if !completed.isEmpty { ids.insert("first_session") }
        if completed.count >= 5 { ids.insert("sessions_5") }
        if completed.count >= 10 { ids.insert("sessions_10") }
        if completed.count >= 25 { ids.insert("sessions_25") }

        let streak = WorkoutAnalytics.streak(from: completed)
        if streak >= 3 { ids.insert("streak_3") }
        if streak >= 7 { ids.insert("streak_7") }
        if streak >= 14 { ids.insert("streak_14") }

        if totalPRCount >= 1 { ids.insert("first_pr") }
        if totalPRCount >= 5 { ids.insert("prs_5") }
        if totalPRCount >= 15 { ids.insert("prs_15") }

        if totalSets >= 100 { ids.insert("volume_100") }
        if totalSets >= 500 { ids.insert("volume_500") }

        if hasCustomExercise { ids.insert("custom_creator") }

        let calendar = Calendar.current
        for session in completed {
            let hour = calendar.component(.hour, from: session.startedAt)
            if hour < 7 { ids.insert("early_bird") }
            if hour >= 21 { ids.insert("night_owl") }
        }

        if workoutsInCurrentWeek(completed) >= 4 { ids.insert("perfect_week") }

        return ids
    }

    private static func workoutsInCurrentWeek(_ sessions: [WorkoutSession]) -> Int {
        let calendar = Calendar.current
        guard let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: .now)) else {
            return 0
        }
        return Set(sessions.filter { $0.startedAt >= weekStart }.map { calendar.startOfDay(for: $0.startedAt) }).count
    }

    static func totalPRCount(from sessions: [WorkoutSession]) -> Int {
        sessions.reduce(0) { $0 + $1.prsHit.count }
    }

    static func totalCompletedSets(from sessions: [WorkoutSession]) -> Int {
        sessions.reduce(0) { $0 + $1.completedSetsCount }
    }
}
