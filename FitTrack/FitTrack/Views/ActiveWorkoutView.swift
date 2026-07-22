import SwiftUI
import SwiftData
import UIKit

struct ActiveWorkoutView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \WorkoutSession.startedAt, order: .reverse) private var sessions: [WorkoutSession]
    @Bindable var manager: WorkoutSessionManager

    @State private var exerciseIndex = 0
    @State private var showDiscardAlert = false
    @State private var showRestSheet = false
    @State private var showSwapPicker = false
    @FocusState private var focusedField: ActiveWorkoutField?

    private var exercises: [ActiveExercise] { manager.exercises }

    private var safeExerciseIndex: Int {
        guard !exercises.isEmpty else { return 0 }
        return min(max(exerciseIndex, 0), exercises.count - 1)
    }

    private var currentExercise: ActiveExercise? {
        guard exercises.indices.contains(safeExerciseIndex) else { return nil }
        return exercises[safeExerciseIndex]
    }

    private var currentSetIndex: Int? {
        guard let exercise = currentExercise else { return nil }
        return exercise.sets.firstIndex(where: { !$0.isCompleted })
    }

    private var currentSet: ActiveSet? {
        guard let exercise = currentExercise, let setIndex = currentSetIndex,
              exercise.sets.indices.contains(setIndex) else { return nil }
        return exercise.sets[setIndex]
    }

    private var completedSetsInExercise: Int {
        currentExercise?.sets.filter(\.isCompleted).count ?? 0
    }

    private var totalSetsInExercise: Int {
        currentExercise?.sets.count ?? 0
    }

    private var otherExerciseNames: Set<String> {
        Set(exercises.enumerated().compactMap { index, exercise in
            index == safeExerciseIndex ? nil : exercise.name
        })
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 12)

                if let pr = manager.currentPRBanner {
                    PRBannerView(alert: pr)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 10)
                }
                if let nudge = manager.currentOverloadNudge {
                    OverloadBannerView(nudge: nudge)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 10)
                }

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 18) {
                        if currentExercise != nil {
                            activeCard
                        } else {
                            emptyState
                        }

                        upNextSection
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, showRestSheet ? 220 : 32)
                }
                .disabled(manager.isPaused)
                .opacity(manager.isPaused ? 0.35 : 1)
            }

            if showRestSheet && manager.restTimer.isActive && !manager.isPaused {
                restDrawer
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            if manager.isPaused {
                pausedOverlay
            }

            CelebrationToastOverlay()
                .padding(.top, 52)

            ConfettiOverlay()
        }
        .preferredColorScheme(.dark)
        .interactiveDismissDisabled()
        .onAppear {
            UIApplication.shared.isIdleTimerDisabled = !manager.isPaused
            jumpToFirstIncomplete()
            manager.syncActiveSetToWatch()
        }
        .onDisappear {
            UIApplication.shared.isIdleTimerDisabled = false
        }
        .onChange(of: manager.isPaused) { _, paused in
            UIApplication.shared.isIdleTimerDisabled = !paused
            if paused { showRestSheet = false }
        }
        .onChange(of: manager.restTimer.isActive) { _, active in
            withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                showRestSheet = active && !manager.isPaused
            }
        }
        .onChange(of: safeExerciseIndex) { _, _ in
            manager.syncActiveSetToWatch()
        }
        .onChange(of: PhoneWatchSync.shared.pendingWatchCompleteSet) { _, pending in
            guard pending else { return }
            PhoneWatchSync.shared.pendingWatchCompleteSet = false
            guard !manager.isPaused, let setIndex = currentSetIndex else { return }
            logSet(at: setIndex)
        }
        .sheet(isPresented: $showSwapPicker) {
            ExercisePickerView(existingNames: otherExerciseNames) { entry in
                manager.swapExercise(at: safeExerciseIndex, with: entry, pastSessions: Array(sessions))
                showSwapPicker = false
            }
        }
        .alert("Exit workout?", isPresented: $showDiscardAlert) {
            Button("Keep Training", role: .cancel) {}
            Button("Discard", role: .destructive) {
                manager.discardWorkout()
            }
        } message: {
            Text("Your progress for this session will not be saved.")
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") { focusedField = nil }
                    .foregroundStyle(EAColor.blue)
            }
        }
    }

    private var pausedOverlay: some View {
        ZStack {
            Color.black.opacity(0.72).ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "pause.circle.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(EAColor.blue)
                Text("Workout paused")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)
                Text("Timer is frozen. Tap resume when you’re back.")
                    .font(.system(size: 14))
                    .foregroundStyle(Color(white: 0.6))
                    .multilineTextAlignment(.center)
                Button {
                    manager.resumeWorkout()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "play.fill")
                        Text("Resume")
                            .fontWeight(.bold)
                    }
                    .foregroundStyle(.black)
                    .frame(maxWidth: 220)
                    .padding(.vertical, 14)
                    .background(EAColor.green)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.top, 8)
            }
            .padding(28)
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: 10) {
            HStack {
                Button { showDiscardAlert = true } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color(white: 0.7))
                        .frame(width: 36, height: 36)
                        .background(Color(white: 0.12))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)

                Spacer()

                Text("Exercise \(safeExerciseIndex + 1) / \(max(exercises.count, 1))")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(EAColor.blue)

                Spacer()

                Button {
                    manager.completeWorkout(context: modelContext)
                } label: {
                    Text("Finish")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(EAColor.blue)
                }
                .buttonStyle(.plain)
                .disabled(manager.isPaused)
            }

            HStack {
                exerciseDots
                Spacer()
                TimelineView(.periodic(from: .now, by: 1)) { _ in
                    HStack(spacing: 6) {
                        Image(systemName: manager.isPaused ? "pause.fill" : "stopwatch")
                            .foregroundStyle(manager.isPaused ? EAColor.yellow : EAColor.blue)
                        Text(manager.formattedElapsed)
                            .font(.system(size: 16, weight: .semibold, design: .monospaced))
                            .foregroundStyle(.white)
                            .monospacedDigit()
                    }
                }

                Button {
                    if manager.isPaused {
                        manager.resumeWorkout()
                    } else {
                        manager.pauseWorkout()
                    }
                } label: {
                    Image(systemName: manager.isPaused ? "play.fill" : "pause.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .background(Color(white: 0.14))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .padding(.leading, 8)
            }
        }
    }

    private var exerciseDots: some View {
        HStack(spacing: 6) {
            ForEach(exercises.indices, id: \.self) { index in
                Circle()
                    .fill(index == safeExerciseIndex ? EAColor.blue : Color(white: 0.28))
                    .frame(width: index == safeExerciseIndex ? 9 : 6, height: index == safeExerciseIndex ? 9 : 6)
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.2)) { exerciseIndex = index }
                    }
            }
        }
    }

    // MARK: - Active exercise + set table

    private var activeCard: some View {
        let exercise = exercises[safeExerciseIndex]
        let last = manager.lastSessionByExercise[exercise.name]
        let allDone = !exercise.sets.contains(where: { !$0.isCompleted })

        return VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                ExerciseIconView(name: exercise.name, muscle: exercise.muscle, size: 44)

                VStack(alignment: .leading, spacing: 4) {
                    Text(exercise.name)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(EAColor.blue)
                        .lineLimit(2)
                    if let last {
                        Text("Last session: \(last)")
                            .font(.system(size: 13))
                            .foregroundStyle(Color(white: 0.55))
                    } else {
                        Text(exercise.muscle)
                            .font(.system(size: 13))
                            .foregroundStyle(Color(white: 0.55))
                    }
                    Text("\(completedSetsInExercise)/\(totalSetsInExercise) sets logged")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(EAColor.blue)

                    Button { showSwapPicker = true } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.triangle.2.circlepath")
                            Text("Swap exercise")
                        }
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(EAColor.blue)
                    }
                    .buttonStyle(.plain)
                }

                Spacer(minLength: 0)
                WatchDemoButton(videoURL: exercise.videoURL, compact: true)
            }

            prescriptionLines(for: exercise)

            // Column headers
            HStack(spacing: 6) {
                Text("Set")
                    .frame(width: 32, alignment: .leading)
                Text("Prev")
                    .frame(width: 52, alignment: .leading)
                Text("lbs")
                    .frame(maxWidth: .infinity)
                Text("Reps")
                    .frame(maxWidth: .infinity)
                Text("RIR")
                    .frame(width: 40)
                Spacer().frame(width: 30)
            }
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(Color(white: 0.45))
            .padding(.horizontal, 8)

            VStack(spacing: 6) {
                ForEach(exercise.sets.indices, id: \.self) { setIndex in
                    setTableRow(
                        exercise: exercise,
                        setIndex: setIndex,
                        isActive: setIndex == currentSetIndex
                    )
                }
            }

            if allDone {
                VStack(spacing: 10) {
                    Text("All sets done")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(EAColor.green)
                    if safeExerciseIndex < exercises.count - 1 {
                        Button("Next exercise →") {
                            withAnimation { exerciseIndex = safeExerciseIndex + 1 }
                        }
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(EAColor.blue)
                    } else {
                        Button("Finish workout") {
                            manager.completeWorkout(context: modelContext)
                        }
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(EAColor.green)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 4)
            } else {
                Button {
                    manager.addSet(toExerciseIndex: safeExerciseIndex)
                } label: {
                    Text("+ Add Set (2:00 rest)")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(EAColor.blue)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .gesture(
            DragGesture(minimumDistance: 40)
                .onEnded { value in
                    if value.translation.width < -50, safeExerciseIndex < exercises.count - 1 {
                        withAnimation { exerciseIndex = safeExerciseIndex + 1 }
                    } else if value.translation.width > 50, safeExerciseIndex > 0 {
                        withAnimation { exerciseIndex = safeExerciseIndex - 1 }
                    }
                }
        )
    }

    @ViewBuilder
    private func prescriptionLines(for exercise: ActiveExercise) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            if exercise.hasCrownSet {
                Text("👑 1 crown set · 4:00 rest")
                    .font(.system(size: 12))
                    .foregroundStyle(Color(white: 0.5))
                let working = max(exercise.plannedSetCount - 1, 0)
                if working > 0 {
                    Text("\(working) working sets · 3:00 rest")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(white: 0.5))
                }
            } else {
                Text("\(exercise.plannedSetCount) sets · 3:00 rest")
                    .font(.system(size: 12))
                    .foregroundStyle(Color(white: 0.5))
            }
        }
    }

    private func setTableRow(exercise: ActiveExercise, setIndex: Int, isActive: Bool) -> some View {
        let set = exercise.sets[setIndex]
        let ei = safeExerciseIndex
        let canComplete = setIndex == currentSetIndex || set.isCompleted

        return HStack(spacing: 6) {
            Text(set.displayLabel)
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundStyle(set.isCrown ? EAColor.yellow : Color(white: 0.6))
                .frame(width: 32, alignment: .leading)

            Text(set.previousLabel ?? "—")
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(Color(white: 0.45))
                .lineLimit(1)
                .frame(width: 52, alignment: .leading)

            SetValueField(
                value: Binding(
                    get: { manager.exercises[ei].sets[setIndex].weight },
                    set: { manager.exercises[ei].sets[setIndex].weight = max(0, $0) }
                ),
                minimum: 0,
                focused: $focusedField,
                equals: .weight(set.id)
            )
            .frame(maxWidth: .infinity)

            SetValueField(
                value: Binding(
                    get: { manager.exercises[ei].sets[setIndex].reps },
                    set: { manager.exercises[ei].sets[setIndex].reps = max(1, $0) }
                ),
                minimum: 1,
                focused: $focusedField,
                equals: .reps(set.id)
            )
            .frame(maxWidth: .infinity)

            Button {
                let next: Int?
                switch set.rir {
                case nil: next = 3
                case 3: next = 2
                case 2: next = 1
                case 1: next = 0
                default: next = nil
                }
                manager.exercises[ei].sets[setIndex].rir = next
            } label: {
                Text(set.rir.map(String.init) ?? "—")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(set.rir == nil ? Color(white: 0.45) : .white)
                    .frame(width: 40, height: 34)
                    .background(Color(white: 0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            .buttonStyle(.plain)

            Button {
                if set.isCompleted {
                    manager.exercises[ei].sets[setIndex].isCompleted = false
                    manager.handleSetToggle(exerciseIndex: ei, setIndex: setIndex, isCompleted: false)
                } else if canComplete {
                    logSet(at: setIndex)
                }
            } label: {
                Image(systemName: set.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 18))
                    .foregroundStyle(set.isCompleted ? EAColor.green : (isActive ? EAColor.blue : Color(white: 0.35)))
            }
            .buttonStyle(.plain)
            .frame(width: 30)
            .disabled(!canComplete && !set.isCompleted)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background(
            set.isCompleted
                ? EAColor.green.opacity(0.08)
                : (isActive ? EAColor.blue.opacity(0.12) : Color(white: 0.08))
        )
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(isActive ? EAColor.blue.opacity(0.45) : Color.clear, lineWidth: 1)
        )
    }

    // MARK: - Up next

    private var upNextSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("UP NEXT")
                .font(.system(size: 11, weight: .bold))
                .tracking(1.2)
                .foregroundStyle(EAColor.blue)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(Array(exercises.enumerated()), id: \.element.id) { index, exercise in
                        if index != safeExerciseIndex {
                            Button {
                                withAnimation { exerciseIndex = index }
                            } label: {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text("\(index + 1)")
                                            .font(.caption2.weight(.bold))
                                            .foregroundStyle(EAColor.blue)
                                        Spacer()
                                        ExerciseIconView(name: exercise.name, muscle: exercise.muscle, size: 28, compact: true)
                                    }
                                    Text(exercise.name)
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .lineLimit(2)
                                        .frame(width: 110, alignment: .leading)
                                    Text("\(exercise.sets.count) sets")
                                        .font(.caption2)
                                        .foregroundStyle(Color(white: 0.5))
                                }
                                .padding(12)
                                .background(EAColor.card)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        Text("No exercises in this session.")
            .foregroundStyle(Color(white: 0.55))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 40)
    }

    // MARK: - Rest drawer

    private var restDrawer: some View {
        TimelineView(.periodic(from: .now, by: 0.2)) { context in
            let remaining = manager.restTimer.remainingSeconds(at: context.date)
            let progress = manager.restTimer.progress(at: context.date)

            VStack(spacing: 0) {
                Capsule()
                    .fill(Color(white: 0.35))
                    .frame(width: 40, height: 4)
                    .padding(.top, 10)
                    .padding(.bottom, 14)

                HStack(alignment: .center, spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("REST")
                            .font(.system(size: 11, weight: .bold))
                            .tracking(1.2)
                            .foregroundStyle(Color(white: 0.55))
                        Text(currentExercise?.name ?? manager.dayName)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        Text("\(manager.restTimer.totalSeconds / 60):\(String(format: "%02d", manager.restTimer.totalSeconds % 60)) MIN")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(EAColor.blue)
                    }

                    Spacer(minLength: 4)

                    ZStack {
                        Circle()
                            .stroke(Color(white: 0.16), lineWidth: 8)
                            .frame(width: 88, height: 88)
                        Circle()
                            .trim(from: 0, to: progress)
                            .stroke(EAColor.blue, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                            .frame(width: 88, height: 88)
                        VStack(spacing: 2) {
                            Text(manager.restTimer.formattedRemaining(at: context.date))
                                .font(.system(size: 22, weight: .bold, design: .monospaced))
                                .foregroundStyle(.white)
                                .monospacedDigit()
                            Text("REMAINING")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundStyle(Color(white: 0.45))
                        }
                    }

                    Spacer(minLength: 4)

                    VStack(spacing: 8) {
                        Button {
                            manager.restTimer.adjust(bySeconds: 30)
                        } label: {
                            Text("+30s")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(EAColor.blue)
                                .frame(width: 56, height: 32)
                                .background(Color(white: 0.14))
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        }
                        .buttonStyle(.plain)

                        Button {
                            manager.restTimer.adjust(bySeconds: -15)
                        } label: {
                            Text("−15s")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(Color(white: 0.7))
                                .frame(width: 56, height: 32)
                                .background(Color(white: 0.14))
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        }
                        .buttonStyle(.plain)

                        Button {
                            manager.restTimer.cancel()
                            showRestSheet = false
                            advanceAfterRest()
                        } label: {
                            Text("SKIP")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 56, height: 32)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .stroke(Color.white.opacity(0.25), lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 28)
            }
            .frame(maxWidth: .infinity)
            .background(EAColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: .black.opacity(0.45), radius: 20, y: -4)
            .onChange(of: remaining) { _, newValue in
                if newValue == 0 {
                    manager.restTimer.finishIfExpired()
                    withAnimation { showRestSheet = false }
                    advanceAfterRest()
                }
            }
        }
        .padding(.horizontal, 8)
    }

    // MARK: - Actions

    private func logSet(at setIndex: Int) {
        guard !manager.isPaused else { return }
        let ei = safeExerciseIndex
        guard manager.exercises[ei].sets.indices.contains(setIndex) else { return }
        guard !manager.exercises[ei].sets[setIndex].isCompleted else { return }

        let exerciseName = manager.exercises[ei].name
        let setNumber = manager.exercises[ei].sets[setIndex].displayLabel

        manager.exercises[ei].sets[setIndex].isCompleted = true
        let wasAuto = manager.autoStartRest
        manager.handleSetToggle(exerciseIndex: ei, setIndex: setIndex, isCompleted: true)

        let set = manager.exercises[ei].sets[setIndex]
        let rest = manager.restSeconds(
            forSetNumber: set.setNumber,
            plannedSetCount: manager.exercises[ei].plannedSetCount,
            hasCrownSet: manager.exercises[ei].hasCrownSet
        )
        if !wasAuto || !manager.restTimer.isActive {
            manager.restTimer.start(
                seconds: rest,
                exerciseName: exerciseName,
                workoutName: manager.dayName
            )
        }
        withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
            showRestSheet = true
        }

        let completedInExercise = manager.exercises[ei].sets.filter(\.isCompleted).count
        let totalInExercise = manager.exercises[ei].sets.count
        let exerciseDone = !manager.exercises[ei].sets.contains(where: { !$0.isCompleted })

        if exerciseDone {
            let nextName = ei < manager.exercises.count - 1 ? manager.exercises[ei + 1].name : nil
            CelebrationCenter.shared.show(
                emoji: "✅",
                title: "\(exerciseName) done",
                subtitle: nextName.map { "Up next: \($0)" } ?? "Last exercise — finish when ready",
                tint: EAColor.green,
                duration: 2.0
            )
        } else {
            let restLabel = String(format: "%d:%02d", rest / 60, rest % 60)
            CelebrationCenter.shared.show(
                emoji: "💪",
                title: "Set \(setNumber) logged",
                subtitle: "\(completedInExercise)/\(totalInExercise) · rest \(restLabel)",
                tint: EAColor.blue
            )
        }

        let nextIncomplete = manager.exercises[ei].sets.firstIndex(where: { !$0.isCompleted })
        if let next = nextIncomplete {
            let justLogged = manager.exercises[ei].sets[setIndex]
            if manager.exercises[ei].sets[next].weight == 0 {
                manager.exercises[ei].sets[next].weight = justLogged.weight
            }
            if manager.exercises[ei].sets[next].reps <= 1 && justLogged.reps > 1 {
                manager.exercises[ei].sets[next].reps = justLogged.reps
            }
            if manager.exercises[ei].sets[next].rir == nil {
                manager.exercises[ei].sets[next].rir = justLogged.rir
            }
        }
    }

    private func advanceAfterRest() {
        let ei = safeExerciseIndex
        guard exercises.indices.contains(ei) else { return }
        if manager.exercises[ei].sets.contains(where: { !$0.isCompleted }) {
            return
        }
        if ei < exercises.count - 1 {
            withAnimation { exerciseIndex = ei + 1 }
        }
    }

    private func jumpToFirstIncomplete() {
        if let index = exercises.firstIndex(where: { $0.sets.contains(where: { !$0.isCompleted }) }) {
            exerciseIndex = index
        }
    }
}
