import SwiftUI
import SwiftData
import UIKit

struct ProtocolView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var settings: AppSettings
    @Query(sort: \ProtocolItem.sortOrder) private var items: [ProtocolItem]

    var onRemindersChanged: () -> Void = {}

    @State private var mode = 0 // 0 Log, 1 Calendar
    @State private var selectedDay: Date = Calendar.current.startOfDay(for: .now)
    @State private var calendarMonth: Date = Calendar.current.date(
        from: Calendar.current.dateComponents([.year, .month], from: .now)
    ) ?? .now
    @State private var showAddItem = false
    @State private var newName = ""
    @State private var newDosage = ""
    @State private var newSchedule = "Morning"
    @State private var newFrequency = "Daily"

    private var selectedDayStart: Date {
        Calendar.current.startOfDay(for: selectedDay)
    }

    private var activeDateKey: String { DailyTracker.dateKey(for: selectedDayStart) }

    private var isViewingToday: Bool {
        Calendar.current.isDateInToday(selectedDayStart)
    }

    private var dueForSelectedDay: [ProtocolItem] {
        let weekday = Calendar.current.component(.weekday, from: selectedDayStart)
        return items.filter { $0.isDue(on: weekday) }
    }

    private var takenCount: Int {
        dueForSelectedDay.filter { $0.isTaken(on: activeDateKey) }.count
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 18) {
                modeToggle

                if mode == 0 {
                    todayContent
                } else {
                    calendarContent
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 28)
        }
        .sheet(isPresented: $showAddItem) {
            addItemSheet
        }
    }

    // MARK: - Toggle

    private var modeToggle: some View {
        HStack(spacing: 8) {
            modePill(title: "Log", emoji: nil, systemImage: "checkmark", index: 0)
            modePill(title: "Calendar", emoji: "📅", systemImage: nil, index: 1)
            Spacer()
        }
    }

    private func modePill(title: String, emoji: String?, systemImage: String?, index: Int) -> some View {
        let selected = mode == index
        return Button {
            mode = index
        } label: {
            HStack(spacing: 6) {
                if let emoji {
                    Text(emoji)
                        .font(.system(size: 13))
                } else if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(selected ? EAColor.blue : .white)
                }
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(selected ? .white : Color(white: 0.7))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .background(selected ? Color(red: 0.12, green: 0.22, blue: 0.38) : Color(white: 0.14))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(selected ? EAColor.blue : Color.clear, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Log (any past / today)

    private var todayContent: some View {
        VStack(alignment: .leading, spacing: 18) {
            dayPickerHeader

            if !isViewingToday {
                Text("Backfilling — check off what you actually took.")
                    .font(.system(size: 13))
                    .foregroundStyle(EAColor.yellow)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(EAColor.yellow.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }

            dueTodayCard

            Text("Full Schedule")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)

            fullScheduleCard

            Button {
                showAddItem = true
            } label: {
                Text("+ Add item")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(EAColor.blue)
            }
            .buttonStyle(.plain)

            remindersCard
        }
    }

    private var dayPickerHeader: some View {
        let cal = Calendar.current
        let canGoForward = selectedDayStart < cal.startOfDay(for: .now)
        let earliest = cal.date(byAdding: .day, value: -60, to: cal.startOfDay(for: .now)) ?? selectedDayStart
        let canGoBack = selectedDayStart > earliest

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Button {
                    guard canGoBack,
                          let prev = cal.date(byAdding: .day, value: -1, to: selectedDayStart) else { return }
                    selectedDay = prev
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(canGoBack ? .white : Color(white: 0.3))
                        .frame(width: 36, height: 36)
                        .background(Color(white: 0.14))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .disabled(!canGoBack)

                Spacer()

                VStack(spacing: 2) {
                    Text(dayTitle)
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(.white)
                    Text(selectedDayStart.formatted(.dateTime.weekday(.wide).month(.abbreviated).day()))
                        .font(.system(size: 13))
                        .foregroundStyle(Color(white: 0.5))
                }

                Spacer()

                Button {
                    guard canGoForward,
                          let next = cal.date(byAdding: .day, value: 1, to: selectedDayStart) else { return }
                    selectedDay = min(next, cal.startOfDay(for: .now))
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(canGoForward ? .white : Color(white: 0.3))
                        .frame(width: 36, height: 36)
                        .background(Color(white: 0.14))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .disabled(!canGoForward)
            }

            if !isViewingToday {
                Button {
                    selectedDay = cal.startOfDay(for: .now)
                } label: {
                    Text("Jump to today")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(EAColor.blue)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(white: 0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var dayTitle: String {
        if isViewingToday { return "Today" }
        if Calendar.current.isDateInYesterday(selectedDayStart) { return "Yesterday" }
        return selectedDayStart.formatted(.dateTime.month(.abbreviated).day())
    }

    private var dueTodayCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                HStack(spacing: 6) {
                    Text("🧬")
                        .font(.system(size: 14))
                    Text(isViewingToday ? "Due today" : "Due this day")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                }
                Spacer()
                Text("\(takenCount)/\(dueForSelectedDay.count)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color(red: 0.95, green: 0.82, blue: 0.25))
                    .clipShape(Capsule())
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 12)

            if dueForSelectedDay.isEmpty {
                Text("Nothing due this day.")
                    .font(.caption)
                    .foregroundStyle(Color(white: 0.5))
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
            } else {
                let grouped: [(ProtocolBucket, [ProtocolItem])] = ProtocolBucket.allCases.compactMap { bucket in
                    let group = dueForSelectedDay.filter { protocolBucket(for: $0) == bucket }
                    return group.isEmpty ? nil : (bucket, group)
                }
                ForEach(Array(grouped.enumerated()), id: \.offset) { sectionIndex, section in
                    HStack {
                        Text(section.0.title)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color(white: 0.45))
                        Spacer()
                        let allTaken = section.1.allSatisfy { $0.isTaken(on: activeDateKey) }
                        if !allTaken {
                            Button("Mark all") {
                                for item in section.1 {
                                    item.setTaken(true, on: activeDateKey)
                                }
                                try? modelContext.save()
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                CelebrationCenter.shared.show(
                                    emoji: "🧬",
                                    title: "\(section.0.title) cleared",
                                    subtitle: backfillSubtitle(count: section.1.count),
                                    tint: EAColor.green
                                )
                            }
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(EAColor.blue)
                            .buttonStyle(.plain)
                        } else {
                            Text("Done")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(EAColor.green)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, sectionIndex == 0 ? 0 : 8)
                    .padding(.bottom, 2)

                    ForEach(Array(section.1.enumerated()), id: \.element.id) { index, item in
                        dueRow(item)
                        let isLastSection = sectionIndex == grouped.count - 1
                        let isLastItem = index == section.1.count - 1
                        if !(isLastSection && isLastItem) {
                            Divider().overlay(Color(white: 0.18))
                                .padding(.leading, 16)
                        }
                    }
                }
                .padding(.bottom, 8)
            }
        }
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private enum ProtocolBucket: CaseIterable {
        case injectable, am, pm, other

        var title: String {
            switch self {
            case .injectable: return "INJECTABLES"
            case .am: return "AM"
            case .pm: return "PM"
            case .other: return "OTHER"
            }
        }
    }

    private func protocolBucket(for item: ProtocolItem) -> ProtocolBucket {
        let blob = "\(item.dosage) \(item.scheduleLabel)".lowercased()
        if blob.contains("subq") || blob.contains("sub-q") || blob.contains("sub q") {
            return .injectable
        }
        if item.scheduleLabel.uppercased() == "AM"
            || blob.contains("morning")
            || blob.contains("· am")
            || blob.hasSuffix(" am") {
            return .am
        }
        if item.scheduleLabel.uppercased() == "PM"
            || blob.contains("evening")
            || blob.contains("night")
            || blob.contains("· pm")
            || blob.hasSuffix(" pm") {
            return .pm
        }
        return .other
    }

    private func dueRow(_ item: ProtocolItem) -> some View {
        let taken = item.isTaken(on: activeDateKey)
        return Button {
            item.setTaken(!taken, on: activeDateKey)
            try? modelContext.save()
            if !taken {
                let remaining = dueForSelectedDay.filter { !$0.isTaken(on: activeDateKey) }.count
                if remaining == 0 {
                    CelebrationCenter.shared.show(
                        emoji: "🔥",
                        title: isViewingToday ? "Stack complete" : "Day complete",
                        subtitle: isViewingToday
                            ? "Everything due today is checked off"
                            : "Logged for \(dayTitle.lowercased())",
                        tint: EAColor.green,
                        duration: 2.2
                    )
                } else if !isViewingToday {
                    CelebrationCenter.shared.show(
                        emoji: "✓",
                        title: item.name,
                        subtitle: "Saved for \(dayTitle.lowercased())",
                        tint: EAColor.blue,
                        duration: 1.2
                    )
                }
            }
        } label: {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(taken ? EAColor.green : Color(white: 0.18))
                        .frame(width: 26, height: 26)
                    Image(systemName: "checkmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(taken ? .black : Color(white: 0.35))
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(item.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.leading)
                    Text(detailLine(item))
                        .font(.system(size: 13))
                        .foregroundStyle(taken ? Color(white: 0.45) : Color(white: 0.55))
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var fullScheduleCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            if items.isEmpty {
                Text("Build your daily protocol — peptides, vitamins, or anything on your stack.")
                    .font(.caption)
                    .foregroundStyle(Color(white: 0.5))
                    .padding(16)
            } else {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.name)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(.white)
                            Text(detailLine(item))
                                .font(.system(size: 13))
                                .foregroundStyle(Color(white: 0.5))
                        }
                        Spacer(minLength: 8)
                        Text(item.frequencyLabel.isEmpty ? "Daily" : item.frequencyLabel)
                            .font(.system(size: 13))
                            .foregroundStyle(Color(white: 0.5))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)

                    if index < items.count - 1 {
                        Divider().overlay(Color(white: 0.18))
                            .padding(.leading, 16)
                    }
                }
            }
        }
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color(white: 0.16), lineWidth: 1)
        )
    }

    private func detailLine(_ item: ProtocolItem) -> String {
        let d = item.dosage.trimmingCharacters(in: .whitespaces)
        let s = item.scheduleLabel.trimmingCharacters(in: .whitespaces)
        if d.contains("·") || s.isEmpty { return d.isEmpty ? s : d }
        if d.isEmpty { return s }
        return "\(d) · \(s)"
    }

    // MARK: - Calendar

    private var calendarContent: some View {
        let cal = Calendar.current
        let monthTitle = calendarMonth.formatted(.dateTime.month(.wide).year())
        let days = monthDayCells(for: calendarMonth)

        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                monthChevron(systemName: "chevron.left") {
                    calendarMonth = cal.date(byAdding: .month, value: -1, to: calendarMonth) ?? calendarMonth
                }
                Spacer()
                Text(monthTitle)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
                Spacer()
                monthChevron(systemName: "chevron.right") {
                    calendarMonth = cal.date(byAdding: .month, value: 1, to: calendarMonth) ?? calendarMonth
                }
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
                        protocolDayCell(cell)
                    } else {
                        Color.clear.frame(minHeight: 58)
                    }
                }
            }

            HStack(spacing: 14) {
                legendSwatch(color: EAColor.green, label: "all taken")
                legendSwatch(color: Color(white: 0.35), label: "missed")
                Text("tap a day to log")
                    .font(.system(size: 11))
                    .foregroundStyle(Color(white: 0.45))
            }
            .padding(.top, 4)
        }
    }

    private func selectDayForLogging(_ date: Date) {
        let cal = Calendar.current
        let start = cal.startOfDay(for: date)
        let today = cal.startOfDay(for: .now)
        guard start <= today else { return }
        selectedDay = start
        withAnimation(.easeInOut(duration: 0.2)) {
            mode = 0
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func backfillSubtitle(count: Int) -> String {
        if isViewingToday {
            return "\(count) items checked off"
        }
        return "\(count) items · \(dayTitle.lowercased())"
    }

    private func monthChevron(systemName: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 34, height: 34)
                .background(Color(white: 0.14))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private struct ProtocolDayCell: Identifiable {
        let id: Date
        let day: Int
        let date: Date
        let dueCount: Int
        let takenCount: Int
        let initials: String
        let isToday: Bool
        let isFuture: Bool
        let isPast: Bool
    }

    private enum DayVisual {
        case empty
        case allTaken
        case missed
        case partial
        case scheduled
    }

    private func monthDayCells(for month: Date) -> [ProtocolDayCell?] {
        let cal = Calendar.current
        guard let monthInterval = cal.dateInterval(of: .month, for: month),
              let range = cal.range(of: .day, in: .month, for: month) else { return [] }

        let firstWeekday = cal.component(.weekday, from: monthInterval.start)
        var cells: [ProtocolDayCell?] = Array(repeating: nil, count: firstWeekday - 1)
        let today = cal.startOfDay(for: .now)

        for day in range {
            guard let date = cal.date(byAdding: .day, value: day - 1, to: monthInterval.start) else { continue }
            let start = cal.startOfDay(for: date)
            let weekday = cal.component(.weekday, from: date)
            let key = DailyTracker.dateKey(for: start)
            let due = items.filter { $0.isDue(on: weekday) }
            let taken = due.filter { $0.isTaken(on: key) }.count
            let injectableInitials = due
                .filter { $0.dosage.localizedCaseInsensitiveContains("SubQ") }
                .map(\.calendarInitials)
            let initials = compactInitials(injectableInitials.isEmpty ? due.map(\.calendarInitials) : injectableInitials)

            cells.append(
                ProtocolDayCell(
                    id: start,
                    day: day,
                    date: start,
                    dueCount: due.count,
                    takenCount: taken,
                    initials: initials,
                    isToday: start == today,
                    isFuture: start > today,
                    isPast: start < today
                )
            )
        }
        while cells.count % 7 != 0 { cells.append(nil) }
        return cells
    }

    private func compactInitials(_ list: [String]) -> String {
        guard !list.isEmpty else { return "" }
        let maxShow = 3
        if list.count <= maxShow {
            return list.joined(separator: " ")
        }
        return list.prefix(maxShow).joined(separator: " ") + " +"
    }

    private func visual(for cell: ProtocolDayCell) -> DayVisual {
        if cell.dueCount == 0 { return .empty }
        if cell.isFuture { return .scheduled }
        if cell.takenCount >= cell.dueCount { return .allTaken }
        if cell.takenCount == 0 && cell.isPast { return .missed }
        if cell.takenCount == 0 && cell.isToday { return .partial } // show 0/N in yellow/red? EA shows yellow for partial; 0 on today might still be yellow fraction
        return .partial
    }

    @ViewBuilder
    private func protocolDayCell(_ cell: ProtocolDayCell) -> some View {
        let vis = visual(for: cell)
        let isSelected = Calendar.current.isDate(cell.date, inSameDayAs: selectedDayStart)
        let border: Color = {
            if isSelected { return EAColor.blue }
            if cell.isToday { return EAColor.blue.opacity(0.55) }
            switch vis {
            case .allTaken: return EAColor.green
            case .partial: return EAColor.yellow
            case .missed, .empty, .scheduled: return Color(white: 0.22)
            }
        }()

        Button {
            selectDayForLogging(cell.date)
        } label: {
            VStack(spacing: 4) {
                Text("\(cell.day)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(cell.isFuture ? Color(white: 0.35) : .white)

                Group {
                    switch vis {
                    case .empty:
                        Text(" ")
                            .font(.system(size: 11, weight: .semibold))
                    case .allTaken:
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(EAColor.green)
                    case .missed:
                        Text("0/\(cell.dueCount)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color(red: 0.95, green: 0.35, blue: 0.35))
                    case .partial:
                        Text("\(cell.takenCount)/\(cell.dueCount)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(EAColor.yellow)
                    case .scheduled:
                        Text(cell.initials.isEmpty ? " " : cell.initials)
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundStyle(Color(white: 0.7))
                            .lineLimit(1)
                            .minimumScaleFactor(0.55)
                    }
                }
                .frame(height: 16)
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 4)
            .frame(maxWidth: .infinity, minHeight: 58)
            .background(isSelected ? Color(white: 0.16) : Color(white: 0.11))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(border, lineWidth: isSelected || cell.isToday || vis == .allTaken || vis == .partial ? 1.5 : 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(cell.isFuture)
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

    // MARK: - Add / Reminders

    private var addItemSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                inputField("Name", text: $newName)
                inputField("Dosage", text: $newDosage, placeholder: "4mg · SubQ")
                inputField("Schedule detail", text: $newSchedule, placeholder: "Morning, Night, etc.")
                inputField("Frequency", text: $newFrequency, placeholder: "Daily, Sun, Mon Thu")
                PremiumButton(title: "Add to Stack", icon: "plus") {
                    addItem()
                }
                .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                Spacer()
            }
            .padding(24)
            .background(AppTheme.background)
            .navigationTitle("New Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { showAddItem = false }
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func inputField(_ label: String, text: Binding<String>, placeholder: String = "") -> some View {
        VStack(alignment: .leading, spacing: 8) {
            PremiumLabel(text: label)
            TextField(placeholder.isEmpty ? label : placeholder, text: text)
                .padding(14)
                .background(AppTheme.inputBackground)
                .foregroundStyle(AppTheme.textPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private func addItem() {
        let name = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        let item = ProtocolItem(
            name: name,
            dosage: newDosage.isEmpty ? "As directed" : newDosage,
            scheduleLabel: newSchedule.isEmpty ? "Daily" : newSchedule,
            frequencyLabel: newFrequency.isEmpty ? "Daily" : newFrequency,
            sortOrder: items.count
        )
        modelContext.insert(item)
        try? modelContext.save()
        newName = ""
        newDosage = ""
        newSchedule = "Morning"
        newFrequency = "Daily"
        showAddItem = false
    }

    private var remindersCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Toggle(isOn: $settings.protocolRemindersEnabled) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Daily Reminders")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(.white)
                    Text("Morning stack alert + evening check-in")
                        .font(.caption)
                        .foregroundStyle(Color(white: 0.5))
                }
            }
            .tint(EAColor.blue)
            .onChange(of: settings.protocolRemindersEnabled) { _, _ in
                try? modelContext.save()
                onRemindersChanged()
            }

            if settings.protocolRemindersEnabled {
                DatePicker(
                    "Morning reminder",
                    selection: Binding(
                        get: {
                            var c = DateComponents()
                            c.hour = settings.protocolReminderHour
                            c.minute = settings.protocolReminderMinute
                            return Calendar.current.date(from: c) ?? .now
                        },
                        set: { date in
                            let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
                            settings.protocolReminderHour = parts.hour ?? 8
                            settings.protocolReminderMinute = parts.minute ?? 0
                            try? modelContext.save()
                            onRemindersChanged()
                        }
                    ),
                    displayedComponents: .hourAndMinute
                )
                .font(.caption)
                .foregroundStyle(Color(white: 0.5))
            }
        }
        .padding(16)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
