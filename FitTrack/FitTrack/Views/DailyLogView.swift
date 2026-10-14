import SwiftUI
import SwiftData

struct DailyLogView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \DailyLog.date, order: .reverse) private var allLogs: [DailyLog]
    @Query(sort: \WorkoutSession.startedAt, order: .reverse) private var sessions: [WorkoutSession]

    let settings: AppSettings
    var stepsFromHealth: Int = 0

    @State private var targetCalories = ""
    @State private var targetProtein = ""
    @State private var targetCarbs = ""
    @State private var targetFats = ""
    @State private var actualCalories = ""
    @State private var actualProtein = ""
    @State private var carbsPre = ""
    @State private var carbsPost = ""
    @State private var actualFats = ""
    @State private var sleepHours = ""
    @State private var sleepNotes = ""
    @State private var stepsCount = ""
    @State private var inclineMinutes = ""
    @State private var inclinePercent = ""
    @State private var inclineSpeed = ""
    @State private var notes = ""
    @State private var didSave = false
    @FocusState private var focused: Field?

    private enum Field: Hashable {
        case targetCal, targetPro, targetCarb, targetFat
        case cal, pro, carbPre, carbPost, fat
        case sleep, steps, inclineMin, inclinePct, inclineSpd, notes, sleepNotes
    }

    private var todayLog: DailyLog? {
        DailyTracker.dailyLog(on: .now, from: allLogs)
    }

    private var todaySession: WorkoutSession? {
        sessions.first {
            guard $0.endedAt != nil else { return false }
            return Calendar.current.isDateInToday($0.startedAt)
        }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 12)

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 18) {
                        if let log = todayLog {
                            liveStatusCard(log)
                        }

                        sectionCard(title: "Targets") {
                            fieldRow("Calories", text: $targetCalories, field: .targetCal)
                            fieldRow("Protein (g)", text: $targetProtein, field: .targetPro)
                            fieldRow("Carbs (g)", text: $targetCarbs, field: .targetCarb)
                            fieldRow("Fats (g)", text: $targetFats, field: .targetFat)
                        }

                        sectionCard(title: "Actuals") {
                            fieldRow("Calories", text: $actualCalories, field: .cal)
                            fieldRow("Protein (g)", text: $actualProtein, field: .pro)
                            fieldRow("Carbs pre-workout", text: $carbsPre, field: .carbPre)
                            fieldRow("Carbs post-workout", text: $carbsPost, field: .carbPost)
                            fieldRow("Fats (g)", text: $actualFats, field: .fat)
                        }

                        sectionCard(title: "Sleep") {
                            fieldRow("Hours", text: $sleepHours, field: .sleep, keyboard: .decimalPad)
                            labeledField("Quality notes", text: $sleepNotes, field: .sleepNotes)
                        }

                        sectionCard(title: "Steps & incline walk") {
                            fieldRow("Steps", text: $stepsCount, field: .steps)
                            fieldRow("Incline walk (min)", text: $inclineMinutes, field: .inclineMin)
                            fieldRow("Incline %", text: $inclinePercent, field: .inclinePct)
                            fieldRow("Speed (mph)", text: $inclineSpeed, field: .inclineSpd, keyboard: .decimalPad)
                        }

                        sectionCard(title: "Notes") {
                            labeledField("Day notes", text: $notes, field: .notes)
                        }

                        WeeklyDailyLogSummaryView(logs: allLogs)
                            .padding(.top, 4)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 110)
                }
            }

            saveBar
        }
        .preferredColorScheme(.dark)
        .onAppear(perform: hydrateFromExisting)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") { focused = nil }
                    .fontWeight(.semibold)
                    .foregroundStyle(EAColor.blue)
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color(white: 0.7))
                    .frame(width: 36, height: 36)
                    .background(Color(white: 0.12))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            Spacer()

            VStack(spacing: 2) {
                Text("Daily Log")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                Text(Date.now.formatted(.dateTime.weekday(.wide).month(.abbreviated).day()))
                    .font(.system(size: 12))
                    .foregroundStyle(Color(white: 0.5))
            }

            Spacer()

            Color.clear.frame(width: 36, height: 36)
        }
    }

    private func liveStatusCard(_ log: DailyLog) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Today so far")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(EAColor.blue)

            HStack(spacing: 10) {
                statusChip(
                    "\(Int((log.proteinPercentToTarget * 100).rounded()))% protein",
                    ok: log.proteinPercentToTarget >= 1
                )
                statusChip(
                    "\(log.caloriesRemaining) cal left",
                    ok: log.caloriesRemaining >= 0
                )
            }
            HStack(spacing: 10) {
                statusChip(log.metStepGoal ? "10k steps ✓" : "steps short", ok: log.metStepGoal)
                statusChip(log.hitSleepMinimum ? "7h+ sleep ✓" : "sleep short", ok: log.hitSleepMinimum)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func statusChip(_ text: String, ok: Bool) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(ok ? EAColor.green : Color(white: 0.55))
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(Color(white: 0.12))
            .clipShape(Capsule())
    }

    // MARK: - Form pieces

    private func sectionCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.white)
            content()
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func fieldRow(
        _ label: String,
        text: Binding<String>,
        field: Field,
        keyboard: UIKeyboardType = .numberPad
    ) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14))
                .foregroundStyle(Color(white: 0.65))
            Spacer()
            TextField("0", text: text)
                .keyboardType(keyboard)
                .multilineTextAlignment(.trailing)
                .font(.system(size: 16, weight: .semibold, design: .monospaced))
                .foregroundStyle(.white)
                .frame(width: 96)
                .padding(.vertical, 8)
                .padding(.horizontal, 10)
                .background(Color(white: 0.12))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .focused($focused, equals: field)
        }
    }

    private func labeledField(_ label: String, text: Binding<String>, field: Field) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color(white: 0.5))
            TextField(label, text: text, axis: .vertical)
                .lineLimit(2...4)
                .font(.system(size: 14))
                .foregroundStyle(.white)
                .padding(10)
                .background(Color(white: 0.12))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .focused($focused, equals: field)
        }
    }

    private var saveBar: some View {
        Button(action: save) {
            HStack(spacing: 8) {
                Image(systemName: didSave ? "checkmark.circle.fill" : "square.and.arrow.down.fill")
                    .font(.system(size: 14, weight: .bold))
                Text(didSave ? "Saved" : "Save daily log")
                    .font(.system(size: 17, weight: .bold))
            }
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(didSave ? EAColor.green : EAColor.blue)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 16)
        .padding(.bottom, 20)
    }

    // MARK: - Persist

    private func hydrateFromExisting() {
        if let log = todayLog {
            targetCalories = "\(log.targetCalories)"
            targetProtein = "\(log.targetProtein)"
            targetCarbs = "\(log.targetCarbs)"
            targetFats = "\(log.targetFats)"
            actualCalories = "\(log.actualCalories)"
            actualProtein = "\(log.actualProtein)"
            carbsPre = "\(log.actualCarbsPreWorkout)"
            carbsPost = "\(log.actualCarbsPostWorkout)"
            actualFats = "\(log.actualFats)"
            sleepHours = log.sleepHours > 0 ? String(format: "%g", log.sleepHours) : ""
            sleepNotes = log.sleepQualityNotes
            stepsCount = log.stepsCount > 0 ? "\(log.stepsCount)" : (stepsFromHealth > 0 ? "\(stepsFromHealth)" : "")
            inclineMinutes = log.inclineWalkMinutes > 0 ? "\(log.inclineWalkMinutes)" : ""
            inclinePercent = log.inclineWalkIncline > 0 ? "\(log.inclineWalkIncline)" : ""
            inclineSpeed = log.inclineWalkSpeed > 0 ? String(format: "%g", log.inclineWalkSpeed) : ""
            notes = log.notes
        } else {
            targetCalories = "\(settings.calorieGoal)"
            targetProtein = "\(settings.proteinGoalG)"
            targetCarbs = "\(settings.carbsGoalG)"
            targetFats = "\(settings.fatGoalG)"
            if stepsFromHealth > 0 {
                stepsCount = "\(stepsFromHealth)"
            }
            let nutrition = DailyTracker.todayNutritionTotals(
                from: (try? modelContext.fetch(FetchDescriptor<NutritionEntry>())) ?? []
            )
            if nutrition.calories > 0 || nutrition.protein > 0 {
                actualCalories = "\(nutrition.calories)"
                actualProtein = "\(nutrition.protein)"
                actualFats = "\(nutrition.fat)"
            }
        }
    }

    private func save() {
        focused = nil
        let day = Calendar.current.startOfDay(for: .now)
        let log = todayLog ?? DailyLog(
            date: day,
            targetCalories: settings.calorieGoal,
            targetProtein: settings.proteinGoalG,
            targetCarbs: settings.carbsGoalG,
            targetFats: settings.fatGoalG
        )

        log.targetCalories = intValue(targetCalories, fallback: settings.calorieGoal)
        log.targetProtein = intValue(targetProtein, fallback: settings.proteinGoalG)
        log.targetCarbs = intValue(targetCarbs, fallback: settings.carbsGoalG)
        log.targetFats = intValue(targetFats, fallback: settings.fatGoalG)
        log.actualCalories = intValue(actualCalories)
        log.actualProtein = intValue(actualProtein)
        log.actualCarbsPreWorkout = intValue(carbsPre)
        log.actualCarbsPostWorkout = intValue(carbsPost)
        log.actualFats = intValue(actualFats)
        log.sleepHours = doubleValue(sleepHours)
        log.sleepQualityNotes = sleepNotes.trimmingCharacters(in: .whitespacesAndNewlines)
        log.stepsCount = intValue(stepsCount)
        log.inclineWalkMinutes = intValue(inclineMinutes)
        log.inclineWalkIncline = intValue(inclinePercent)
        log.inclineWalkSpeed = doubleValue(inclineSpeed)
        log.notes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        if log.workoutSession == nil {
            log.workoutSession = todaySession
        }

        if todayLog == nil {
            modelContext.insert(log)
        }
        try? modelContext.save()

        didSave = true
        Haptics.success()
        CelebrationCenter.shared.show(
            emoji: "📝",
            title: "Daily log saved",
            subtitle: "\(log.actualProtein)g protein · \(String(format: "%.1f", log.sleepHours))h sleep",
            tint: EAColor.blue
        )
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            dismiss()
        }
    }

    private func intValue(_ text: String, fallback: Int = 0) -> Int {
        Int(text.filter(\.isNumber)) ?? fallback
    }

    private func doubleValue(_ text: String) -> Double {
        Double(text.replacingOccurrences(of: ",", with: ".")) ?? 0
    }
}

