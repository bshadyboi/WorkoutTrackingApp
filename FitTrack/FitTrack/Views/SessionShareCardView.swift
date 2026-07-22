import SwiftUI

struct SessionShareCardView: View {
    let summary: WorkoutSummaryData
    let displayName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("FITTRACK")
                        .font(.system(size: 10, weight: .medium))
                        .tracking(3)
                        .foregroundStyle(AppTheme.gold)
                    Text(summary.dayName)
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(AppTheme.textPrimary)
                    Text(displayName)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                Spacer()
                Image(systemName: "figure.strengthtraining.traditional")
                    .font(.system(size: 28))
                    .foregroundStyle(AppTheme.gold)
            }

            HStack(spacing: 0) {
                stat("Duration", value: formattedDuration)
                stat("Sets", value: "\(summary.completedSets)")
                stat("Burn", value: "\(summary.estimatedCalories)")
            }

            if !summary.prsHit.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("PERSONAL RECORDS")
                        .font(.system(size: 9, weight: .medium))
                        .tracking(2)
                        .foregroundStyle(AppTheme.gold)
                    ForEach(summary.prsHit.prefix(3)) { pr in
                        Text("\(pr.exerciseName) — \(pr.weight) lbs")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                }
            }

            Text(Date.now.formatted(.dateTime.month(.abbreviated).day().year()))
                .font(.caption2)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .padding(24)
        .frame(width: 320)
        .background(AppTheme.background)
        .overlay(Rectangle().stroke(AppTheme.gold.opacity(0.4), lineWidth: 1))
    }

    private var formattedDuration: String {
        let m = summary.durationSeconds / 60
        let s = summary.durationSeconds % 60
        return String(format: "%d:%02d", m, s)
    }

    private func stat(_ label: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 8, weight: .medium))
                .tracking(1.5)
                .foregroundStyle(AppTheme.textSecondary)
            Text(value)
                .font(.system(size: 18, weight: .light, design: .monospaced))
                .foregroundStyle(AppTheme.textPrimary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

@MainActor
enum SessionShareRenderer {
    static func image(for summary: WorkoutSummaryData, displayName: String) -> UIImage? {
        let view = SessionShareCardView(summary: summary, displayName: displayName)
        let renderer = ImageRenderer(content: view)
        renderer.scale = UIScreen.main.scale
        return renderer.uiImage
    }
}
