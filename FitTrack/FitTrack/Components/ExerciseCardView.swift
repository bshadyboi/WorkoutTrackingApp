import SwiftUI

struct ExerciseCardView: View {
    let exercise: StoredExercise

    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 0) {
            Button { withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() } } label: {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(exercise.name)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(AppTheme.textPrimary)
                        Text("\(exercise.muscle) · \(exercise.defaultSets) sets × \(exercise.defaultReps) reps · \(exercise.defaultWeight) \(exercise.unit)")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    Spacer()
                    if !exercise.videoURL.isEmpty {
                        Image(systemName: "play.rectangle")
                            .font(.caption)
                            .foregroundStyle(AppTheme.gold)
                    }
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(AppTheme.textSecondary.opacity(0.6))
                }
                .padding(.vertical, 16)
            }
            .buttonStyle(.plain)

            if isExpanded {
                if !exercise.instructions.isEmpty {
                    Text(exercise.instructions)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                        .lineSpacing(4)
                        .padding(.bottom, 10)
                }
                WatchDemoButton(videoURL: exercise.videoURL)
                    .padding(.bottom, 12)
            }

            GoldDivider()
        }
    }
}