struct WeeklyDailyLogSummaryView: View {
    let logs: [DailyLog]
    var now: Date = .now

    private var weekLogs: [DailyLog] {
        let cal = Calendar.current
        guard let interval = cal.dateInterval(of: .weekOfYear, for: now) else { return [] }
        return logs.filter { $0.date >= interval.start && $0.date < interval.end }
    }

    private var avgProteinPercent: Double? {
        guard !weekLogs.isEmpty else { return nil }
        let sum = weekLogs.reduce(0.0) { $0 + $1.proteinPercentToTarget }
        return sum / Double(weekLogs.count)
    }

    private var avgSleepHours: Double? {
        let slept = weekLogs.filter { $0.sleepHours > 0 }
        guard !slept.isEmpty else { return nil }
        return slept.reduce(0.0) { $0 + $1.sleepHours } / Double(slept.count)
    }

    private var stepGoalDays: Int {
        weekLogs.filter(\.metStepGoal).count
    }

    private var stretchGoalDays: Int {
        weekLogs.filter(\.metStretchGoal).count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "chart.bar.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(EAColor.green)
                Text("This week")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                Text("\(weekLogs.count) days logged")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color(white: 0.45))
            }

            if weekLogs.isEmpty {
                Text("No daily logs yet this week — save today to start the streak.")
                    .font(.system(size: 13))
                    .foregroundStyle(Color(white: 0.55))
            } else {
                HStack(spacing: 10) {
                    metric(
                        avgProteinPercent.map { "\(Int(($0 * 100).rounded()))%" } ?? "—",
                        label: "Avg protein"
                    )
                    metric(
                        avgSleepHours.map { String(format: "%.1fh", $0) } ?? "—",
                        label: "Avg sleep"
                    )
                    metric("\(stepGoalDays)", label: "10k days")
                }

                if stretchGoalDays > 0 {
                    Text("\(stretchGoalDays) day\(stretchGoalDays == 1 ? "" : "s") hit the 15k stretch goal")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(white: 0.55))
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(EAColor.green.opacity(0.22), lineWidth: 1)
        )
    }

    private func metric(_ value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color(white: 0.45))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 10)
        .background(Color(white: 0.12))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}
