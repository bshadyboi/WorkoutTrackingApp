import SwiftUI
import SwiftData

struct EditProgramView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var day: WorkoutDay
    @Query private var settingsList: [AppSettings]

    @State private var showExercisePicker = false
    @State private var pendingEntry: ExerciseCatalogEntry?
    @State private var editMode: EditMode = .inactive

    private var sortedExercises: [StoredExercise] {
        day.exercises.sorted { $0.sortOrder < $1.sortOrder }
    }

    private var existingExerciseNames: Set<String> {
        Set(day.exercises.map(\.name))
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        PremiumLabel(text: "Workout Name")
                        TextField("Name", text: $day.name)
                            .foregroundStyle(AppTheme.textPrimary)
                        TextField("Subtitle", text: $day.subtitle)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .listRowBackground(AppTheme.surface)
                    .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
                }

                if let settings = settingsList.first {
                    Section {
                        VStack(alignment: .leading, spacing: 8) {
                            PremiumLabel(text: "Program")
                            TextField("Program name", text: Binding(
                                get: { settings.programName },
                                set: { settings.programName = $0 }
                            ))
                            .foregroundStyle(AppTheme.textPrimary)
                            TextField("Program subtitle", text: Binding(
                                get: { settings.programSubtitle },
                                set: { settings.programSubtitle = $0 }
                            ))
                            .foregroundStyle(AppTheme.textSecondary)
                        }
                        .listRowBackground(AppTheme.surface)
                        .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
                    }
                }

                Section {
                    if sortedExercises.isEmpty {
                        Text("No exercises yet. Add from the library below.")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                            .listRowBackground(AppTheme.background)
                    } else {
                        ForEach(sortedExercises) { exercise in
                            exerciseRow(exercise)
                                .listRowBackground(AppTheme.background)
                        }
                        .onMove(perform: moveExercises)
                        .onDelete(perform: deleteExercises)
                    }

                    Button {
                        showExercisePicker = true
                    } label: {
                        Label("Add from Library", systemImage: "books.vertical")
                            .foregroundStyle(AppTheme.gold)
                    }
                    .listRowBackground(AppTheme.surface)
                } header: {
                    HStack {
                        PremiumLabel(text: "Exercises")
                        Spacer()
                        if !sortedExercises.isEmpty {
                            Text(editMode.isEditing ? "Drag to reorder" : "Tap Reorder")
                                .font(.caption2)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                    }
                } footer: {
                    Text("\(ExerciseCatalogData.all.count) exercises available with form videos")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(AppTheme.background)
            .environment(\.editMode, $editMode)
            .navigationTitle("Edit Workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !sortedExercises.isEmpty {
                        Button(editMode.isEditing ? "Done" : "Reorder") {
                            withAnimation {
                                editMode = editMode.isEditing ? .inactive : .active
                            }
                        }
                        .foregroundStyle(AppTheme.gold)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        normalizeSortOrder()
                        save()
                        dismiss()
                    }
                    .foregroundStyle(AppTheme.gold)
                }
            }
            .sheet(isPresented: $showExercisePicker) {
                ExercisePickerView(existingNames: existingExerciseNames) { entry in
                    pendingEntry = entry
                }
            }
            .sheet(item: $pendingEntry) { entry in
                ConfigureExerciseSheet(entry: entry) { sets, reps, weight in
                    addExercise(from: entry, sets: sets, reps: reps, weight: weight)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func exerciseRow(_ exercise: StoredExercise) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(exercise.name)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(AppTheme.textPrimary)
            Text("\(exercise.defaultSets) × \(exercise.defaultReps) · \(exercise.defaultWeight) \(exercise.unit)")
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
            if !exercise.videoURL.isEmpty {
                WatchDemoButton(videoURL: exercise.videoURL, compact: true)
            }
        }
        .padding(.vertical, 4)
    }

    private func moveExercises(from source: IndexSet, to destination: Int) {
        var ordered = sortedExercises
        ordered.move(fromOffsets: source, toOffset: destination)
        for (index, exercise) in ordered.enumerated() {
            exercise.sortOrder = index
        }
    }

    private func deleteExercises(at offsets: IndexSet) {
        let toDelete = offsets.map { sortedExercises[$0] }
        for exercise in toDelete {
            day.exercises.removeAll { $0.id == exercise.id }
            modelContext.delete(exercise)
        }
        normalizeSortOrder()
    }

    private func normalizeSortOrder() {
        for (index, exercise) in sortedExercises.enumerated() {
            exercise.sortOrder = index
        }
    }

    private func addExercise(from entry: ExerciseCatalogEntry, sets: Int, reps: Int, weight: Int) {
        let exercise = entry.makeStoredExercise(sortOrder: day.exercises.count)
        exercise.defaultSets = sets
        exercise.defaultReps = reps
        exercise.defaultWeight = weight
        exercise.day = day
        day.exercises.append(exercise)
        modelContext.insert(exercise)
    }

    private func save() {
        try? modelContext.save()
    }
}
