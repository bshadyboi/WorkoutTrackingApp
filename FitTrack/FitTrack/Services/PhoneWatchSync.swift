import Foundation
import WatchConnectivity
import Observation

@MainActor
@Observable
final class PhoneWatchSync: NSObject, WCSessionDelegate {
    static let shared = PhoneWatchSync()

    /// Latest request from Watch to complete the current set (phone ActiveWorkoutView observes this).
    var pendingWatchCompleteSet = false
    var lastWatchPayload: [String: Any] = [:]

    private override init() {
        super.init()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    func sendWorkoutStarted(name: String) {
        send([
            "type": "workoutStarted",
            "workoutName": name,
            "exerciseName": "",
            "setNumber": 0,
            "weight": 0,
            "reps": 0,
        ])
    }

    func sendWorkoutEnded() {
        send(["type": "workoutEnded"])
    }

    func sendRestTimer(endsAt: Date, totalSeconds: Int) {
        send([
            "type": "restTimer",
            "endsAt": endsAt.timeIntervalSince1970,
            "totalSeconds": totalSeconds,
        ])
    }

    func sendRestCancelled() {
        send(["type": "restCancelled"])
    }

    func sendActiveSet(exerciseName: String, setNumber: Int, weight: Int, reps: Int, workoutName: String) {
        send([
            "type": "activeSet",
            "workoutName": workoutName,
            "exerciseName": exerciseName,
            "setNumber": setNumber,
            "weight": weight,
            "reps": reps,
        ])
        WidgetSnapshotStore.updateLiveWorkout(
            workoutName: workoutName,
            exerciseName: exerciseName,
            setNumber: setNumber
        )
    }

    func sendSetLogged(exerciseName: String, setNumber: Int, weight: Int, reps: Int) {
        send([
            "type": "setLogged",
            "exerciseName": exerciseName,
            "setNumber": setNumber,
            "weight": weight,
            "reps": reps,
        ])
    }

    func clearLiveWorkoutSnapshot() {
        WidgetSnapshotStore.clearLiveWorkout()
    }

    private func send(_ payload: [String: Any]) {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        lastWatchPayload = payload
        if session.isReachable {
            session.sendMessage(payload, replyHandler: nil, errorHandler: nil)
        }
        try? session.updateApplicationContext(payload)
    }

    private func handleIncoming(_ message: [String: Any]) {
        let type = message["type"] as? String ?? ""
        switch type {
        case "completeSet", "logSet":
            pendingWatchCompleteSet = true
        default:
            break
        }
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
    nonisolated func sessionDidBecomeInactive(_ session: WCSession) {}
    nonisolated func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in
            self.handleIncoming(message)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in
            self.handleIncoming(applicationContext)
        }
    }
}
