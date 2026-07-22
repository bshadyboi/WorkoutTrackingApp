import Foundation
import SwiftData
import Observation
import UIKit

struct ActiveSet: Identifiable {
    let id: UUID
    var setNumber: Int
    var weight: Int
    var reps: Int
    var rir: Int?
    var isCompleted: Bool
    var previousLabel: String?
    /// First working set on a crown lift.
    var isCrown: Bool = false

    var displayLabel: String {
        if isCrown { return "👑" }
        return "\(setNumber)"
    }
}

struct ActiveExercise: Identifiable {
    let id: UUID
    let name: String
    let muscle: String
    let videoURL: String
    var plannedSetCount: Int
    var hasCrownSet: Bool
    var sets: [ActiveSet]
}

struct WorkoutSummaryData {
    let dayName: String
    let durationSeconds: Int
    let completedSets: Int
    let totalSets: Int
    let estimatedCalories: Int
    let prsHit: [PRAlert]
    let energyLevel: Int
    let sorenessLevel: Int
    let sessionNotes: String
}

@MainActor
@Observable
final class WorkoutSessionManager {
    var isActive = false
    var isPaused = false
    var showCelebration = false
    var showCheckIn = false
    var showSummary = false
    var dayName = ""
    var startedAt = Date.now
    var exercises: [ActiveExercise] = []
    var summary: WorkoutSummaryData?
    var pendingSession: WorkoutSession?
    var prsHit: [PRAlert] = []
    var currentPRBanner: PRAlert?
    var currentOverloadNudge: OverloadNudge?
    var lastSessionByExercise: [String: String] = [:]
    /// Snapshot for the post-finish celebration screen.
    var celebrationCompletedSets = 0
    var celebrationTotalSets = 0
    var celebrationDurationSeconds = 0
    var celebrationPRCount = 0
    var celebrationDayName = ""

    let restTimer = RestTimerManager()

    private var bestWeightByExercise: [String: Double] = [:]
    private(set) var autoStartRest = true
    private(set) var restSeconds = 90
    private var savedTotalSets = 0
    private var prBannerTask: Task<Void, Never>?
    private var pausedAccumulated: TimeInterval = 0
    private var pauseStartedAt: Date?

    var completedSetsCount: Int {
        exercises.flatMap(\.sets).filter(\.isCompleted).count
    }

    var totalSetsCount: Int {
        exercises.flatMap(\.sets).count
    }

    var elapsedSeconds: Int {
        var total = Date.now.timeIntervalSince(startedAt) - pausedAccumulated
        if let pauseStartedAt {
            total -= Date.now.timeIntervalSince(pauseStartedAt)
        }
        return max(0, Int(total))
    }

