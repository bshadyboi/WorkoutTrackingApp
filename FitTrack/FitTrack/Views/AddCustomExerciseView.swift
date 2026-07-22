import SwiftUI
import SwiftData

struct AddCustomExerciseView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let onCreated: (ExerciseCatalogEntry) -> Void

    @State private var name = ""
    @State private var muscle = "General"
    @State private var equipment = "Custom"
    @State private var videoURL = ""
    @State private var instructions = ""
    @State private var sets = 3
    @State private var reps = 10
    @State private var weight = 0

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20) {
                    PremiumScreenTitle(eyebrow: "Custom", title: "New Exercise")

                    field("Exercise name", text: $name)
                    field("Muscle group", text: $muscle)
                    field("Equipment", text: $equipment)
                    field("YouTube URL (optional)", text: $videoURL)

                    VStack(alignment: .leading, spacing: 8) {
                        PremiumLabel(text: "Instructions")
                        TextField("Optional form notes", text: $instructions, axis: .vertical)
                            .lineLimit(3...5)
                            .padding(14)
                            .background(AppTheme.surface)
                            .foregroundStyle(AppTheme.textPrimary)
                    }

                    Stepper("Sets: \(sets)", value: $sets, in: 1...10)
                    Stepper("Reps: \(reps)", value: $reps, in: 1...30)
                    Stepper("Weight: \(weight) lbs", value: $weight, in: 0...500, step: 5)

                    PremiumButton(title: "Save Exercise", icon: "plus") {
                        save()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .opacity(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
            .background(AppTheme.background)
            .navigationTitle("Custom Exercise")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func field(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            PremiumLabel(text: label)
            TextField(label, text: text)
                .padding(14)
                .background(AppTheme.surface)
                .foregroundStyle(AppTheme.textPrimary)
                .autocorrectionDisabled()
        }
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let custom = CustomExercise(
            name: trimmed,
            muscle: muscle.isEmpty ? "General" : muscle,
            equipment: equipment.isEmpty ? "Custom" : equipment,
            instructions: instructions,
            videoURL: videoURL.trimmingCharacters(in: .whitespacesAndNewlines),
            defaultSets: sets,
            defaultReps: reps,
            defaultWeight: weight
        )
        modelContext.insert(custom)
        try? modelContext.save()

        onCreated(custom.toCatalogEntry())
        dismiss()
    }
}
