import SwiftUI

struct WorkoutSummaryView: View {
    let summary: WorkoutSummaryData
    let displayName: String
    let onDone: () -> Void

    @State private var showShare = false

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 28) {
                    PremiumScreenTitle(eyebrow: "Session Complete", title: summary.dayName)

                    SessionShareCardView(summary: summary, displayName: displayName)
                        .clipShape(Rectangle())
                        .overlay(Rectangle().stroke(AppTheme.gold.opacity(0.2), lineWidth: 0.5))

                    HStack(spacing: 0) {
                        summaryColumn(label: "Duration", value: formattedDuration)
                        Rectangle().fill(AppTheme.gold.opacity(0.22)).frame(width: 0.5, height: 48)
                        summaryColumn(label: "Sets", value: "\(summary.completedSets)/\(summary.totalSets)")
                        Rectangle().fill(AppTheme.gold.opacity(0.22)).frame(width: 0.5, height: 48)
                        summaryColumn(label: "Burn", value: "\(summary.estimatedCalories)")
                    }

                    if !summary.prsHit.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            PremiumLabel(text: "Personal Records")
                            ForEach(summary.prsHit) { pr in
                                HStack {
                                    Image(systemName: "trophy.fill")
                                        .foregroundStyle(AppTheme.gold)
                                    Text("\(pr.exerciseName) — \(pr.weight) lbs × \(pr.reps)")
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                            }
                        }
                    }

                    if summary.energyLevel > 0 || summary.sorenessLevel > 0 {
                        VStack(alignment: .leading, spacing: 8) {
                            PremiumLabel(text: "Check-In")
                            if summary.energyLevel > 0 {
                                Text("Energy: \(WorkoutAnalytics.energyLabel(summary.energyLevel))")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                            if summary.sorenessLevel > 0 {
                                Text("Soreness: \(WorkoutAnalytics.sorenessLabel(summary.sorenessLevel))")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                            if !summary.sessionNotes.isEmpty {
                                Text(summary.sessionNotes)
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                        }
                    }

                    Text("Saved to your history. Keep the streak going.")
                        .font(.body)
                        .foregroundStyle(AppTheme.textSecondary)

                    PremiumButton(title: "Share Session", icon: "square.and.arrow.up") {
                        showShare = true
                    }

                    PremiumButton(title: "Done", action: onDone)
                }
                .padding(.horizontal, 24)
                .padding(.top, 32)
                .padding(.bottom, 24)
            }
            .background(AppTheme.background)
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showShare) {
            if let image = SessionShareRenderer.image(for: summary, displayName: displayName) {
                ShareSheet(items: [image, shareText])
            }
        }
    }

    private var shareText: String {
        "Just finished \(summary.dayName) on FitTrack — \(summary.completedSets) sets logged!"
    }

    private var formattedDuration: String {
        let minutes = summary.durationSeconds / 60
        let seconds = summary.durationSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    private func summaryColumn(label: String, value: String) -> some View {
        VStack(spacing: 6) {
            PremiumLabel(text: label)
            Text(value)
                .font(AppTheme.displayLight(24))
                .foregroundStyle(AppTheme.textPrimary)
        }
        .frame(maxWidth: .infinity)
    }
}
