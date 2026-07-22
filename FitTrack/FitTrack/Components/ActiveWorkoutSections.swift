import SwiftUI

enum ActiveWorkoutField: Hashable {
    case weight(UUID)
    case reps(UUID)
}

struct WorkoutSessionHeader: View {
    let startedAt: Date
    let completedSets: Int
    let totalSets: Int
    let prBanner: PRAlert?
    @Bindable var restTimer: RestTimerManager
    let onCancelRest: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            if let prBanner {
                PRBannerView(alert: prBanner)
            }

            SessionTimerView(startedAt: startedAt)

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("\(completedSets) of \(totalSets) sets")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                    Spacer()
                    Text("\(progressPercent)%")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(AppTheme.gold)
                }
                PremiumProgressBar(value: progressValue)
                    .frame(height: 2)
            }

            if restTimer.isActive {
                RestTimerBar(restTimer: restTimer, onCancel: onCancelRest)
            }
        }
    }

    private var progressValue: Double {
        guard totalSets > 0 else { return 0 }
        return Double(completedSets) / Double(totalSets)
    }

    private var progressPercent: Int {
        Int(progressValue * 100)
    }
}

struct ActiveExerciseList: View {
    let exercises: [ActiveExercise]
    let lastSessionByExercise: [String: String]
    @Binding var expandedExerciseID: UUID?
    var focusedField: FocusState<ActiveWorkoutField?>.Binding
    var onSetToggle: (Int, Int, Bool) -> Void
    var onWeightChange: (Int, Int, Int) -> Void
    var onRepsChange: (Int, Int, Int) -> Void
    var onRIRChange: (Int, Int, Int?) -> Void

    var body: some View {
        ForEach(exercises.indices, id: \.self) { exerciseIndex in
            ActiveExerciseCard(
                exercise: exercises[exerciseIndex],
                exerciseIndex: exerciseIndex,
                lastSession: lastSessionByExercise[exercises[exerciseIndex].name],
                expandedExerciseID: $expandedExerciseID,
                focusedField: focusedField,
                onSetToggle: onSetToggle,
                onWeightChange: onWeightChange,
                onRepsChange: onRepsChange,
                onRIRChange: onRIRChange
            )
        }
    }
}

private struct ActiveExerciseCard: View {
    let exercise: ActiveExercise
    let exerciseIndex: Int
    let lastSession: String?
    @Binding var expandedExerciseID: UUID?
    var focusedField: FocusState<ActiveWorkoutField?>.Binding
    var onSetToggle: (Int, Int, Bool) -> Void
    var onWeightChange: (Int, Int, Int) -> Void
    var onRepsChange: (Int, Int, Int) -> Void
    var onRIRChange: (Int, Int, Int?) -> Void

    private var isExpanded: Bool {
        expandedExerciseID == exercise.id
    }

    var body: some View {
        VStack(spacing: 0) {
            Button {
                expandedExerciseID = isExpanded ? nil : exercise.id
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(exercise.name)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(AppTheme.gold)
                        if let lastSession {
                            Text("Previous: \(lastSession)")
                                .font(.caption)
                                .foregroundStyle(AppTheme.gold.opacity(0.85))
                        }
                        Text(exercise.muscle)
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    Spacer()
                    Text("\(exercise.sets.filter(\.isCompleted).count)/\(exercise.sets.count)")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(AppTheme.gold)
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                .padding(.vertical, 16)
            }
            .buttonStyle(.plain)

            if isExpanded {
                HStack {
                    Spacer()
                    WatchDemoButton(videoURL: exercise.videoURL, compact: true)
                }
                .padding(.bottom, 8)

                HStack(spacing: 8) {
                    Text("Set")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(width: 28, alignment: .leading)
                    Text("lbs")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity)
                    Text("Reps")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity)
                    Text("RIR")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(width: 44)
                    Spacer().frame(width: 28)
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 8)

                ForEach(exercise.sets.indices, id: \.self) { setIndex in
                    ActiveSetRow(
                        set: exercise.sets[setIndex],
                        exerciseIndex: exerciseIndex,
                        setIndex: setIndex,
                        focusedField: focusedField,
                        onSetToggle: onSetToggle,
                        onWeightChange: onWeightChange,
                        onRepsChange: onRepsChange,
                        onRIRChange: onRIRChange
                    )
                }
                .padding(.bottom, 12)
            }

            GoldDivider()
        }
    }
}

private struct ActiveSetRow: View {
    let set: ActiveSet
    let exerciseIndex: Int
    let setIndex: Int
    var focusedField: FocusState<ActiveWorkoutField?>.Binding
    var onSetToggle: (Int, Int, Bool) -> Void
    var onWeightChange: (Int, Int, Int) -> Void
    var onRepsChange: (Int, Int, Int) -> Void
    var onRIRChange: (Int, Int, Int?) -> Void

    var body: some View {
        HStack(spacing: 8) {
            Text(set.displayLabel)
                .font(.caption.monospacedDigit().weight(.semibold))
                .foregroundStyle(AppTheme.textSecondary)
                .frame(width: 28, alignment: .leading)

            SetValueField(
                value: Binding(
                    get: { set.weight },
                    set: { onWeightChange(exerciseIndex, setIndex, $0) }
                ),
                minimum: 0,
                focused: focusedField,
                equals: .weight(set.id)
            )

            SetValueField(
                value: Binding(
                    get: { set.reps },
                    set: { onRepsChange(exerciseIndex, setIndex, $0) }
                ),
                minimum: 1,
                focused: focusedField,
                equals: .reps(set.id)
            )

            Button {
                let next: Int?
                switch set.rir {
                case nil: next = 3
                case 3: next = 2
                case 2: next = 1
                case 1: next = 0
                default: next = nil
                }
                onRIRChange(exerciseIndex, setIndex, next)
            } label: {
                Text(set.rir.map(String.init) ?? "RIR")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(set.rir == nil ? AppTheme.textSecondary : AppTheme.textPrimary)
                    .frame(width: 44, height: 34)
                    .background(AppTheme.inputBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            .buttonStyle(.plain)

            Button {
                onSetToggle(exerciseIndex, setIndex, !set.isCompleted)
            } label: {
                Image(systemName: set.isCompleted ? "checkmark" : "circle")
                    .foregroundStyle(set.isCompleted ? AppTheme.success : AppTheme.textSecondary)
                    .frame(width: 28, height: 28)
                    .overlay(Circle().stroke(set.isCompleted ? AppTheme.success : AppTheme.textSecondary.opacity(0.4), lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 8)
        .background(
            set.isCompleted
                ? AppTheme.success.opacity(0.08)
                : AppTheme.surface.opacity(0.5)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
