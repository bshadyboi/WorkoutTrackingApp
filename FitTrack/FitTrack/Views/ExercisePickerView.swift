import SwiftUI
import SwiftData

struct ExercisePickerView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \CustomExercise.createdAt, order: .reverse) private var customExercises: [CustomExercise]
    @Query(sort: \WorkoutSession.startedAt, order: .reverse) private var sessions: [WorkoutSession]

    let existingNames: Set<String>
    let onSelect: (ExerciseCatalogEntry) -> Void

    @State private var searchText = ""
    @State private var selectedMuscle: String?
    @State private var showAddCustom = false

    private var customEntries: [ExerciseCatalogEntry] {
        customExercises.map { $0.toCatalogEntry() }
    }

    private var sections: [(muscle: String, exercises: [ExerciseCatalogEntry])] {
        var grouped = ExerciseCatalogData.groupedByMuscle(filter: searchText)
        let custom = filteredCustomEntries
        if !custom.isEmpty {
            grouped.insert((muscle: "My Exercises", exercises: custom), at: 0)
        }
        if let selectedMuscle {
            grouped = grouped.filter { $0.muscle == selectedMuscle }
        }
        return grouped
    }

    private var filteredCustomEntries: [ExerciseCatalogEntry] {
        guard !searchText.isEmpty else { return customEntries }
        let query = searchText.lowercased()
        return customEntries.filter {
            $0.name.lowercased().contains(query) || $0.muscle.lowercased().contains(query)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                searchBar
                muscleFilters
                exerciseList
            }
            .background(AppTheme.background)
            .navigationTitle("Exercise Library")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showAddCustom = true
                    } label: {
                        Label("Custom", systemImage: "plus.circle")
                            .foregroundStyle(AppTheme.gold)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .sheet(isPresented: $showAddCustom) {
                AddCustomExerciseView { entry in
                    _ = BadgeService.awardNewBadges(context: modelContext, sessions: sessions)
                    onSelect(entry)
                    dismiss()
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(AppTheme.textSecondary)
            TextField("Search exercises...", text: $searchText)
                .foregroundStyle(AppTheme.textPrimary)
                .autocorrectionDisabled()
        }
        .padding(14)
        .background(AppTheme.surface)
        .padding(.horizontal, 24)
        .padding(.top, 12)
        .padding(.bottom, 8)
    }

    private var muscleFilters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filterChip(label: "All", muscle: nil)
                if !customEntries.isEmpty {
                    filterChip(label: "My Exercises", muscle: "My Exercises")
                }
                ForEach(ExerciseCatalogData.muscleGroups, id: \.self) { muscle in
                    filterChip(label: muscle, muscle: muscle)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
        }
    }

    private func filterChip(label: String, muscle: String?) -> some View {
        let isSelected = selectedMuscle == muscle
        return Button {
            withAnimation(.easeInOut(duration: 0.15)) {
                selectedMuscle = muscle
            }
        } label: {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(isSelected ? AppTheme.background : AppTheme.textSecondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(isSelected ? AppTheme.gold : AppTheme.surface)
                .overlay(
                    Rectangle()
                        .stroke(isSelected ? AppTheme.gold : AppTheme.gold.opacity(0.15), lineWidth: 0.5)
                )
        }
        .buttonStyle(.plain)
    }

    private var exerciseList: some View {
        ScrollView(showsIndicators: false) {
            LazyVStack(alignment: .leading, spacing: 20) {
                if sections.isEmpty {
                    Text("No exercises match your search.")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                        .padding(.top, 24)
                } else {
                    ForEach(sections, id: \.muscle) { section in
                        VStack(alignment: .leading, spacing: 0) {
                            PremiumLabel(text: section.muscle)
                                .padding(.bottom, 8)

                            ForEach(section.exercises) { entry in
                                exerciseRow(entry)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
    }

    private func exerciseRow(_ entry: ExerciseCatalogEntry) -> some View {
        let alreadyAdded = existingNames.contains(entry.name)

        return Button {
            guard !alreadyAdded else { return }
            onSelect(entry)
            dismiss()
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(entry.name)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(alreadyAdded ? AppTheme.textSecondary : AppTheme.textPrimary)
                    Text("\(entry.equipment) · \(entry.defaultSets) × \(entry.defaultReps)")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }

                Spacer()

                if alreadyAdded {
                    Text("Added")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                } else if !entry.videoURL.isEmpty {
                    Image(systemName: "play.rectangle")
                        .font(.caption)
                        .foregroundStyle(AppTheme.gold)
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(AppTheme.textSecondary.opacity(0.5))
            }
            .padding(.vertical, 14)
            .overlay(alignment: .bottom) { GoldDivider() }
        }
        .buttonStyle(.plain)
        .disabled(alreadyAdded)
    }
}

struct ConfigureExerciseSheet: View {
    @Environment(\.dismiss) private var dismiss

    let entry: ExerciseCatalogEntry
    let onAdd: (Int, Int, Int) -> Void

    @State private var sets: Int
    @State private var reps: Int
    @State private var weight: Int

    init(entry: ExerciseCatalogEntry, onAdd: @escaping (Int, Int, Int) -> Void) {
        self.entry = entry
        self.onAdd = onAdd
        _sets = State(initialValue: entry.defaultSets)
        _reps = State(initialValue: entry.defaultReps)
        _weight = State(initialValue: entry.defaultWeight)
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(entry.name)
                            .font(.system(size: 22, weight: .medium))
                            .foregroundStyle(AppTheme.textPrimary)
                        Text("\(entry.muscle) · \(entry.equipment)")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }

                    if !entry.instructions.isEmpty {
                        Text(entry.instructions)
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                            .lineSpacing(4)
                    }

                    WatchDemoButton(videoURL: entry.videoURL)

                    VStack(spacing: 0) {
                        configRow(label: "Sets") {
                            Stepper("\(sets)", value: $sets, in: 1...10)
                                .labelsHidden()
                            Text("\(sets)")
                                .font(.system(size: 16, weight: .medium, design: .monospaced))
                                .foregroundStyle(AppTheme.gold)
                                .frame(width: 32)
                        }
                        GoldDivider()
                        configRow(label: "Reps") {
                            Stepper("\(reps)", value: $reps, in: 1...30)
                                .labelsHidden()
                            Text("\(reps)")
                                .font(.system(size: 16, weight: .medium, design: .monospaced))
                                .foregroundStyle(AppTheme.gold)
                                .frame(width: 32)
                        }
                        GoldDivider()
                        configRow(label: "Weight (lbs)") {
                            Stepper("\(weight)", value: $weight, in: 0...500, step: 5)
                                .labelsHidden()
                            Text("\(weight)")
                                .font(.system(size: 16, weight: .medium, design: .monospaced))
                                .foregroundStyle(AppTheme.gold)
                                .frame(width: 40)
                        }
                    }
                    .padding(.vertical, 4)
                    .background(AppTheme.surface.opacity(0.5))

                    PremiumButton(title: "Add to Workout", icon: "plus") {
                        onAdd(sets, reps, weight)
                        dismiss()
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
            .background(AppTheme.background)
            .navigationTitle("Configure")
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

    private func configRow<Content: View>(label: String, @ViewBuilder content: () -> Content) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 15))
                .foregroundStyle(AppTheme.textPrimary)
            Spacer()
            content()
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
    }
}
