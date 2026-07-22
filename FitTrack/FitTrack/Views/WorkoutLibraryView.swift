import SwiftUI
import SwiftData

struct WorkoutLibraryView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var settings: AppSettings
    @Query(sort: \WorkoutDay.sortOrder) private var workouts: [WorkoutDay]

    @State private var editingDay: WorkoutDay?

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Pick a workout for today. Your exercises and sets will switch instantly.")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)

                    VStack(spacing: 0) {
                        ForEach(workouts) { day in
                            workoutRow(day)
                        }
                    }

                    PremiumButton(title: "Create New Workout", icon: "plus", style: .outline) {
                        createWorkout()
                    }
                    .padding(.top, 8)
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)
                .padding(.bottom, 32)
            }
            .background(AppTheme.background)
            .navigationTitle("Workout Catalog")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(AppTheme.gold)
                }
            }
            .sheet(item: $editingDay) { day in
                EditProgramView(day: day)
            }
        }
        .preferredColorScheme(.dark)
    }

    private func workoutRow(_ day: WorkoutDay) -> some View {
        let isSelected = settings.selectedWorkoutDayID == day.id

        return VStack(spacing: 0) {
            Button {
                select(day)
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(isSelected ? AppTheme.gold : AppTheme.textSecondary)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(day.name)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(AppTheme.textPrimary)
                        Text("\(day.exercises.count) exercises · \(day.totalSets) sets")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        if isSelected {
                            Text("Currently active")
                                .font(.caption2)
                                .foregroundStyle(AppTheme.gold)
                        }
                    }

                    Spacer()

                    Text(isSelected ? "Active" : "Use")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(isSelected ? AppTheme.gold : AppTheme.textSecondary)
                }
                .padding(.vertical, 16)
            }
            .buttonStyle(.plain)

            HStack(spacing: 0) {
                Spacer()
                Button { editingDay = day } label: {
                    Label("Edit", systemImage: "pencil")
                        .font(.caption)
                        .foregroundStyle(AppTheme.gold)
                        .padding(.vertical, 8)
                        .padding(.horizontal, 12)
                }
                .buttonStyle(.plain)

                if workouts.count > 1 {
                    Button { deleteWorkout(day) } label: {
                        Label("Delete", systemImage: "trash")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                            .padding(.vertical, 8)
                            .padding(.horizontal, 12)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.bottom, 8)

            GoldDivider()
        }
    }

    private func select(_ day: WorkoutDay) {
        settings.selectedWorkoutDayID = day.id
        try? modelContext.save()
        dismiss()
    }

    private func createWorkout() {
        let sortOrder = (workouts.map(\.sortOrder).max() ?? -1) + 1
        let day = WorkoutDay(
            name: "New Workout",
            subtitle: "Tap edit to add exercises",
            sortOrder: sortOrder
        )
        modelContext.insert(day)
        settings.selectedWorkoutDayID = day.id
        try? modelContext.save()
        editingDay = day
    }

    private func deleteWorkout(_ day: WorkoutDay) {
        if settings.selectedWorkoutDayID == day.id {
            settings.selectedWorkoutDayID = workouts.first { $0.id != day.id }?.id
        }
        modelContext.delete(day)
        try? modelContext.save()
    }
}
