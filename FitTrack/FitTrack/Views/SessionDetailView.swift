import SwiftUI

struct SessionDetailView: View {
    let session: WorkoutSession

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 24) {
                PremiumScreenTitle(
                    eyebrow: session.startedAt.formatted(.dateTime.month(.abbreviated).day().year()),
                    title: session.dayName
                )

                HStack(spacing: 0) {
                    stat("Duration", value: formattedDuration)
                    divider
                    stat("Sets", value: "\(session.completedSetsCount)")
                    divider
                    stat("Burn", value: "\(session.estimatedCalories)")
                }

                if session.energyLevel > 0 || session.sorenessLevel > 0 || !session.sessionNotes.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        PremiumLabel(text: "Check-In")
                        if session.energyLevel > 0 {
                            Text("Energy: \(WorkoutAnalytics.energyLabel(session.energyLevel))")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        if session.sorenessLevel > 0 {
                            Text("Soreness: \(WorkoutAnalytics.sorenessLabel(session.sorenessLevel))")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        if !session.sessionNotes.isEmpty {
                            Text(session.sessionNotes)
                                .font(.caption)
                                .foregroundStyle(AppTheme.textPrimary)
                                .padding(.top, 4)
                        }
                    }
                }

                if !session.prsHit.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        PremiumLabel(text: "Personal Records")
                        ForEach(session.prsHit, id: \.self) { name in
                            Text(name)
                                .font(.caption)
                                .foregroundStyle(AppTheme.gold)
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 0) {
                    PremiumLabel(text: "Exercises")
                        .padding(.bottom, 12)
                    ForEach(session.exerciseLogs.sorted(by: { $0.exerciseName < $1.exerciseName })) { log in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(log.exerciseName)
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(AppTheme.textPrimary)
                            ForEach(log.sets.sorted(by: { $0.setNumber < $1.setNumber })) { set in
                                Text("Set \(set.setNumber): \(WeightFormat.display(set.weight)) lbs × \(set.reps) reps")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                        .padding(.vertical, 12)
                        GoldDivider()
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 32)
        }
        .background(AppTheme.background)
        .navigationTitle("Session")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var formattedDuration: String {
        let m = session.durationSeconds / 60
        let s = session.durationSeconds % 60
        return String(format: "%d:%02d", m, s)
    }

    private func stat(_ label: String, value: String) -> some View {
        VStack(spacing: 6) {
            PremiumLabel(text: label)
            Text(value)
                .font(AppTheme.displayLight(22))
                .foregroundStyle(AppTheme.textPrimary)
        }
        .frame(maxWidth: .infinity)
    }

    private var divider: some View {
        Rectangle().fill(AppTheme.gold.opacity(0.22)).frame(width: 0.5, height: 40)
    }
}
