import SwiftUI
import SwiftData

struct ProgressScreen: View {
    let sessions: [WorkoutSession]
    let health: HealthKitManager
    let earnedBadges: [EarnedBadge]

    @Environment(\.modelContext) private var modelContext
    @Query(sort: \BodyWeightLog.loggedAt, order: .reverse) private var bodyWeights: [BodyWeightLog]

    @State private var weightInput = ""
    @State private var selectedExercise = ""

    private var completedSessions: [WorkoutSession] {
        sessions.filter { $0.endedAt != nil }
    }

    private var personalRecords: [PersonalRecordDisplay] {
        WorkoutAnalytics.personalRecords(from: completedSessions)
    }

    private var workoutDays: Set<Int> {
        WorkoutAnalytics.workoutDaysInMonth(from: completedSessions)
    }

    private var weeklySteps: [(day: String, steps: Int)] {
        health.weeklySteps.isEmpty ? placeholderWeeklySteps : health.weeklySteps
    }

    private var weeklySummary: WeeklySummary {
        WorkoutAnalytics.weeklySummary(from: completedSessions)
    }

    private var trackedExercises: [String] {
        let top = WorkoutAnalytics.topTrackedExercises(from: completedSessions)
        if top.isEmpty {
            return ["Barbell Bench Press", "Barbell Back Squat", "Deadlift"]
        }
        return top
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 28) {
                    PremiumScreenTitle(eyebrow: "Stats", title: "Progress")

                    weeklySummaryCard

                    BadgesView(earnedBadges: earnedBadges)

                    HStack(spacing: 0) {
                        statColumn(label: "Streak", value: "\(weeklySummary.streak)", unit: "days")
                        Rectangle().fill(AppTheme.gold.opacity(0.22)).frame(width: 0.5, height: 56)
                        statColumn(label: "Sessions", value: "\(completedSessions.count)", unit: "total")
                    }

                    strengthSection
                    bodyWeightSection
                    sessionHistorySection
                    weeklyStepsSection
                    personalRecordsSection
                    calendarSection
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 32)
            }
            .background(AppTheme.background)
            .onAppear {
                if selectedExercise.isEmpty {
                    selectedExercise = trackedExercises.first ?? ""
                }
            }
        }
    }

    private var weeklySummaryCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            PremiumLabel(text: "This Week")
            Text("\(weeklySummary.sessionCount) sessions · \(weeklySummary.totalSets) sets · \(weeklySummary.prCount) PRs")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(AppTheme.textPrimary)
        }
        .padding(.vertical, 4)
    }

    private var strengthSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            PremiumLabel(text: "Strength Progress")
            if completedSessions.isEmpty {
                Text("Complete workouts to track strength over time.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            } else {
                Picker("Exercise", selection: $selectedExercise) {
                    ForEach(trackedExercises, id: \.self) { name in
                        Text(name).tag(name)
                    }
                }
                .pickerStyle(.menu)
                .tint(AppTheme.gold)

                StrengthChartView(
                    exerciseName: selectedExercise,
                    dataPoints: WorkoutAnalytics.strengthHistory(for: selectedExercise, sessions: completedSessions)
                )
            }
            GoldDivider()
        }
    }

    private var bodyWeightSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            PremiumLabel(text: "Body Weight")
            HStack(spacing: 10) {
                TextField("lbs", text: $weightInput)
                    .keyboardType(.decimalPad)
                    .padding(12)
                    .background(AppTheme.surface)
                    .foregroundStyle(AppTheme.textPrimary)
                    .frame(width: 100)
                Button("Log") { logWeight() }
                    .font(.caption.weight(.medium))
                    .foregroundStyle(AppTheme.gold)
            }
            if let latest = bodyWeights.first {
                Text("Latest: \(latest.weightLbs, specifier: "%.1f") lbs · \(latest.loggedAt.formatted(.dateTime.month(.abbreviated).day()))")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            GoldDivider()
        }
    }

    private var sessionHistorySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            PremiumLabel(text: "Session History")
            if completedSessions.isEmpty {
                Text("Your completed workouts will appear here.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            } else {
                ForEach(completedSessions.prefix(10)) { session in
                    NavigationLink {
                        SessionDetailView(session: session)
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(session.dayName)
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text(session.startedAt.formatted(.dateTime.month(.abbreviated).day().hour().minute()))
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                            Spacer()
                            if !session.prsHit.isEmpty {
                                Text("\(session.prsHit.count) PR")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.gold)
                            }
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .padding(.vertical, 12)
                    }
                    GoldDivider()
                }
            }
        }
    }

    private func logWeight() {
        guard let weight = Double(weightInput), weight > 0 else { return }
        modelContext.insert(BodyWeightLog(weightLbs: weight))
        try? modelContext.save()
        weightInput = ""
    }

    private var weeklyStepsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                PremiumLabel(text: "Weekly Steps")
                Spacer()
                if !health.weeklySteps.isEmpty {
                    Text("Live from Health")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            let maxSteps = max(weeklySteps.map(\.steps).max() ?? 1, 1)
            HStack(alignment: .bottom, spacing: 6) {
                ForEach(Array(weeklySteps.enumerated()), id: \.offset) { index, item in
                    VStack(spacing: 6) {
                        Rectangle()
                            .fill(isToday(index) ? AppTheme.gold : AppTheme.gold.opacity(0.25))
                            .frame(height: max(4, CGFloat(item.steps) / CGFloat(maxSteps) * 80))
                        Text(item.day)
                            .font(.caption2)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 100, alignment: .bottom)
            GoldDivider()
        }
    }

    private var personalRecordsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            PremiumLabel(text: "Personal Records")
            if personalRecords.isEmpty {
                Text("Log workouts to track personal records automatically.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                    .padding(.vertical, 8)
            } else {
                ForEach(personalRecords) { pr in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(pr.lift)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(AppTheme.textPrimary)
                            Text(pr.date)
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(pr.weight)
                                .font(.system(size: 16, weight: .medium))
                            Text(pr.delta)
                                .font(.caption)
                                .foregroundStyle(AppTheme.gold)
                        }
                    }
                    .padding(.vertical, 12)
                    GoldDivider()
                }
            }
        }
    }

    private var calendarSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            PremiumLabel(text: Date.now.formatted(.dateTime.month(.wide).year()))
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7), spacing: 4) {
                ForEach(["M", "T", "W", "T", "F", "S", "S"], id: \.self) { d in
                    Text(d)
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                ForEach(1...daysInCurrentMonth(), id: \.self) { day in
                    let isWorkout = workoutDays.contains(day)
                    let isToday = Calendar.current.component(.day, from: .now) == day
                    Text("\(day)")
                        .font(.caption2.weight(isToday ? .semibold : .regular))
                        .foregroundStyle(isWorkout ? AppTheme.background : (isToday ? AppTheme.gold : AppTheme.textSecondary))
                        .frame(maxWidth: .infinity)
                        .frame(height: 28)
                        .background(isWorkout ? AppTheme.gold : Color.clear)
                        .overlay(
                            RoundedRectangle(cornerRadius: 1)
                                .stroke(isToday && !isWorkout ? AppTheme.gold : Color.clear, lineWidth: 1)
                        )
                }
            }
        }
    }

    private func statColumn(label: String, value: String, unit: String) -> some View {
        VStack(spacing: 6) {
            PremiumLabel(text: label)
            Text(value)
                .font(AppTheme.displayLight(36))
                .foregroundStyle(AppTheme.textPrimary)
            Text(unit)
                .font(.caption2)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func isToday(_ index: Int) -> Bool {
        index == weeklySteps.count - 1
    }

    private func daysInCurrentMonth() -> Int {
        Calendar.current.range(of: .day, in: .month, for: .now)?.count ?? 30
    }

    private var placeholderWeeklySteps: [(day: String, steps: Int)] {
        [("M", 0), ("T", 0), ("W", 0), ("T", 0), ("F", 0), ("S", 0), ("S", 0)]
    }
}
