import SwiftUI
import SwiftData

private enum TrainSubtab: String, CaseIterable {
    case workouts = "Workouts"
    case calendar = "Calendar"
    case progression = "Progression"
    case volume = "Volume"

    var emoji: String {
        switch self {
        case .workouts: return "💪"
        case .calendar: return "📅"
        case .progression: return "📈"
        case .volume: return "🧱"
        }
    }
}

struct WorkoutsView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var day: WorkoutDay
    let workoutDays: [WorkoutDay]
    @Bindable var settings: AppSettings
    @Bindable var sessionManager: WorkoutSessionManager
    let sessions: [WorkoutSession]
    var onSwapWorkout: () -> Void
    var onStartWorkout: () -> Void
    var onSelectDay: (WorkoutDay) -> Void

    @State private var subtab: TrainSubtab = .workouts
    @State private var showEditProgram = false
    @State private var showSchedule = false
    @State private var progressionFilter = 90
    @State private var volumeWeekOffset = 1
    @State private var progressionMode = 0
    @State private var volumeMode = 0 // 0 tonnage, 1 sets
    @State private var calendarMonth: Date = Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: .now)) ?? .now
    @State private var calendarActionCell: CalendarDayCell?
    @State private var selectedCalendarCell: CalendarDayCell?
    @State private var previewDay: WorkoutDay?

    private var completedSessions: [WorkoutSession] {
        sessions.filter { $0.endedAt != nil }
    }

    private var history: [WorkoutSession] {
        Array(completedSessions.prefix(12))
    }

    private var programLabel: String {
        "\(settings.programName) · tap to preview"
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(TrainSubtab.allCases, id: \.self) { tab in
                        Button {
                            subtab = tab
                        } label: {
                            HStack(spacing: 6) {
                                Text(tab.emoji)
                                Text(tab.rawValue)
                                    .font(.system(size: 13, weight: .semibold))
                            }
                            .foregroundStyle(subtab == tab ? EAColor.blue : Color(white: 0.55))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(Color(white: 0.12))
                            .clipShape(Capsule())
                            .overlay(
                                Capsule()
                                    .stroke(subtab == tab ? EAColor.blue : Color.clear, lineWidth: 1.5)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 14)
            }
            .padding(.bottom, 12)

            ScrollView(showsIndicators: false) {
                Group {
                    switch subtab {
                    case .workouts: workoutsContent
                    case .calendar: calendarContent
                    case .progression: progressionContent
                    case .volume: volumeContent
                    }
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 28)
            }
        }
        .background(Color.black)
        .sheet(isPresented: $showEditProgram) { EditProgramView(day: day) }
        .sheet(isPresented: $showSchedule) {
            ScheduleSettingsView(settings: settings, sessions: sessions)
        }
        .sheet(item: $previewDay) { workout in
            WorkoutPreviewSheet(
                day: workout,
                sessions: completedSessions,
                onStart: {
                    onSelectDay(workout)
                    previewDay = nil
                    onStartWorkout()
                },
                onEdit: {
                    onSelectDay(workout)
                    previewDay = nil
                    showEditProgram = true
                }
            )
        }
    }

    // MARK: - Workouts

    private var workoutsContent: some View {
        let todayWorkout = WorkoutRotation.workoutDay(from: workoutDays, settings: settings) ?? day
        let isRest = WorkoutRotation.scheduledName(on: .now, settings: settings) == nil

        return VStack(alignment: .leading, spacing: 18) {
            Text("Today")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)

            if isRest {
                Text("Rest day — recover or swap in a session below.")
                    .font(.system(size: 14))
                    .foregroundStyle(Color(white: 0.55))
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(EAColor.card)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            } else {
                EAWorkoutRow(
                    title: todayWorkout.name,
                    subtitle: "On the schedule today · tap to preview",
                    highlighted: true,
                    onStart: {
                        onSelectDay(todayWorkout)
                        onStartWorkout()
                    },
                    onTap: {
                        onSelectDay(todayWorkout)
                        previewDay = todayWorkout
                    }
                )
            }

            Text("Your Workouts")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
                .padding(.top, 4)

            ForEach(orderedWorkoutDays) { workoutDay in
                EAWorkoutRow(
                    title: workoutDay.name,
                    subtitle: "\(workoutDay.exercises.count) exercises · tap to preview",
                    highlighted: false,
                    onStart: {
                        onSelectDay(workoutDay)
                        onStartWorkout()
                    },
                    onTap: {
                        onSelectDay(workoutDay)
                        previewDay = workoutDay
                    }
                )
            }

            HStack(spacing: 10) {
                chip("Swap", icon: "arrow.triangle.2.circlepath", action: onSwapWorkout)
                chip("Edit", icon: "pencil") { showEditProgram = true }
                chip("Schedule", icon: "bell") { showSchedule = true }
            }

            if !history.isEmpty {
                Text("History")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.top, 8)

                ForEach(history) { session in
                    historyRow(session)
                }
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("No sessions yet")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                    Text("Start today's workout — previous sets and overload nudges unlock after your first log.")
                        .font(.caption)
                        .foregroundStyle(Color(white: 0.5))
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(EAColor.card)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .padding(.top, 8)
            }
        }
    }

    private var orderedWorkoutDays: [WorkoutDay] {
        let order = WorkoutRotation.order
        return workoutDays.sorted { a, b in
            let ia = order.firstIndex(of: a.name) ?? 99
            let ib = order.firstIndex(of: b.name) ?? 99
            return ia < ib
        }
    }

    private func historyRow(_ session: WorkoutSession) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("\(session.dayName) · \(session.startedAt.formatted(.dateTime.month(.abbreviated).day()))")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white)
            HStack(spacing: 10) {
                if !session.prsHit.isEmpty {
                    Text("🏆 \(session.prsHit.count) PRs")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(EAColor.yellow)
                }
                Text("\(session.totalVolume.formatted()) lb")
                    .font(.caption)
                    .foregroundStyle(Color(white: 0.55))
                Text(formatDuration(session.durationSeconds))
                    .font(.caption)
                    .foregroundStyle(Color(white: 0.55))
            }
            Text("tap for recap")
                .font(.caption2)
                .foregroundStyle(Color(white: 0.4))
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    // MARK: - Calendar

    private var calendarContent: some View {
        let cal = Calendar.current
        let monthTitle = calendarMonth.formatted(.dateTime.month(.wide).year())
        let days = monthDayCells(for: calendarMonth)

        return VStack(alignment: .leading, spacing: 16) {
            HStack {
                Button {
                    calendarMonth = cal.date(byAdding: .month, value: -1, to: calendarMonth) ?? calendarMonth
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .background(Color(white: 0.14))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)

                Spacer()
                Text(monthTitle)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
                Spacer()

                Button {
                    calendarMonth = cal.date(byAdding: .month, value: 1, to: calendarMonth) ?? calendarMonth
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .background(Color(white: 0.14))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 6) {
                ForEach(Array(["S", "M", "T", "W", "T", "F", "S"].enumerated()), id: \.offset) { _, day in
                    Text(day)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color(white: 0.45))
                        .frame(maxWidth: .infinity)
                }

                ForEach(Array(days.enumerated()), id: \.offset) { _, cell in
                    if let cell {
                        Button {
                            handleCalendarTap(cell)
                        } label: {
                            calendarDayCell(cell)
                        }
                        .buttonStyle(.plain)
                    } else {
                        Color.clear
                            .frame(minHeight: 64)
                    }
                }
            }

            HStack(spacing: 14) {
                legendSwatch(color: EAColor.green, label: "completed")
                legendSwatch(color: Color(white: 0.35), label: "missed")
                Text("names = scheduled")
                    .font(.system(size: 11))
                    .foregroundStyle(Color(white: 0.45))
            }
            .padding(.top, 4)

            if let lookAhead = calendarLookAheadContext {
                WorkoutLookAheadCard(
                    day: lookAhead.day,
                    date: lookAhead.date,
                    sessions: completedSessions
                )
                .padding(.top, 8)
            }

            Button("Open schedule settings") { showSchedule = true }
                .font(.caption.weight(.semibold))
                .foregroundStyle(EAColor.blue)
        }
        .onAppear { selectDefaultCalendarDay(in: days) }
        .onChange(of: calendarMonth) { _, _ in
            selectedCalendarCell = nil
            selectDefaultCalendarDay(in: monthDayCells(for: calendarMonth))
        }
        .onChange(of: subtab) { _, tab in
            guard tab == .calendar else { return }
            selectDefaultCalendarDay(in: monthDayCells(for: calendarMonth))
        }
        .confirmationDialog(
            calendarActionTitle,
            isPresented: Binding(
                get: { calendarActionCell != nil },
                set: { if !$0 { calendarActionCell = nil } }
            ),
            titleVisibility: .visible
        ) {
            if let cell = calendarActionCell, let name = cell.scheduledName ?? cell.baseScheduledName {
                Button("Skip \(name)") {
                    settings.skipWorkout(on: cell.date)
                    try? modelContext.save()
                    calendarActionCell = nil
                }
                Button("Do \(name) today") {
                    settings.rescheduleWorkout(name, from: cell.date, to: .now)
                    if let day = workoutDays.first(where: { $0.name == name }) {
                        onSelectDay(day)
                    }
                    try? modelContext.save()
                    calendarActionCell = nil
                }
            }
            Button("Cancel", role: .cancel) { calendarActionCell = nil }
        }
    }

    private var calendarActionTitle: String {
        guard let cell = calendarActionCell else { return "Workout day" }
        let name = cell.scheduledName ?? cell.baseScheduledName ?? "Workout"
        return "\(name) · \(cell.date.formatted(.dateTime.month(.abbreviated).day()))"
    }

    private func handleCalendarTap(_ cell: CalendarDayCell) {
        // Always select so the look-ahead card with previous weights appears.
        selectedCalendarCell = cell
        if let name = workoutName(for: cell),
           let day = workoutDays.first(where: { $0.name == name }) {
            onSelectDay(day)
        }
        if cell.isMissed || (cell.isSkipped && cell.baseScheduledName != nil) {
            calendarActionCell = cell
        }
    }

    private var calendarLookAheadContext: (day: WorkoutDay, date: Date)? {
        guard let cell = selectedCalendarCell,
              let name = workoutName(for: cell),
              let day = workoutDays.first(where: { $0.name == name }) else { return nil }
        return (day, cell.date)
    }

    private func workoutName(for cell: CalendarDayCell) -> String? {
        cell.completedName ?? cell.scheduledName ?? cell.baseScheduledName
    }

    private func selectDefaultCalendarDay(in days: [CalendarDayCell?]) {
        guard selectedCalendarCell == nil else { return }
        let today = Calendar.current.startOfDay(for: .now)
        if let todayCell = days.compactMap({ $0 }).first(where: { $0.date == today && workoutName(for: $0) != nil }) {
            selectedCalendarCell = todayCell
            return
        }
        if let firstScheduled = days.compactMap({ $0 }).first(where: { workoutName(for: $0) != nil }) {
            selectedCalendarCell = firstScheduled
        }
    }

    private struct CalendarDayCell: Identifiable {
        let id: Date
        let day: Int
        let date: Date
        let scheduledName: String?
        let baseScheduledName: String?
        let completedName: String?
        let isToday: Bool
        let isFuture: Bool
        let isMissed: Bool
        let isSkipped: Bool
    }

    private func monthDayCells(for month: Date) -> [CalendarDayCell?] {
        let cal = Calendar.current
        guard let monthInterval = cal.dateInterval(of: .month, for: month),
              let range = cal.range(of: .day, in: .month, for: month) else { return [] }

        let firstWeekday = cal.component(.weekday, from: monthInterval.start) // 1=Sun
        var cells: [CalendarDayCell?] = Array(repeating: nil, count: firstWeekday - 1)

        let completedByDay = completedSessionsByDay(in: month)
        let today = cal.startOfDay(for: .now)

        for day in range {
            guard let date = cal.date(byAdding: .day, value: day - 1, to: monthInterval.start) else { continue }
            let start = cal.startOfDay(for: date)
            let baseScheduled = WorkoutRotation.scheduledName(on: date) // ignore skip for base
            let scheduled = WorkoutRotation.scheduledName(on: date, settings: settings)
            let completed = completedByDay[start]
            let isFuture = start > today
            let isToday = start == today
            let isSkipped = settings.isWorkoutSkipped(on: start)
            let isMissed = !isFuture && !isToday && scheduled != nil && completed == nil && !isSkipped

            cells.append(
                CalendarDayCell(
                    id: start,
                    day: day,
                    date: start,
                    scheduledName: scheduled,
                    baseScheduledName: baseScheduled,
                    completedName: completed,
                    isToday: isToday,
                    isFuture: isFuture,
                    isMissed: isMissed,
                    isSkipped: isSkipped && completed == nil
                )
            )
        }

        while cells.count % 7 != 0 { cells.append(nil) }
        return cells
    }

    private func completedSessionsByDay(in month: Date) -> [Date: String] {
        let cal = Calendar.current
        var map: [Date: String] = [:]
        for session in completedSessions {
            let date = session.endedAt ?? session.startedAt
            guard cal.isDate(date, equalTo: month, toGranularity: .month) else { continue }
            let key = cal.startOfDay(for: date)
            if map[key] == nil {
                map[key] = session.dayName
            }
        }
        return map
    }

    @ViewBuilder
    private func calendarDayCell(_ cell: CalendarDayCell) -> some View {
        let isSelected = selectedCalendarCell?.id == cell.id

        let border: Color = {
            if isSelected { return EAColor.blue }
            if cell.completedName != nil { return EAColor.green }
            if cell.isMissed { return Color(white: 0.28) }
            return Color.clear
        }()

        let borderWidth: CGFloat = {
            if isSelected { return 2 }
            if cell.completedName != nil || cell.isMissed { return 1.5 }
            return 0
        }()

        let nameColor: Color = {
            if cell.completedName != nil { return EAColor.green }
            if isSelected { return EAColor.blue }
            return Color(white: 0.55)
        }()

        VStack(spacing: 4) {
            Text("\(cell.day)")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .leading)

            if cell.completedName != nil {
                Image(systemName: "checkmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(EAColor.green)
            } else if cell.isSkipped {
                Text("skip")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Color(white: 0.4))
            } else {
                Spacer().frame(height: 11)
            }

            Text(shortWorkoutName(cell.completedName ?? cell.scheduledName ?? (cell.isSkipped ? cell.baseScheduledName : nil)))
                .font(.system(size: 8, weight: .semibold))
                .foregroundStyle(cell.isSkipped ? Color(white: 0.35) : nameColor)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(maxWidth: .infinity, alignment: .leading)
                .strikethrough(cell.isSkipped)        }
        .padding(6)
        .frame(maxWidth: .infinity, minHeight: 64, alignment: .top)
        .background(Color(white: 0.12))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(border, lineWidth: borderWidth)
        )
    }

    private func shortWorkoutName(_ name: String?) -> String {
        guard let name, !name.isEmpty else { return " " }
        return name
    }

    private func legendSwatch(color: Color, label: String) -> some View {
        HStack(spacing: 5) {
            RoundedRectangle(cornerRadius: 3, style: .continuous)
                .stroke(color, lineWidth: 1.5)
                .frame(width: 12, height: 12)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(Color(white: 0.45))
        }
    }

    // MARK: - Progression

    private var progressionContent: some View {
        let all = WorkoutAnalytics.liftProgressions(from: completedSessions, days: progressionFilter)
        let filtered: [WorkoutAnalytics.LiftProgression] = {
            switch progressionMode {
            case 1: return all.filter { $0.status == "Stalled" }.sorted { $0.stalledWeeks > $1.stalledWeeks }
            case 2: return all.sorted { $0.sessions > $1.sessions }
            default: return all
            }
        }()

        let upCount = all.filter { $0.changePercent > 0 }.count
        let stalledCount = all.filter { $0.status == "Stalled" }.count
        let biggest = all.first

        return VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text("📜 This week's lift report")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                Text("\(upCount) lift\(upCount == 1 ? "" : "s") up · \(stalledCount) stalled · biggest jump \(biggest?.name ?? "—") \(biggest.map { String(format: "%+.0f%%", $0.changePercent) } ?? "")")
                    .font(.system(size: 13))
                    .foregroundStyle(Color(white: 0.6))
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(EAColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(EAColor.blue.opacity(0.5), lineWidth: 1)
            )

            HStack(spacing: 8) {
                ForEach([(30, "1M"), (90, "3M"), (180, "6M"), (3650, "All")], id: \.0) { days, label in
                    filterPill(label, selected: progressionFilter == days) { progressionFilter = days }
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    filterPill("🔥 Most improved", selected: progressionMode == 0) { progressionMode = 0 }
                    filterPill("⚠️ Most stalled", selected: progressionMode == 1) { progressionMode = 1 }
                    filterPill("🏋️ Most trained", selected: progressionMode == 2) { progressionMode = 2 }
                }
            }

            ForEach(filtered.prefix(25)) { lift in
                EALiftCard(
                    name: lift.name,
                    sessions: lift.sessions,
                    e1RM: lift.e1RM,
                    status: lift.status,
                    stalledWeeks: lift.stalledWeeks,
                    changePercent: lift.changePercent,
                    spark: lift.sparkWeights
                )
            }

            Text("Est. 1RM (Epley) of each day's top set · % = regression trend across sessions, not first-vs-latest · tap a lift for the full picture.")
                .font(.system(size: 10))
                .foregroundStyle(Color(white: 0.4))
                .padding(.top, 4)
        }
    }

    // MARK: - Volume

    private var volumeContent: some View {
        let rows: [(muscle: String, value: Int)] = {
            if volumeWeekOffset == 4 {
                var totals: [String: Int] = [:]
                for offset in 0..<4 {
                    for row in WorkoutAnalytics.weeklyVolumeByMuscle(from: completedSessions, weekOffset: offset) {
                        totals[row.muscle, default: 0] += volumeMode == 0 ? row.tonnage : setCount(for: row.muscle, weekOffset: offset)
                    }
                }
                return orderedMuscles.map { ($0, (totals[$0] ?? 0) / 4) }
            }
            return orderedMuscles.map { muscle in
                let tonnage = WorkoutAnalytics.weeklyVolumeByMuscle(from: completedSessions, weekOffset: volumeWeekOffset)
                    .first { $0.muscle == muscle || ($0.muscle == "Back / Lats" && muscle == "Back") }?.tonnage ?? 0
                let value = volumeMode == 0 ? tonnage : setCount(for: muscle, weekOffset: volumeWeekOffset)
                return (muscle, value)
            }
        }()

        let total = rows.reduce(0) { $0 + $1.value }
        let maxV = max(rows.map(\.value).max() ?? 1, 1)

        return VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("🧱 Weekly volume by muscle")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                    Spacer()
                    Button(volumeMode == 0 ? "sets" : "lb") {
                        volumeMode = volumeMode == 0 ? 1 : 0
                    }
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Color(white: 0.7))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color(white: 0.14))
                    .clipShape(Capsule())
                }

                HStack(spacing: 8) {
                    filterPill("This week", selected: volumeWeekOffset == 0) { volumeWeekOffset = 0 }
                    filterPill("Last week", selected: volumeWeekOffset == 1) { volumeWeekOffset = 1 }
                    filterPill("4-wk avg", selected: volumeWeekOffset == 4) { volumeWeekOffset = 4 }
                }

                Text(volumeMode == 0 ? "\(total.formatted()) lb total tonnage" : "\(total) total sets")
                    .font(.system(size: 13))
                    .foregroundStyle(Color(white: 0.55))

                ForEach(rows, id: \.muscle) { row in
                    HStack(spacing: 10) {
                        Text(row.muscle)
                            .font(.system(size: 13))
                            .foregroundStyle(.white)
                            .frame(width: 84, alignment: .leading)

                        GeometryReader { geo in
                            Capsule()
                                .fill(Color(white: 0.16))
                                .overlay(alignment: .leading) {
                                    Capsule()
                                        .fill(EAColor.blue)
                                        .frame(width: geo.size.width * CGFloat(row.value) / CGFloat(maxV))
                                }
                        }
                        .frame(height: 10)

                        Text(volumeLabel(row.value))
                            .font(.system(size: 12, weight: .semibold).monospacedDigit())
                            .foregroundStyle(EAColor.blue)
                            .frame(width: 40, alignment: .trailing)
                    }
                }
            }
            .padding(14)
            .background(EAColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }

    private var orderedMuscles: [String] {
        ["Chest", "Back", "Shoulders", "Quads", "Hamstrings", "Biceps", "Triceps", "Calves", "Abs", "Other"]
    }

    private func setCount(for muscle: String, weekOffset: Int) -> Int {
        let calendar = Calendar.current
        guard let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: .now)),
              let targetStart = calendar.date(byAdding: .weekOfYear, value: -weekOffset, to: weekStart),
              let targetEnd = calendar.date(byAdding: .day, value: 7, to: targetStart) else { return 0 }

        return completedSessions.reduce(0) { partial, session in
            let date = session.endedAt ?? session.startedAt
            guard date >= targetStart && date < targetEnd else { return partial }
            return partial + session.exerciseLogs.reduce(0) { inner, log in
                let mapped = displayMuscle(log.muscle)
                guard mapped == muscle else { return inner }
                return inner + log.sets.filter(\.isCompleted).count
            }
        }
    }

    private func displayMuscle(_ raw: String) -> String {
        guard let group = MuscleGroup.from(muscleLabel: raw) else { return "Other" }
        switch group {
        case .back, .traps: return "Back"
        case .chest: return "Chest"
        case .shoulders: return "Shoulders"
        case .quads: return "Quads"
        case .hamstrings, .glutes: return "Hamstrings"
        case .biceps: return "Biceps"
        case .triceps: return "Triceps"
        case .calves: return "Calves"
        case .abs: return "Abs"
        default: return "Other"
        }
    }

    private func volumeLabel(_ value: Int) -> String {
        if volumeMode == 1 { return "\(value)" }
        if value >= 1000 { return String(format: "%.0fk", Double(value) / 1000) }
        return "\(value)"
    }

    private func filterPill(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(selected ? EAColor.blue : Color(white: 0.55))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(white: 0.12))
                .clipShape(Capsule())
                .overlay(Capsule().stroke(selected ? EAColor.blue : Color.clear, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
    }

    private func chip(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.caption.weight(.semibold))
                .foregroundStyle(EAColor.blue)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(EAColor.card)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func formatDuration(_ seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        if h > 0 { return "\(h)h \(m)m" }
        return "\(m)m"
    }
}

