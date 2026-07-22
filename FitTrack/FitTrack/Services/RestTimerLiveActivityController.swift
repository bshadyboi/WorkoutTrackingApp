import Foundation
import ActivityKit

/// Drives Lock Screen / Dynamic Island rest countdown via ActivityKit.
@MainActor
enum RestTimerLiveActivity {
    private static var current: Activity<RestTimerAttributes>?

    static func start(exerciseName: String, workoutName: String, endsAt: Date, totalSeconds: Int) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        end()

        let attributes = RestTimerAttributes(
            exerciseName: exerciseName.isEmpty ? "Rest" : exerciseName,
            workoutName: workoutName
        )
        let state = RestTimerAttributes.ContentState(
            endsAt: endsAt,
            totalSeconds: max(totalSeconds, 1)
        )

        do {
            current = try Activity.request(
                attributes: attributes,
                content: .init(state: state, staleDate: endsAt),
                pushType: nil
            )
        } catch {
            // Live Activities may be disabled or unavailable on simulator / Focus.
            current = nil
        }
    }

    static func update(endsAt: Date, totalSeconds: Int) {
        guard let current else { return }
        let state = RestTimerAttributes.ContentState(
            endsAt: endsAt,
            totalSeconds: max(totalSeconds, 1)
        )
        Task {
            await current.update(.init(state: state, staleDate: endsAt))
        }
    }

    static func end() {
        guard let activity = current else {
            // Also clear any orphaned activities from a prior session.
            Task { await endAllOrphans() }
            return
        }
        current = nil
        Task {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }

    private static func endAllOrphans() async {
        for activity in Activity<RestTimerAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
