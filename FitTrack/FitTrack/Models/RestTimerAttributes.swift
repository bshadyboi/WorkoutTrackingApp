import Foundation
import ActivityKit

/// Shared ActivityAttributes for the rest-timer Live Activity (app + widget).
struct RestTimerAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var endsAt: Date
        var totalSeconds: Int
    }

    var exerciseName: String
    var workoutName: String
}