private extension WorkoutSession {
    var totalVolume: Int {
        exerciseLogs.reduce(0) { partial, log in
            partial + log.sets.filter(\.isCompleted).reduce(0) { $0 + Int(($1.weight * Double($1.reps)).rounded()) }
        }
    }
}

struct WorkoutLookAheadCard: View {
    let day: WorkoutDay
    let date: Date
    let sessions: [WorkoutSession]

    private var previousSetsByExercise: [String: [WorkoutAnalytics.PreviousSet]] {
        WorkoutAnalytics.lastSetsByExercise(from: sessions)
    }

    private var exercises: [StoredExercise] {
        day.exercises.sorted { $0.sortOrder < $1.sortOrder }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text("🗓️ \(day.name)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                Spacer(minLength: 8)
                Text("look-ahead · \(date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day()))")
                    .font(.system(size: 12))
                    .foregroundStyle(Color(white: 0.45))
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 10)

            if exercises.isEmpty {
                Text("No exercises in this workout yet.")
                    .font(.caption)
                    .foregroundStyle(Color(white: 0.5))
                    .padding(.horizontal, 16)
                    .padding(.bottom, 14)
            } else {
                ForEach(Array(exercises.enumerated()), id: \.element.id) { index, exercise in
                    lookAheadExerciseRow(exercise)
                    if index < exercises.count - 1 {
                        Divider().overlay(Color(white: 0.18))
                            .padding(.leading, 16)
                    }
                }
                .padding(.bottom, 4)
            }
        }
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color(white: 0.18), lineWidth: 1)
        )
    }

    private func lookAheadExerciseRow(_ exercise: StoredExercise) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(exercise.name)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(EAColor.blue)

            Text(exercise.prescriptionSummary)
                .font(.system(size: 13))
                .foregroundStyle(Color(white: 0.55))

            Text(previousLine(for: exercise.name))
                .font(.system(size: 13))
                .foregroundStyle(Color(white: 0.5))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func previousLine(for exerciseName: String) -> String {
        previousSetsLine(for: exerciseName, from: sessions)
    }
}

