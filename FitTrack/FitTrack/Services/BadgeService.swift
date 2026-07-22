import Foundation
import SwiftData

enum BadgeService {
    @MainActor
    static func awardNewBadges(context: ModelContext, sessions: [WorkoutSession]) -> [BadgeDefinition] {
        let earned = (try? context.fetch(FetchDescriptor<EarnedBadge>())) ?? []
        let earnedIDs = Set(earned.map(\.id))
        let customCount = (try? context.fetch(FetchDescriptor<CustomExercise>()))?.count ?? 0

        let eligible = BadgeEvaluator.eligibleBadgeIDs(
            sessions: sessions,
            totalPRCount: BadgeEvaluator.totalPRCount(from: sessions),
            totalSets: BadgeEvaluator.totalCompletedSets(from: sessions),
            hasCustomExercise: customCount > 0
        )

        var newlyEarned: [BadgeDefinition] = []
        for badgeID in eligible where !earnedIDs.contains(badgeID) {
            context.insert(EarnedBadge(id: badgeID))
            if let def = BadgeCatalog.definition(for: badgeID) {
                newlyEarned.append(def)
            }
        }

        if !newlyEarned.isEmpty {
            try? context.save()
        }
        return newlyEarned.sorted { $0.tier > $1.tier }
    }
}
