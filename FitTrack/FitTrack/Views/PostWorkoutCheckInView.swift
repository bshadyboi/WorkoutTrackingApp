import SwiftUI
import SwiftData

struct PostWorkoutCheckInView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var manager: WorkoutSessionManager

    @State private var energy = 2
    @State private var soreness = 1
    @State private var notes = ""

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 28) {
                    PremiumScreenTitle(eyebrow: "Check-In", title: "How was it?")

                    ratingSection(title: "Energy", selection: $energy, options: [
                        (1, "Low"), (2, "OK"), (3, "Great"),
                    ])

                    ratingSection(title: "Soreness", selection: $soreness, options: [
                        (1, "None"), (2, "Moderate"), (3, "Sore"),
                    ])

                    VStack(alignment: .leading, spacing: 8) {
                        PremiumLabel(text: "Notes")
                        TextField("Optional session notes", text: $notes, axis: .vertical)
                            .lineLimit(3...6)
                            .padding(14)
                            .background(AppTheme.surface)
                            .foregroundStyle(AppTheme.textPrimary)
                    }

                    if !manager.prsHit.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            PremiumLabel(text: "PRs This Session")
                            ForEach(manager.prsHit) { pr in
                                Text("\(pr.exerciseName) — \(pr.weight) lbs")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.gold)
                            }
                        }
                    }

                    PremiumButton(title: "Save & Finish") {
                        manager.saveCheckIn(energy: energy, soreness: soreness, notes: notes, context: modelContext)
                    }

                    Button("Skip") {
                        manager.skipCheckIn(context: modelContext)
                    }
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 32)
            }
            .background(AppTheme.background)
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(.dark)
        .interactiveDismissDisabled()
    }

    private func ratingSection(title: String, selection: Binding<Int>, options: [(Int, String)]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            PremiumLabel(text: title)
            HStack(spacing: 8) {
                ForEach(options, id: \.0) { value, label in
                    Button {
                        selection.wrappedValue = value
                    } label: {
                        Text(label)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(selection.wrappedValue == value ? AppTheme.background : AppTheme.textSecondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(selection.wrappedValue == value ? AppTheme.gold : AppTheme.surface)
                            .overlay(Rectangle().stroke(AppTheme.gold.opacity(0.2), lineWidth: 0.5))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}