/// Compact previous-sets line used by look-ahead + workout preview.
private func previousSetsLine(
    for exerciseName: String,
    from sessions: [WorkoutSession]
) -> String {
    let sets = WorkoutAnalytics.lastSetsByExercise(from: sessions)[exerciseName] ?? []
    if let formatted = WorkoutAnalytics.formatPreviousSets(sets) {
        return "previous: \(formatted)"
    }
    return "no previous logged"
}

struct WorkoutPreviewSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var day: WorkoutDay
    let sessions: [WorkoutSession]
    var onStart: () -> Void
    var onEdit: () -> Void

    private var exercises: [StoredExercise] {
        day.exercises.sorted { $0.sortOrder < $1.sortOrder }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color(white: 0.08).ignoresSafeArea()

            VStack(spacing: 0) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(day.name)
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white)
                        Text(day.subtitle.isEmpty ? WorkoutLibrary.programSubtitle : day.subtitle)
                            .font(.system(size: 14))
                            .foregroundStyle(Color(white: 0.55))
                        Text("Est. \(WorkoutDurationEstimator.formattedRange(for: day)) · \(exercises.count) exercises")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(EAColor.blue)
                            .padding(.top, 2)
                    }
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 32, height: 32)
                            .background(Color(white: 0.18))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 12)

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        if exercises.isEmpty {
                            Text("No exercises in this workout yet.")
                                .font(.caption)
                                .foregroundStyle(Color(white: 0.5))
                                .padding(20)
                        } else {
                            ForEach(Array(exercises.enumerated()), id: \.element.id) { index, exercise in
                                previewExerciseRow(exercise)
                                if index < exercises.count - 1 {
                                    Divider().overlay(Color(white: 0.18))
                                        .padding(.leading, 20)
                                }
                            }
                        }
                    }
                    .padding(.bottom, 100)
                }

                Button(action: onStart) {
                    HStack(spacing: 8) {
                        Image(systemName: "play.fill")
                            .font(.system(size: 14, weight: .bold))
                        Text("Start workout")
                            .font(.system(size: 17, weight: .bold))
                    }
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(EAColor.green)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
        }
        .preferredColorScheme(.dark)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func previewExerciseRow(_ exercise: StoredExercise) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(exercise.name)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(EAColor.blue)
                Spacer()
                WatchDemoButton(videoURL: exercise.videoURL, compact: true)
            }

            Text(exercise.prescriptionSummary)
                .font(.system(size: 14))
                .foregroundStyle(Color(white: 0.55))

            Text(previousSetsLine(for: exercise.name, from: sessions))
                .font(.system(size: 13))
                .foregroundStyle(Color(white: 0.5))
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        .contextMenu {
            Button("Edit workout", action: onEdit)
        }
    }
}
