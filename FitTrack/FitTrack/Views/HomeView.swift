import SwiftUI
import SwiftData
import Charts
import UIKit

struct HomeView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \BodyWeightLog.loggedAt, order: .reverse) private var bodyWeights: [BodyWeightLog]
    @Query(sort: \NutritionEntry.loggedAt, order: .reverse) private var nutritionEntries: [NutritionEntry]
    @Query(sort: \ProgressPhotoLog.capturedAt, order: .forward) private var progressPhotos: [ProgressPhotoLog]
    @Query(sort: \ProtocolItem.sortOrder) private var protocolItems: [ProtocolItem]

    let settings: AppSettings
    let displayName: String
    let health: HealthKitManager
    let sessions: [WorkoutSession]
    let earnedBadges: [EarnedBadge]
    let workoutDays: [WorkoutDay]
    @Binding var selectedTab: Tab
    var onStartWorkout: () -> Void

    @State private var weightInput = ""
    @State private var showCustomWater = false
    @State private var customWaterOz = ""
    @State private var showSummary = true
    @State private var recompWindow = 90
    @State private var showCoachDetail = false
    @State private var weightMonth: Date = Calendar.current.date(
        from: Calendar.current.dateComponents([.year, .month], from: .now)
    ) ?? .now
    @State private var showWeightCalendar = false
    @State private var showWeightChart = false
    @State private var selectedWeightDay: Date = Calendar.current.startOfDay(for: .now)
    @FocusState private var weightFieldFocused: Bool

    private var waterLog: DailyWaterLog {
        DailyTracker.todayWaterLog(context: modelContext, goalOz: settings.waterGoalOz)
    }

    private var morningWeight: BodyWeightLog? {
        DailyTracker.todayMorningWeight(from: bodyWeights)
    }

    private var completedSessions: [WorkoutSession] {
        sessions.filter { $0.endedAt != nil }
    }

    private var lifts: [WorkoutAnalytics.LiftProgression] {
        WorkoutAnalytics.liftProgressions(from: completedSessions, days: 90)
    }

    private var coachBrief: DailyCoachBrief {
        DailyCoachBriefEngine.build(
            settings: settings,
            workoutDays: workoutDays,
            sessions: sessions,
            nutritionEntries: nutritionEntries,
            bodyWeights: bodyWeights,
            protocolItems: protocolItems
        )
    }

    private var protocolAdherence: Double {
        ProtocolInsights.build(
            protocolItems: protocolItems,
            sessions: completedSessions,
            bodyWeights: bodyWeights
        ).overallAdherence
    }

    private var athleteLevel: AthleteLevel {
        AthleteLevelEngine.compute(from: completedSessions, adherence: protocolAdherence)
    }

    private var missedRecovery: MissedDayRecovery? {
        MissedDayRecoveryEngine.build(settings: settings, sessions: sessions)
    }

    private var weeklyRecap: WeeklyRecap {
        WeeklyRecapEngine.build(
            settings: settings,
            sessions: sessions,
            nutritionEntries: nutritionEntries
        )
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 12) {
                Text(UserProfile.workGreeting(for: displayName))
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(.white)

                AthleteLevelCard(level: athleteLevel) {
                    showCoachDetail = true
                }

                CoachBriefHomeBanner(headline: coachBrief.headline) {
                    showCoachDetail = true
                }

                if let missedRecovery {
                    MissedDayRecoveryCard(
                        plan: missedRecovery,
                        onApply: { applyRecovery(missedRecovery) },
                        onDismissSkip: {
                            settings.skipWorkout(on: missedRecovery.missedDate)
                            try? modelContext.save()
                        }
                    )
                }

                if weeklyRecap.isWeekendSpotlight || weeklyRecap.sessionsDone > 0 {
                    WeeklyRecapCard(recap: weeklyRecap, compact: true)
                }

                todayGlanceCard
                morningWeightCard
                waterAndStepsRow
                RecentlyEarnedBadgesCard(earnedBadges: earnedBadges) {
                    showCoachDetail = true
                }
                featureGrid
                photoTimelineCard
                yourSummarySection
            }
            .padding(.horizontal, 14)
            .padding(.top, 4)
            .padding(.bottom, 28)
        }
        .background(Color.black)
        .onAppear {
            if let weight = morningWeight {
                weightInput = String(format: "%.1f", weight.weightLbs)
            }
            checkLevelUp()
        }
        .sheet(isPresented: $showCustomWater) { customWaterSheet }
        .sheet(isPresented: $showCoachDetail) {
            NavigationStack {
                CoachView(
                    settings: settings,
                    workoutDays: workoutDays,
                    sessions: sessions,
                    health: health,
                    earnedBadges: earnedBadges,
                    nutritionEntries: nutritionEntries,
                    protocolItems: protocolItems,
                    onAction: handleCoachAction
                )
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Done") { showCoachDetail = false }
                            .foregroundStyle(EAColor.blue)
                    }
                }
            }
            .preferredColorScheme(.dark)
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") {
                    weightFieldFocused = false
                }
                .fontWeight(.semibold)
                .foregroundStyle(EAColor.blue)
            }
        }
    }

    private var todayGlanceCard: some View {
        let workoutName = WorkoutRotation.scheduledName(on: .now, settings: settings) ?? "Rest"
        let cals = DailyTracker.todayNutritionTotals(from: nutritionEntries).calories
        let weightLogged = morningWeight != nil
        let weekday = Calendar.current.component(.weekday, from: .now)
        let due = protocolItems.filter { $0.isDue(on: weekday) }
        let taken = due.filter { $0.isTaken(on: DailyTracker.dateKey()) }.count
        let protocolTitle = due.isEmpty ? "—" : "\(taken)/\(due.count)"

        return HStack(spacing: 0) {
            glanceCell(emoji: "🏋️", title: workoutName, subtitle: "Train") {
                selectedTab = .train
            }
            Divider().overlay(Color(white: 0.18)).frame(height: 36)
            glanceCell(
                emoji: weightLogged ? "✅" : "⚖️",
                title: weightLogged ? String(format: "%.1f", morningWeight!.weightLbs) : "Log wt",
                subtitle: "Weight"
            ) {
                showWeightCalendar = false
                showWeightChart = false
                weightFieldFocused = true
            }
            Divider().overlay(Color(white: 0.18)).frame(height: 36)
            glanceCell(
                emoji: "🥩",
                title: "\(cals)",
                subtitle: "/ \(settings.calorieGoal)"
            ) {
                selectedTab = .nutrition
            }
            Divider().overlay(Color(white: 0.18)).frame(height: 36)
            glanceCell(emoji: "🧬", title: protocolTitle, subtitle: "Protocol") {
                selectedTab = .protocolTab
            }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 4)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func glanceCell(emoji: String, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(emoji)
                    .font(.system(size: 14))
                Text(title)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(subtitle)
                    .font(.system(size: 10))
                    .foregroundStyle(Color(white: 0.45))
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }

    private var photoTimelineCard: some View {
        let front = progressPhotos.filter { $0.side == .front }
        return Group {
            if front.count >= 1 {
                PhotoProgressTimelineView(photos: front, title: "Front progress")
            } else {
                Button {
                    showCoachDetail = true
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("📷 Progress photos")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(.white)
                            Text("Add front/back shots to unlock before & after.")
                                .font(.caption)
                                .foregroundStyle(Color(white: 0.5))
                        }
                        Spacer()
                        Text("Open →")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(EAColor.blue)
                    }
                    .padding(14)
                    .background(EAColor.card)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Daily cards

    private var morningWeightCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Text("⚖️ Morning weight")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer(minLength: 8)
                weightPanelButton(
                    systemImage: "calendar",
                    isActive: showWeightCalendar
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showWeightCalendar.toggle()
                        if showWeightCalendar { showWeightChart = false }
                    }
                }
                weightPanelButton(
                    systemImage: "chart.xyaxis.line",
                    isActive: showWeightChart
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showWeightChart.toggle()
                        if showWeightChart { showWeightCalendar = false }
                    }
                }
            }

            HStack(alignment: .center, spacing: 10) {
                TextField("0.0", text: $weightInput)
                    .keyboardType(.decimalPad)
                    .focused($weightFieldFocused)
                    .font(.system(size: 22, weight: .semibold, design: .rounded))
                    .foregroundStyle(weightInput.isEmpty ? Color(white: 0.45) : .white)
                    .multilineTextAlignment(.leading)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .frame(minWidth: 88, alignment: .leading)
                    .background(Color(white: 0.10))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                Text("lb")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Color(white: 0.55))

                Spacer(minLength: 8)

                Button {
                    saveMorningWeight(for: selectedWeightDay)
                    weightFieldFocused = false
                } label: {
                    Text("Save")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.black)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 12)
                        .background(EAColor.green)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(!weightCanSubmit)
                .opacity(weightCanSubmit ? 1 : 0.45)
            }

            Text("Fasted, first thing in the AM — after the bathroom, before food or water.")
                .font(.system(size: 12))
                .foregroundStyle(Color(white: 0.48))
                .fixedSize(horizontal: false, vertical: true)

            if showWeightCalendar {
                weightMonthCalendar
                Text("Tap any day to add or fix that morning's weight.")
                    .font(.system(size: 11))
                    .foregroundStyle(Color(white: 0.42))
            } else if showWeightChart {
                let spark = ProgressAnalytics.weightChartPoints(from: bodyWeights, days: 60).map(\.weight)
                if spark.count >= 2 {
                    EASparkline(values: spark, color: EAColor.blue, height: 56)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                } else {
                    Text("Log a few morning weights to see your trend.")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(white: 0.42))
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func weightPanelButton(systemImage: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Image(systemName: systemImage)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                Image(systemName: "chevron.right")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Color(white: 0.55))
            }
            .frame(width: 44, height: 34)
            .background(Color(white: isActive ? 0.18 : 0.12))
            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .stroke(isActive ? Color.white.opacity(0.12) : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var weightMonthCalendar: some View {
        let cal = Calendar.current
        let title = weightMonth.formatted(.dateTime.month(.wide).year())
        let cells = weightMonthCells(for: weightMonth)

        return VStack(spacing: 10) {
            HStack {
                Button {
                    weightMonth = cal.date(byAdding: .month, value: -1, to: weightMonth) ?? weightMonth
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 30, height: 30)
                        .background(Color(white: 0.14))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                Spacer()
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                Spacer()
                Button {
                    weightMonth = cal.date(byAdding: .month, value: 1, to: weightMonth) ?? weightMonth
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 30, height: 30)
                        .background(Color(white: 0.14))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 5), count: 7), spacing: 5) {
                ForEach(Array(["S", "M", "T", "W", "T", "F", "S"].enumerated()), id: \.offset) { _, d in
                    Text(d)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Color(white: 0.4))
                        .frame(maxWidth: .infinity)
                }

                ForEach(Array(cells.enumerated()), id: \.offset) { _, cell in
                    if let cell {
                        Button {
                            selectedWeightDay = cell.date
                            if let w = cell.weight {
                                weightInput = String(format: "%.1f", w)
                            } else {
                                weightInput = ""
                            }
                            weightFieldFocused = true
                        } label: {
                            weightDayCell(cell)
                        }
                        .buttonStyle(.plain)
                    } else {
                        Color.clear.frame(minHeight: 52)
                    }
                }
            }
        }
    }

    private struct WeightDayCell {
        let date: Date
        let day: Int
        let weight: Double?
        let calories: Int?
        let isToday: Bool
        let isFuture: Bool
    }

    private func weightMonthCells(for month: Date) -> [WeightDayCell?] {
        let cal = Calendar.current
        guard let interval = cal.dateInterval(of: .month, for: month),
              let range = cal.range(of: .day, in: .month, for: month) else { return [] }
        let firstWeekday = cal.component(.weekday, from: interval.start)
        var cells: [WeightDayCell?] = Array(repeating: nil, count: firstWeekday - 1)
        let today = cal.startOfDay(for: .now)

        for day in range {
            guard let date = cal.date(byAdding: .day, value: day - 1, to: interval.start) else { continue }
            let start = cal.startOfDay(for: date)
            let weight = bodyWeight(on: start)?.weightLbs
            let cals = dayCalories(on: start)
            cells.append(
                WeightDayCell(
                    date: start,
                    day: day,
                    weight: weight,
                    calories: cals > 0 ? cals : nil,
                    isToday: start == today,
                    isFuture: start > today
                )
            )
        }
        while cells.count % 7 != 0 { cells.append(nil) }
        return cells
    }

    private func weightDayCell(_ cell: WeightDayCell) -> some View {
        let selected = Calendar.current.isDate(cell.date, inSameDayAs: selectedWeightDay)
        return VStack(alignment: .leading, spacing: 3) {
            Text("\(cell.day)")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(cell.isFuture ? Color(white: 0.35) : .white)
                .frame(maxWidth: .infinity, alignment: .leading)

            if let w = cell.weight {
                HStack(spacing: 2) {
                    Text("⚖️")
                        .font(.system(size: 7))
                    Text(String(format: "%.1f", w))
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(EAColor.blue)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            if let c = cell.calories {
                HStack(spacing: 2) {
                    Text("🔥")
                        .font(.system(size: 7))
                    Text(c.formatted())
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(Color(white: 0.75))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            if cell.weight == nil && cell.calories == nil {
                Spacer(minLength: 0)
            }
        }
        .padding(5)
        .frame(maxWidth: .infinity, minHeight: 56, alignment: .topLeading)
        .background(Color(white: 0.09))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(selected || cell.isToday ? EAColor.blue : Color.clear, lineWidth: 1.5)
        )
    }

    private func bodyWeight(on date: Date) -> BodyWeightLog? {
        bodyWeights.first { Calendar.current.isDate($0.loggedAt, inSameDayAs: date) }
    }

    private func dayCalories(on date: Date) -> Int {
        nutritionEntries
            .filter { Calendar.current.isDate($0.loggedAt, inSameDayAs: date) }
            .reduce(0) { $0 + $1.calories }
    }

    private var weightCanSubmit: Bool {
        (Double(weightInput) ?? 0) > 0
    }

    private var waterAndStepsRow: some View {
        HStack(alignment: .top, spacing: 10) {
            waterCard
            stepsCard
        }
    }

    private var waterCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("💧 Water")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                Text("oz")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(EAColor.blue)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(white: 0.14))
                    .clipShape(Capsule())
            }

            Text("\(waterLog.ounces) / \(waterLog.goalOz) oz · \(Int(waterLog.progress * 100))%")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white)

            PremiumProgressBar(value: waterLog.progress, height: 8, tint: EAColor.green)

            HStack(spacing: 6) {
                waterChip("+8") { adjustWater(by: 8) }
                waterChip("+16") { adjustWater(by: 16) }
                waterChip("reset") { resetWater() }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var stepsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("🚶 Steps")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                Button {
                    Task { await health.refresh() }
                } label: {
                    Text("+ log")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(EAColor.blue)
                }
                .buttonStyle(.plain)
            }

            Text(health.stepsToday > 0 ? health.stepsToday.formatted() : "—")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 8)

            Text("Goal \(health.stepGoal.formatted())")
                .font(.caption)
                .foregroundStyle(Color(white: 0.45))
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var featureGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            FeatureTile(emoji: "🏋️", title: "Training", subtitle: "Log session") { selectedTab = .train }
            FeatureTile(emoji: "🥩", title: "Nutrition", subtitle: "Meals & macros") { selectedTab = .nutrition }
            FeatureTile(emoji: "🧬", title: "Protocol", subtitle: "Today's stack") { selectedTab = .protocolTab }
        }
    }

    // MARK: - Your summary (EA readings)

    private var yourSummarySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("📊 Your summary")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                Button("Share") {}
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(EAColor.blue)
                    .clipShape(Capsule())
                Button(showSummary ? "– hide" : "+ show") {
                    withAnimation { showSummary.toggle() }
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color(white: 0.55))
            }

            if showSummary {
                exerciseComplianceCard
                nutritionComplianceCard
                weighInTrendCard
                strengthProgressionCard
                recompRateCard
                remindersCard

                Button("Open body map & DEXA →") { showCoachDetail = true }
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(EAColor.blue)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
        .padding(.top, 6)
    }

    private var exerciseComplianceCard: some View {
        let thisWeek = WorkoutAnalytics.sessionsCompleted(inWeekOffset: 0, sessions: completedSessions)
        let lastWeek = WorkoutAnalytics.sessionsCompleted(inWeekOffset: 1, sessions: completedSessions)
        let twoWeeks = WorkoutAnalytics.sessionsCompleted(inWeekOffset: 2, sessions: completedSessions)

        return summaryCard {
            HStack(spacing: 8) {
                EAComplianceRing(
                    title: "2 wks ago",
                    center: twoWeeks.done > 0 ? "\(Int(Double(twoWeeks.done) / Double(twoWeeks.goal) * 100))%" : "—",
                    subtitle: "\(twoWeeks.done) done",
                    progress: Double(twoWeeks.done) / Double(max(twoWeeks.goal, 1)),
                    tint: Color(white: 0.35)
                )
                EAComplianceRing(
                    title: "Last week",
                    center: lastWeek.done > 0 ? "\(Int(Double(lastWeek.done) / Double(lastWeek.goal) * 100))%" : "—",
                    subtitle: "\(lastWeek.done) done",
                    progress: Double(lastWeek.done) / Double(max(lastWeek.goal, 1)),
                    tint: Color(white: 0.35)
                )
                EAComplianceRing(
                    title: "This week",
                    center: "\(Int(Double(thisWeek.done) / Double(max(thisWeek.goal, 1)) * 100))%",
                    subtitle: "\(thisWeek.done)/\(thisWeek.goal)",
                    progress: Double(thisWeek.done) / Double(max(thisWeek.goal, 1)),
                    tint: EAColor.blue
                )
            }
        }
    }

    private var nutritionComplianceCard: some View {
        let w0 = WorkoutAnalytics.nutritionCompliance(entries: nutritionEntries, calorieGoal: settings.calorieGoal, weekOffset: 0)
        let w1 = WorkoutAnalytics.nutritionCompliance(entries: nutritionEntries, calorieGoal: settings.calorieGoal, weekOffset: 1)
        let w2 = WorkoutAnalytics.nutritionCompliance(entries: nutritionEntries, calorieGoal: settings.calorieGoal, weekOffset: 2)
        let todayCals = DailyTracker.todayNutritionTotals(from: nutritionEntries).calories
        let delta = todayCals - settings.calorieGoal

        return summaryCard {
            VStack(alignment: .leading, spacing: 12) {
                Text("🥩 Nutrition compliance")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)

                HStack(spacing: 8) {
                    EAComplianceRing(title: "2 wks ago", center: "\(w2.percent)%", subtitle: "\(w2.hit)/\(w2.days) days", progress: Double(w2.percent) / 100, tint: EAColor.yellow)
                    EAComplianceRing(title: "Last week", center: "\(w1.percent)%", subtitle: "\(w1.hit)/\(w1.days) days", progress: Double(w1.percent) / 100, tint: EAColor.yellow)
                    EAComplianceRing(title: "This week", center: "\(w0.percent)%", subtitle: "\(w0.hit)/\(w0.days) days", progress: Double(w0.percent) / 100, tint: EAColor.yellow)
                }

                Text("This week: \(delta >= 0 ? "+" : "")\(delta) cal/day vs the \(settings.calorieGoal) target (on-target = within ±10%).")
                    .font(.system(size: 11))
                    .foregroundStyle(Color(white: 0.55))
            }
        }
    }

    private var weighInTrendCard: some View {
        let points = ProgressAnalytics.weightChartPoints(from: bodyWeights, days: 60)
        let latest = bodyWeights.first?.weightLbs
        let firstInWindow = points.first?.weight
        let delta = (latest != nil && firstInWindow != nil) ? (latest! - firstInWindow!) : 0
        let spark = points.map(\.weight)

        return summaryCard {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("⚖️ Weigh-in trend")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                        Spacer()
                        Text("full history ▸")
                            .font(.caption2)
                            .foregroundStyle(EAColor.blue)
                    }
                    if let latest {
                        Text(String(format: "%.1f lb", latest))
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        Text(String(format: "%+.1f lb since %@ · %d weigh-ins", delta, points.first?.date.formatted(.dateTime.month(.abbreviated).day()) ?? "start", bodyWeights.count))
                            .font(.system(size: 12))
                            .foregroundStyle(delta <= 0 ? EAColor.green : Color(white: 0.55))
                    } else {
                        Text("No weigh-ins yet")
                            .foregroundStyle(Color(white: 0.55))
                    }
                }
                if spark.count >= 2 {
                    EASparkline(values: spark, color: EAColor.blue, height: 48)
                        .frame(width: 90)
                }
            }
        }
    }

    private var strengthProgressionCard: some View {
        let top = Array(lifts.prefix(5))
        let avg = top.isEmpty ? 0 : top.map(\.changePercent).reduce(0, +) / Double(top.count)
        let up = lifts.filter { $0.changePercent > 2 }.count
        let stalled = lifts.filter { $0.status == "Stalled" }.count
        let biggest = lifts.first
        let watch = lifts.first { $0.status == "Stalled" || $0.stalledWeeks >= 3 }

        return summaryCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("📈 Strength progression")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)

                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    (
                        Text("Top lifts ")
                        + Text(String(format: "%+.1f%%", avg)).fontWeight(.bold).foregroundColor(EAColor.green)
                        + Text(" avg e1RM trend")
                    )
                    .font(.system(size: 13))
                    .foregroundStyle(.white)

                    Spacer(minLength: 4)

                    Text("🔥 Recomping")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.black)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(EAColor.green)
                        .clipShape(Capsule())
                }

                Text("strength up while weight holds/drops")
                    .font(.caption)
                    .foregroundStyle(Color(white: 0.5))

                (
                    Text("This week: ")
                    + Text("\(up) lift\(up == 1 ? "" : "s") up").foregroundColor(EAColor.green)
                    + Text(" · ")
                    + Text("\(stalled) stalled").foregroundColor(EAColor.yellow)
                    + Text(" · biggest jump \(biggest?.name ?? "—") \(biggest.map { String(format: "%+.0f%%", $0.changePercent) } ?? "")")
                    + Text(watch.map { " · watch \($0.name)" } ?? "")
                )
                .font(.system(size: 11))
                .foregroundStyle(Color(white: 0.6))

                ForEach(Array(top.enumerated()), id: \.element.id) { index, lift in
                    if index > 0 {
                        Divider().overlay(Color(white: 0.15))
                    }
                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(lift.name)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(.white)
                                .lineLimit(1)
                            Text("\(lift.sessions) sessions · e1RM \(lift.e1RM) lb")
                                .font(.caption)
                                .foregroundStyle(Color(white: 0.5))
                        }
                        Spacer(minLength: 4)
                        if lift.sparkWeights.count >= 2 {
                            EASparkline(values: lift.sparkWeights, color: EAColor.blue, height: 28)
                                .frame(width: 56)
                        }
                        Text(String(format: "%+.1f%%", lift.changePercent))
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(lift.changePercent >= 0 ? EAColor.green : Color(white: 0.45))
                            .frame(width: 58, alignment: .trailing)
                    }
                    .padding(.vertical, 6)
                }

                Text("Est. 1RM (Epley) of each day's top set · % = regression trend across sessions, not first-vs-latest.")
                    .font(.system(size: 10))
                    .foregroundStyle(Color(white: 0.4))
                    .padding(.top, 4)
            }
        }
    }

    private var recompRateCard: some View {
        let weightSeries = WorkoutAnalytics.indexedWeightSeries(from: bodyWeights, days: recompWindow)
        let strengthSeries = WorkoutAnalytics.indexedStrengthSeries(from: completedSessions, days: recompWindow)
        let weightDelta: Double = {
            let pts = ProgressAnalytics.weightChartPoints(from: bodyWeights, days: recompWindow)
            guard let first = pts.first?.weight, let last = pts.last?.weight else { return 0 }
            return last - first
        }()
        let strengthDelta = (strengthSeries.last?.value ?? 100) - 100
        let weeks = max(1, recompWindow / 7)
        let isRecomping = weightDelta < 0 && strengthDelta > 0

        return summaryCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("♻️ Recomp rate")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                    Spacer()
                    Text("estimate")
                        .font(.caption2)
                        .foregroundStyle(Color(white: 0.45))
                }

                HStack(spacing: 8) {
                    ForEach([(30, "1M"), (90, "3M"), (180, "6M"), (3650, "All")], id: \.0) { days, label in
                        Button(label) { recompWindow = days }
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(recompWindow == days ? EAColor.blue : Color(white: 0.55))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(white: 0.12))
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(recompWindow == days ? EAColor.blue : Color.clear, lineWidth: 1.5))
                    }
                }

                if isRecomping {
                    Text("🔥 RECOMPING")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(EAColor.green)
                    Text("fat down, strength up")
                        .font(.caption)
                        .foregroundStyle(Color(white: 0.55))
                } else {
                    Text("Tracking")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.white)
                    Text("building enough data for recomp estimate")
                        .font(.caption)
                        .foregroundStyle(Color(white: 0.55))
                }

                Text(String(format: "%+.0f lb · %+.0f%% strength · %d wks", weightDelta, strengthDelta, min(weeks, 52)))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)

                if weightSeries.count >= 2 || strengthSeries.count >= 2 {
                    EARecompChart(weightIndex: weightSeries, strengthIndex: strengthSeries)
                    HStack(spacing: 16) {
                        Label("Bodyweight", systemImage: "minus")
                            .foregroundStyle(EAColor.blue)
                        Label("Strength", systemImage: "minus")
                            .foregroundStyle(EAColor.green)
                    }
                    .font(.caption2)
                    Text("% of start (100 = window start), not lb. Estimate from weight + strength trend — not a body-fat measurement.")
                        .font(.system(size: 10))
                        .foregroundStyle(Color(white: 0.4))
                }
            }
        }
    }

    private var remindersCard: some View {
        summaryCard {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("🔔 Reminders")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                    Text(remindersEnabled
                        ? "On — workout, weigh-in, protocol & weekly pushes."
                        : "Off — turn on to get alerts on your phone.")
                        .font(.caption)
                        .foregroundStyle(Color(white: 0.55))
                }
                Spacer()
                Toggle("", isOn: Binding(
                    get: { remindersEnabled },
                    set: { enableReminders($0) }
                ))
                .labelsHidden()
                .tint(EAColor.blue)
            }
        }
    }

    private var remindersEnabled: Bool {
        settings.workoutRemindersEnabled
            || settings.protocolRemindersEnabled
            || settings.weighInRemindersEnabled
    }

    private func enableReminders(_ on: Bool) {
        settings.workoutRemindersEnabled = on
        settings.protocolRemindersEnabled = on
        settings.weighInRemindersEnabled = on
        settings.streakRemindersEnabled = on
        settings.weeklySummaryEnabled = on
        settings.macroLeftoverRemindersEnabled = on
        try? modelContext.save()
        Task {
            if on {
                _ = await NotificationManager.shared.requestAuthorization()
            }
            await NotificationManager.shared.refreshAll(
                settings: settings,
                workoutDays: workoutDays,
                sessions: sessions,
                protocolItems: protocolItems
            )
        }
    }

    private func summaryCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(EAColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func waterChip(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(Color(white: 0.14))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var customWaterSheet: some View {
        NavigationStack {
            VStack {
                TextField("Ounces", text: $customWaterOz)
                    .keyboardType(.numberPad)
                    .padding()
                    .background(EAColor.card)
                Button("Add") {
                    if let oz = Int(customWaterOz), oz > 0 {
                        adjustWater(by: oz)
                        showCustomWater = false
                    }
                }
                Spacer()
            }
            .padding()
            .background(Color.black)
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                    .fontWeight(.semibold)
                    .foregroundStyle(EAColor.blue)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func handleCoachAction(_ kind: DailyCoachBrief.CoachAction.Kind) {
        showCoachDetail = false
        switch kind {
        case .train:
            if let today = WorkoutRotation.workoutDay(from: workoutDays, settings: settings) {
                settings.selectedWorkoutDayID = today.id
                try? modelContext.save()
            }
            selectedTab = .train
            onStartWorkout()
        case .nutrition:
            selectedTab = .nutrition
        case .protocolTab:
            selectedTab = .protocolTab
        case .weighIn:
            weightFieldFocused = true
        case .recoverMissed:
            if let plan = missedRecovery {
                applyRecovery(plan)
            }
        }
    }

    private func applyRecovery(_ plan: MissedDayRecovery) {
        let selectedName = MissedDayRecoveryEngine.apply(plan, settings: settings)
        try? modelContext.save()
        if let selectedName,
           let day = workoutDays.first(where: { $0.name == selectedName }) {
            settings.selectedWorkoutDayID = day.id
            try? modelContext.save()
            selectedTab = .train
            if plan.recommendation == .doToday || plan.recommendation == .swapForToday {
                onStartWorkout()
            }
            CelebrationCenter.shared.show(
                emoji: "↩️",
                title: "\(selectedName) locked in",
                subtitle: "Recovery plan applied",
                tint: EAColor.yellow
            )
        } else {
            let subtitle: String
            switch plan.recommendation {
            case .doTomorrow:
                subtitle = "\(plan.missedName) parked for tomorrow"
            case .skipAndMoveOn:
                subtitle = "\(plan.missedName) skipped — stay on plan"
            default:
                subtitle = "Schedule updated"
            }
            CelebrationCenter.shared.show(
                emoji: "✅",
                title: "Recovery set",
                subtitle: subtitle,
                tint: EAColor.green
            )
        }
    }

    private func checkLevelUp() {
        let current = athleteLevel.level
        let last = settings.lastCelebratedAthleteLevel

        // First run establishes a baseline so existing users don't get a false level-up.
        guard last > 0 else {
            settings.lastCelebratedAthleteLevel = current
            try? modelContext.save()
            return
        }

        guard current > last else { return }
        settings.lastCelebratedAthleteLevel = current
        try? modelContext.save()

        let title = athleteLevel.title
        let flavor = athleteLevel.flavor
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            CelebrationCenter.shared.show(
                emoji: "⚡️",
                title: "Level \(current) — \(title)!",
                subtitle: flavor,
                tint: EAColor.blue,
                duration: 2.8,
                confetti: true
            )
        }
    }

    private func saveMorningWeight(for date: Date = .now) {
        guard let weight = Double(weightInput), weight > 0 else { return }
        let cal = Calendar.current
        let dayStart = cal.startOfDay(for: date)
        let previous = bodyWeights
            .filter { $0.loggedAt < dayStart }
            .sorted { $0.loggedAt > $1.loggedAt }
            .first
        if let existing = bodyWeight(on: dayStart) {
            existing.weightLbs = weight
            existing.loggedAt = dayStart.addingTimeInterval(7 * 3600) // ~7am
        } else {
            modelContext.insert(BodyWeightLog(weightLbs: weight, loggedAt: dayStart.addingTimeInterval(7 * 3600)))
        }
        try? modelContext.save()

        var subtitle = String(format: "%.1f lb saved", weight)
        if let previous {
            let delta = weight - previous.weightLbs
            let sign = delta >= 0 ? "+" : ""
            subtitle = String(format: "%.1f lb · %@%.1f vs last", weight, sign, delta)
        }
        CelebrationCenter.shared.show(
            emoji: "⚖️",
            title: "Weigh-in logged",
            subtitle: subtitle,
            tint: EAColor.green
        )
    }

    private func adjustWater(by amount: Int) {
        waterLog.ounces = max(0, waterLog.ounces + amount)
        try? modelContext.save()
    }

    private func resetWater() {
        waterLog.ounces = 0
        try? modelContext.save()
    }
}
