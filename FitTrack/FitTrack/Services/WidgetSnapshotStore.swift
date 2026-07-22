import Foundation
import WidgetKit

enum WidgetSnapshotStore {
    static let suiteName = "group.com.brandonperalta.fittrack"

    enum Key {
        static let workoutName = "widget.workoutName"
        static let streak = "widget.streak"
        static let sessionsThisWeek = "widget.sessionsThisWeek"
        static let badgeCount = "widget.badgeCount"
        static let displayName = "widget.displayName"
        static let protocolDue = "widget.protocolDue"
        static let protocolTotal = "widget.protocolTotal"
        static let liveExercise = "widget.liveExercise"
        static let liveSetNumber = "widget.liveSetNumber"
        static let liveActive = "widget.liveActive"
        static let restEndsAt = "widget.restEndsAt"
    }

    static func update(
        workoutName: String,
        streak: Int,
        sessionsThisWeek: Int,
        badgeCount: Int,
        displayName: String,
        protocolDue: Int = 0,
        protocolTotal: Int = 0
    ) {
        guard let defaults = UserDefaults(suiteName: suiteName) else { return }
        defaults.set(workoutName, forKey: Key.workoutName)
        defaults.set(streak, forKey: Key.streak)
        defaults.set(sessionsThisWeek, forKey: Key.sessionsThisWeek)
        defaults.set(badgeCount, forKey: Key.badgeCount)
        defaults.set(displayName, forKey: Key.displayName)
        defaults.set(protocolDue, forKey: Key.protocolDue)
        defaults.set(protocolTotal, forKey: Key.protocolTotal)
        WidgetCenter.shared.reloadAllTimelines()
    }

    static func updateLiveWorkout(workoutName: String, exerciseName: String, setNumber: Int) {
        guard let defaults = UserDefaults(suiteName: suiteName) else { return }
        defaults.set(workoutName, forKey: Key.workoutName)
        defaults.set(exerciseName, forKey: Key.liveExercise)
        defaults.set(setNumber, forKey: Key.liveSetNumber)
        defaults.set(true, forKey: Key.liveActive)
        WidgetCenter.shared.reloadAllTimelines()
    }

    static func updateRestTimer(endsAt: Date?) {
        guard let defaults = UserDefaults(suiteName: suiteName) else { return }
        if let endsAt {
            defaults.set(endsAt.timeIntervalSince1970, forKey: Key.restEndsAt)
        } else {
            defaults.removeObject(forKey: Key.restEndsAt)
        }
        WidgetCenter.shared.reloadAllTimelines()
    }

    static func clearLiveWorkout() {
        guard let defaults = UserDefaults(suiteName: suiteName) else { return }
        defaults.set(false, forKey: Key.liveActive)
        defaults.set("", forKey: Key.liveExercise)
        defaults.set(0, forKey: Key.liveSetNumber)
        defaults.removeObject(forKey: Key.restEndsAt)
        WidgetCenter.shared.reloadAllTimelines()
    }

    static func read() -> (
        workoutName: String,
        streak: Int,
        sessionsThisWeek: Int,
        badgeCount: Int,
        displayName: String,
        protocolDue: Int,
        protocolTotal: Int,
        liveExercise: String,
        liveSetNumber: Int,
        liveActive: Bool,
        restEndsAt: Date?
    ) {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            return ("Workout", 0, 0, 0, "Athlete", 0, 0, "", 0, false, nil)
        }
        let restTs = defaults.double(forKey: Key.restEndsAt)
        let restEnds: Date? = restTs > 0 ? Date(timeIntervalSince1970: restTs) : nil
        return (
            defaults.string(forKey: Key.workoutName) ?? "Workout",
            defaults.integer(forKey: Key.streak),
            defaults.integer(forKey: Key.sessionsThisWeek),
            defaults.integer(forKey: Key.badgeCount),
            defaults.string(forKey: Key.displayName) ?? "Athlete",
            defaults.integer(forKey: Key.protocolDue),
            defaults.integer(forKey: Key.protocolTotal),
            defaults.string(forKey: Key.liveExercise) ?? "",
            defaults.integer(forKey: Key.liveSetNumber),
            defaults.bool(forKey: Key.liveActive),
            restEnds
        )
    }
}