    var formattedElapsed: String {
        let minutes = elapsedSeconds / 60
        let seconds = elapsedSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    func recoverIfNeeded() {
        if isActive && exercises.isEmpty {
            resetSession()
        }
        if showCheckIn && pendingSession == nil {
            showCheckIn = false
        }
        if showCelebration && pendingSession == nil {
            showCelebration = false
        }
        if showSummary && summary == nil {
            showSummary = false
        }
        if !isActive {
            restTimer.cancel()
        }
    }

    func startWorkout(from day: WorkoutDay, pastSessions: [WorkoutSession], settings: AppSettings) {
        resetSession()
        dayName = day.name
        startedAt = .now
        isPaused = false
        pausedAccumulated = 0
        pauseStartedAt = nil
        autoStartRest = settings.autoStartRestTimer
        restSeconds = settings.restTimerSeconds

        let completed = pastSessions.filter { $0.endedAt != nil }
        bestWeightByExercise = WorkoutAnalytics.bestWeightByExercise(from: completed).mapValues(\.weight)
        lastSessionByExercise = WorkoutAnalytics.lastSessionByExercise(from: completed)
        let previousSets = WorkoutAnalytics.lastSetsByExercise(from: completed)

        exercises = day.exercises
            .sorted { $0.sortOrder < $1.sortOrder }
            .map { stored in
                makeActiveExercise(from: stored, previousSets: previousSets[stored.name] ?? [])
            }
        isActive = true
        PhoneWatchSync.shared.sendWorkoutStarted(name: day.name)
        syncActiveSetToWatch()
    }

    func pauseWorkout() {
        guard isActive, !isPaused else { return }
        isPaused = true
        pauseStartedAt = .now
        restTimer.cancel()
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    func resumeWorkout() {
        guard isActive, isPaused else { return }
        if let pauseStartedAt {
            pausedAccumulated += Date.now.timeIntervalSince(pauseStartedAt)
        }
        self.pauseStartedAt = nil
        isPaused = false
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        syncActiveSetToWatch()
    }

    /// Replace the movement in a slot (e.g. machine taken). Keeps set count / crown scheme.
    func swapExercise(at index: Int, with entry: ExerciseCatalogEntry, pastSessions: [WorkoutSession]) {
        guard exercises.indices.contains(index) else { return }
        let previous = exercises[index]
        let completed = pastSessions.filter { $0.endedAt != nil }
        let previousSets = WorkoutAnalytics.lastSetsByExercise(from: completed)[entry.name] ?? []
        lastSessionByExercise[entry.name] = WorkoutAnalytics.lastSessionByExercise(from: completed)[entry.name]

        let setCount = max(previous.plannedSetCount, 1)
        exercises[index] = ActiveExercise(
            id: UUID(),
            name: entry.name,
            muscle: entry.muscle,
            videoURL: entry.videoURL,
            plannedSetCount: setCount,
            hasCrownSet: previous.hasCrownSet,
            sets: buildSets(
                setCount: setCount,
                hasCrownSet: previous.hasCrownSet,
                defaultWeight: entry.defaultWeight,
                defaultReps: entry.defaultReps,
                previousSets: previousSets
            )
        )
        restTimer.cancel()
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        syncActiveSetToWatch()
    }

    private func makeActiveExercise(from stored: StoredExercise, previousSets: [WorkoutAnalytics.PreviousSet]) -> ActiveExercise {
        let planned = stored.defaultSets
        // Prescription only — don't inflate set count from history.
        let setCount = max(planned, 1)
        return ActiveExercise(
            id: stored.id,
            name: stored.name,
            muscle: stored.muscle,
            videoURL: stored.videoURL,
            plannedSetCount: planned,
            hasCrownSet: stored.hasCrownSet,
            sets: buildSets(
                setCount: setCount,
                hasCrownSet: stored.hasCrownSet,
                defaultWeight: stored.defaultWeight,
                defaultReps: stored.targetReps(forSetNumber: 1),
                previousSets: previousSets,
                targetReps: { stored.targetReps(forSetNumber: $0) }
            )
        )
    }

    private func buildSets(
        setCount: Int,
        hasCrownSet: Bool,
        defaultWeight: Int,
        defaultReps: Int,
        previousSets: [WorkoutAnalytics.PreviousSet],
        targetReps: ((Int) -> Int)? = nil
    ) -> [ActiveSet] {
        (1...setCount).map { index in
            let prev = previousSets.indices.contains(index - 1) ? previousSets[index - 1] : previousSets.last
            let reps = targetReps?(index) ?? prev?.reps ?? defaultReps
            return ActiveSet(
                id: UUID(),
                setNumber: index,
                weight: Int(prev?.weight ?? Double(defaultWeight)),
                reps: reps,
                rir: prev?.rir,
                isCompleted: false,
                previousLabel: prev.map { WeightFormat.setLabel(weight: $0.weight, reps: $0.reps) },
                isCrown: hasCrownSet && index == 1
            )
        }
    }

    /// Crown 4:00 · working 3:00 · add-on 2:00
    func restSeconds(forSetNumber setNumber: Int, plannedSetCount: Int, hasCrownSet: Bool = true) -> Int {
        if setNumber > plannedSetCount { return 120 }
        if hasCrownSet && setNumber == 1 { return 240 }
        return 180
    }

    func handleSetToggle(exerciseIndex: Int, setIndex: Int, isCompleted: Bool) {
        guard !isPaused else { return }
        guard exercises.indices.contains(exerciseIndex),
              exercises[exerciseIndex].sets.indices.contains(setIndex) else { return }

        let exercise = exercises[exerciseIndex]
        let set = exercise.sets[setIndex]

        if isCompleted {
            Haptics.setComplete()
            checkForPR(exerciseName: exercise.name, weight: set.weight, reps: set.reps)
            maybeOverloadNudge(exerciseIndex: exerciseIndex, setIndex: setIndex)
            PhoneWatchSync.shared.sendSetLogged(
                exerciseName: exercise.name,
                setNumber: set.setNumber,
                weight: set.weight,
                reps: set.reps
            )
            if autoStartRest {
                let seconds = restSeconds(
                    forSetNumber: set.setNumber,
                    plannedSetCount: exercise.plannedSetCount,
                    hasCrownSet: exercise.hasCrownSet
                )
                restTimer.start(seconds: seconds, exerciseName: exercise.name, workoutName: dayName)
            }
        }
    }

    /// +2/+5 bump when you hit/beat previous reps at RIR ≤ 1.
    private func maybeOverloadNudge(exerciseIndex: Int, setIndex: Int) {
        let exercise = exercises[exerciseIndex]
        let set = exercise.sets[setIndex]
        guard let prevLabel = set.previousLabel else { return }
        let parts = prevLabel.split(separator: "×").map { $0.trimmingCharacters(in: .whitespaces) }
        guard parts.count == 2, let prevWeight = Int(parts[0]), let prevReps = Int(parts[1]) else { return }
        let rir = set.rir ?? 99
        guard set.reps >= prevReps, rir <= 1, set.weight >= prevWeight else { return }

        let bump = set.weight >= 100 ? 5 : 2
        let suggested = set.weight + bump
        currentOverloadNudge = OverloadNudge(
            exerciseName: exercise.name,
            fromWeight: set.weight,
            toWeight: suggested
        )
        if let next = exercises[exerciseIndex].sets.firstIndex(where: { !$0.isCompleted }) {
            exercises[exerciseIndex].sets[next].weight = suggested
        }
        Task {
            try? await Task.sleep(for: .seconds(3.5))
            if currentOverloadNudge?.toWeight == suggested {
                currentOverloadNudge = nil
            }
        }
    }

    func syncActiveSetToWatch() {
        let ei = exercises.firstIndex { ex in ex.sets.contains { !$0.isCompleted } } ?? max(exercises.count - 1, 0)
        guard exercises.indices.contains(ei) else { return }
        let exercise = exercises[ei]
        guard let set = exercise.sets.first(where: { !$0.isCompleted }) ?? exercise.sets.last else { return }
        PhoneWatchSync.shared.sendActiveSet(
            exerciseName: exercise.name,
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            workoutName: dayName
        )
    }

    func addSet(toExerciseIndex exerciseIndex: Int) {
        guard exercises.indices.contains(exerciseIndex) else { return }
        let last = exercises[exerciseIndex].sets.last
        let nextNumber = (last?.setNumber ?? 0) + 1
        exercises[exerciseIndex].sets.append(
            ActiveSet(
                id: UUID(),
                setNumber: nextNumber,
                weight: last?.weight ?? 0,
                reps: last?.reps ?? 10,
                rir: last?.rir,
                isCompleted: false,
                previousLabel: nil,
                isCrown: false
            )
        )
    }

    private func checkForPR(exerciseName: String, weight: Int, reps: Int) {
        guard WorkoutAnalytics.isNewPR(exerciseName: exerciseName, weight: weight, bestByExercise: bestWeightByExercise) else {
            return
        }
        bestWeightByExercise[exerciseName] = Double(weight)
        let alert = PRAlert(exerciseName: exerciseName, weight: weight, reps: reps)
        prsHit.append(alert)
        currentPRBanner = alert
        Haptics.celebrate()
        CelebrationCenter.shared.burstConfetti()
        NotificationManager.shared.postPRNotification(exercise: exerciseName, weight: weight)

        prBannerTask?.cancel()
        prBannerTask = Task {
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled, currentPRBanner == alert else { return }
            currentPRBanner = nil
        }
    }

    func completeWorkout(context: ModelContext) {
        restTimer.cancel()
        PhoneWatchSync.shared.sendWorkoutEnded()
        PhoneWatchSync.shared.clearLiveWorkoutSnapshot()
        let endedAt = Date.now
        let duration = max(elapsedSeconds, Int(endedAt.timeIntervalSince(startedAt)))

        let session = WorkoutSession(
            dayName: dayName,
            startedAt: startedAt,
            endedAt: endedAt,
            durationSeconds: duration
        )
        session.setPRsHit(Array(Set(prsHit.map(\.exerciseName))))

        for activeExercise in exercises {
            let log = ExerciseLog(
                exerciseName: activeExercise.name,
                muscle: activeExercise.muscle
            )
            for set in activeExercise.sets where set.isCompleted {
                let setLog = SetLog(
                    setNumber: set.setNumber,
                    weight: Double(set.weight),
                    reps: set.reps,
                    rir: set.rir,
                    isCompleted: true
                )
                setLog.exerciseLog = log
                log.sets.append(setLog)
            }
            if !log.sets.isEmpty {
                log.session = session
                session.exerciseLogs.append(log)
            }
        }

        context.insert(session)
        try? context.save()

        savedTotalSets = totalSetsCount
        celebrationCompletedSets = session.completedSetsCount
        celebrationTotalSets = savedTotalSets
        celebrationDurationSeconds = duration
        celebrationPRCount = prsHit.count
        celebrationDayName = dayName

        pendingSession = session
        exercises = []
        isActive = false
        showCelebration = true
    }

    func continueAfterCelebration() {
        showCelebration = false
        showCheckIn = true
    }

    func saveCheckIn(energy: Int, soreness: Int, notes: String, context: ModelContext) {
        guard let session = pendingSession else { return }
        session.energyLevel = energy
        session.sorenessLevel = soreness
        session.sessionNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        try? context.save()

        summary = WorkoutSummaryData(
            dayName: session.dayName,
            durationSeconds: session.durationSeconds,
            completedSets: session.completedSetsCount,
            totalSets: savedTotalSets,
            estimatedCalories: session.estimatedCalories,
            prsHit: prsHit,
            energyLevel: energy,
            sorenessLevel: soreness,
            sessionNotes: session.sessionNotes
        )

        pendingSession = nil
        prsHit = []
        showCheckIn = false
        showSummary = true
    }

    func skipCheckIn(context: ModelContext) {
        saveCheckIn(energy: 0, soreness: 0, notes: "", context: context)
    }

    func discardWorkout() {
        PhoneWatchSync.shared.sendWorkoutEnded()
        PhoneWatchSync.shared.clearLiveWorkoutSnapshot()
        resetSession()
    }

    private func resetSession() {
        prBannerTask?.cancel()
        prBannerTask = nil
        restTimer.cancel()
        exercises = []
        pendingSession = nil
        prsHit = []
        currentPRBanner = nil
        currentOverloadNudge = nil
        summary = nil
        isActive = false
        showCelebration = false
        showCheckIn = false
        showSummary = false
        dayName = ""
        savedTotalSets = 0
        celebrationCompletedSets = 0
        celebrationTotalSets = 0
        celebrationDurationSeconds = 0
        celebrationPRCount = 0
        celebrationDayName = ""
        bestWeightByExercise = [:]
        lastSessionByExercise = [:]
        isPaused = false
        pausedAccumulated = 0
        pauseStartedAt = nil
    }
}
