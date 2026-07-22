import Foundation
import UIKit
import Observation

@MainActor
@Observable
final class RestTimerManager {
    private(set) var endsAt: Date?
    private(set) var totalSeconds = 90
    private(set) var exerciseName = ""
    private(set) var workoutName = ""

    var isActive: Bool {
        guard let endsAt else { return false }
        return endsAt > .now
    }

    func remainingSeconds(at date: Date = .now) -> Int {
        guard let endsAt else { return 0 }
        return max(0, Int(endsAt.timeIntervalSince(date).rounded(.up)))
    }

    func progress(at date: Date = .now) -> Double {
        guard totalSeconds > 0, let endsAt else { return 0 }
        let remaining = max(0, endsAt.timeIntervalSince(date))
        return 1.0 - (remaining / Double(totalSeconds))
    }

    func formattedRemaining(at date: Date = .now) -> String {
        let seconds = remainingSeconds(at: date)
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%d:%02d", m, s)
    }

    func start(seconds: Int, exerciseName: String = "", workoutName: String = "") {
        cancel(notify: false)
        self.exerciseName = exerciseName
        self.workoutName = workoutName
        totalSeconds = max(seconds, 1)
        endsAt = .now.addingTimeInterval(TimeInterval(totalSeconds))
        NotificationManager.shared.scheduleRestTimer(seconds: totalSeconds)
        WidgetSnapshotStore.updateRestTimer(endsAt: endsAt)
        if let endsAt {
            PhoneWatchSync.shared.sendRestTimer(endsAt: endsAt, totalSeconds: totalSeconds)
            RestTimerLiveActivity.start(
                exerciseName: exerciseName,
                workoutName: workoutName,
                endsAt: endsAt,
                totalSeconds: totalSeconds
            )
        }
    }

    /// Extend or shorten the active rest window.
    func adjust(bySeconds delta: Int) {
        guard isActive, let currentEnd = endsAt else { return }
        let newEnd = currentEnd.addingTimeInterval(TimeInterval(delta))
        let remaining = max(1, Int(newEnd.timeIntervalSinceNow.rounded(.up)))
        totalSeconds = max(totalSeconds + delta, remaining)
        endsAt = .now.addingTimeInterval(TimeInterval(remaining))
        NotificationManager.shared.scheduleRestTimer(seconds: remaining)
        WidgetSnapshotStore.updateRestTimer(endsAt: endsAt)
        if let endsAt {
            PhoneWatchSync.shared.sendRestTimer(endsAt: endsAt, totalSeconds: remaining)
            RestTimerLiveActivity.update(endsAt: endsAt, totalSeconds: remaining)
        }
    }

    func cancel(notify: Bool = true) {
        endsAt = nil
        WidgetSnapshotStore.updateRestTimer(endsAt: nil)
        RestTimerLiveActivity.end()
        if notify {
            NotificationManager.shared.cancelRestTimerNotification()
            PhoneWatchSync.shared.sendRestCancelled()
        }
    }

    func finishIfExpired() {
        guard let endsAt, endsAt <= .now else { return }
        self.endsAt = nil
        WidgetSnapshotStore.updateRestTimer(endsAt: nil)
        RestTimerLiveActivity.end()
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}
