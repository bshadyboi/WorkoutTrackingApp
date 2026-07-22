import SwiftUI
import WatchConnectivity

@main
struct FitTrackWatchApp: App {
    @State private var sync = WatchWorkoutSync.shared

    var body: some Scene {
        WindowGroup {
            WatchRootView()
                .environment(sync)
        }
    }
}

@Observable
@MainActor
final class WatchWorkoutSync: NSObject, WCSessionDelegate {
    static let shared = WatchWorkoutSync()

    var workoutName = "No workout"
    var exerciseName = "—"
    var setNumber = 0
    var weight = 0
    var reps = 0
    var isActive = false
    var restEndsAt: Date?
    var restTotal = 0

    private override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func requestCompleteSet() {
        let payload: [String: Any] = ["type": "completeSet"]
        let session = WCSession.default
        if session.isReachable {
            session.sendMessage(payload, replyHandler: nil, errorHandler: nil)
        }
        try? session.updateApplicationContext(payload)
    }

    private func apply(_ message: [String: Any]) {
        let type = message["type"] as? String ?? ""
        switch type {
        case "workoutStarted", "activeSet":
            isActive = true
            workoutName = message["workoutName"] as? String ?? workoutName
            exerciseName = message["exerciseName"] as? String ?? exerciseName
            setNumber = message["setNumber"] as? Int ?? setNumber
            weight = message["weight"] as? Int ?? weight
            reps = message["reps"] as? Int ?? reps
        case "setLogged":
            exerciseName = message["exerciseName"] as? String ?? exerciseName
            setNumber = message["setNumber"] as? Int ?? setNumber
            weight = message["weight"] as? Int ?? weight
            reps = message["reps"] as? Int ?? reps
        case "restTimer":
            if let t = message["endsAt"] as? TimeInterval {
                restEndsAt = Date(timeIntervalSince1970: t)
            }
            restTotal = message["totalSeconds"] as? Int ?? restTotal
        case "restCancelled", "workoutEnded":
            if type == "workoutEnded" {
                isActive = false
                exerciseName = "—"
                setNumber = 0
            }
            restEndsAt = nil
        default:
            break
        }
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in self.apply(message) }
    }
    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in self.apply(applicationContext) }
    }
}

struct WatchRootView: View {
    @Environment(WatchWorkoutSync.self) private var sync

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    Text("FitTrack")
                        .font(.headline)
                        .foregroundStyle(Color(red: 0.35, green: 0.65, blue: 1.0))

                    if sync.isActive {
                        Text(sync.workoutName)
                            .font(.title3.bold())
                        Text(sync.exerciseName.isEmpty ? "—" : sync.exerciseName)
                            .font(.body)
                        if sync.setNumber > 0 {
                            Text("Set \(sync.setNumber) · \(sync.weight) lb × \(sync.reps)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if let ends = sync.restEndsAt, ends > context.date {
                            Text("Rest \(max(0, Int(ends.timeIntervalSince(context.date))))s")
                                .font(.caption2)
                                .foregroundStyle(.green)
                        }
                        Button("LOG SET") {
                            sync.requestCompleteSet()
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                    } else {
                        Text("Start a workout on iPhone")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 4)
            }
        }
    }
}
