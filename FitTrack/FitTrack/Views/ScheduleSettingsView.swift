import SwiftUI
import SwiftData

struct ScheduleSettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var settings: AppSettings
    @Query(sort: \WorkoutDay.sortOrder) private var workoutDays: [WorkoutDay]
    @Query(sort: \ProtocolItem.sortOrder) private var protocolItems: [ProtocolItem]
    let sessions: [WorkoutSession]

    @State private var reminderTime = Date.now
    @State private var weighInTime = Date.now
    @State private var protocolTime = Date.now
    @State private var macroTime = Date.now
    @State private var notificationsGranted = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if !notificationsGranted {
                        Button("Enable Notifications") {
                            Task {
                                notificationsGranted = await NotificationManager.shared.requestAuthorization()
                            }
                        }
                        .foregroundStyle(EAColor.blue)
                    } else {
                        Label("Notifications enabled", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(EAColor.green)
                            .font(.subheadline)
                    }
                } footer: {
                    Text("Allow alerts so workout, weigh-in, macros, and protocol reminders can reach your Lock Screen.")
                        .font(.caption2)
                }
                .listRowBackground(AppTheme.surface)

                Section {
                    Toggle("Workout Reminders", isOn: $settings.workoutRemindersEnabled)
                        .tint(AppTheme.gold)
                    DatePicker("Workout time", selection: $reminderTime, displayedComponents: .hourAndMinute)
                        .foregroundStyle(AppTheme.textPrimary)
                        .disabled(!settings.workoutRemindersEnabled)
                    Toggle("Morning Weigh-In", isOn: $settings.weighInRemindersEnabled)
                        .tint(AppTheme.gold)
                    DatePicker("Weigh-in time", selection: $weighInTime, displayedComponents: .hourAndMinute)
                        .foregroundStyle(AppTheme.textPrimary)
                        .disabled(!settings.weighInRemindersEnabled)
                    Toggle("Protocol Stack", isOn: $settings.protocolRemindersEnabled)
                        .tint(AppTheme.gold)
                    DatePicker("Morning protocol", selection: $protocolTime, displayedComponents: .hourAndMinute)
                        .foregroundStyle(AppTheme.textPrimary)
                        .disabled(!settings.protocolRemindersEnabled)
                    Toggle("Evening Macro Check", isOn: $settings.macroLeftoverRemindersEnabled)
                        .tint(AppTheme.gold)
                    DatePicker("Macro nudge", selection: $macroTime, displayedComponents: .hourAndMinute)
                        .foregroundStyle(AppTheme.textPrimary)
                        .disabled(!settings.macroLeftoverRemindersEnabled)
                    Toggle("Streak Reminders", isOn: $settings.streakRemindersEnabled)
                        .tint(AppTheme.gold)
                    Toggle("Weekly Summary", isOn: $settings.weeklySummaryEnabled)
                        .tint(AppTheme.gold)
                } header: {
                    PremiumLabel(text: "Notifications")
                } footer: {
                    Text("Workouts fire on training days from your 3-on / 1-off rotation. Protocol also sends an 8 PM evening check-in. Macro nudge reminds you if protein/calories are still open.")
                        .font(.caption2)
                }
                .listRowBackground(AppTheme.surface)

                Section {
                    Stepper("Rest: \(settings.restTimerSeconds)s", value: $settings.restTimerSeconds, in: 30...300, step: 15)
                    Toggle("Auto-start rest after set", isOn: $settings.autoStartRestTimer)
                        .tint(AppTheme.gold)
                } header: {
                    PremiumLabel(text: "Rest Timer")
                }
                .listRowBackground(AppTheme.surface)

                Section {
                    ForEach(workoutDays) { day in
                        VStack(alignment: .leading, spacing: 10) {
                            Text(day.name)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(AppTheme.textPrimary)
                            weekdayPicker(for: day)
                        }
                        .padding(.vertical, 6)
                        .listRowBackground(AppTheme.background)
                    }
                } header: {
                    PremiumLabel(text: "Weekly Schedule (legacy)")
                } footer: {
                    Text("Optional weekday tags. The live calendar uses your Upper/Lower rotation.")
                        .font(.caption2)
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(AppTheme.background)
            .navigationTitle("Schedule & Alerts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") { save() }
                        .foregroundStyle(AppTheme.gold)
                }
            }
            .onAppear {
                reminderTime = date(hour: settings.workoutReminderHour, minute: settings.workoutReminderMinute)
                weighInTime = date(hour: settings.weighInReminderHour, minute: settings.weighInReminderMinute)
                protocolTime = date(hour: settings.protocolReminderHour, minute: settings.protocolReminderMinute)
                macroTime = date(hour: settings.macroLeftoverReminderHour, minute: settings.macroLeftoverReminderMinute)
                Task {
                    notificationsGranted = await NotificationManager.shared.authorizationStatus() == .authorized
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func date(hour: Int, minute: Int) -> Date {
        var components = DateComponents()
        components.hour = hour
        components.minute = minute
        return Calendar.current.date(from: components) ?? .now
    }

    private func weekdayPicker(for day: WorkoutDay) -> some View {
        HStack(spacing: 6) {
            ForEach(0..<7, id: \.self) { index in
                let weekday = WeekdaySchedule.weekdayIndex(for: index)
                let isOn = day.scheduledWeekdays.contains(weekday)
                Button {
                    var days = day.scheduledWeekdays
                    if isOn { days.remove(weekday) } else { days.insert(weekday) }
                    day.scheduledWeekdays = days
                } label: {
                    Text(WeekdaySchedule.symbols[index])
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(isOn ? AppTheme.background : AppTheme.textSecondary)
                        .frame(width: 28, height: 28)
                        .background(isOn ? AppTheme.gold : AppTheme.surface)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func save() {
        let workout = Calendar.current.dateComponents([.hour, .minute], from: reminderTime)
        settings.workoutReminderHour = workout.hour ?? 17
        settings.workoutReminderMinute = workout.minute ?? 30

        let weigh = Calendar.current.dateComponents([.hour, .minute], from: weighInTime)
        settings.weighInReminderHour = weigh.hour ?? 7
        settings.weighInReminderMinute = weigh.minute ?? 0

        let protocolComps = Calendar.current.dateComponents([.hour, .minute], from: protocolTime)
        settings.protocolReminderHour = protocolComps.hour ?? 8
        settings.protocolReminderMinute = protocolComps.minute ?? 0

        let macro = Calendar.current.dateComponents([.hour, .minute], from: macroTime)
        settings.macroLeftoverReminderHour = macro.hour ?? 19
        settings.macroLeftoverReminderMinute = macro.minute ?? 0

        try? modelContext.save()

        Task {
            await NotificationManager.shared.ensureAuthorizedAndRefresh(
                settings: settings,
                workoutDays: workoutDays,
                sessions: sessions,
                protocolItems: protocolItems
            )
            dismiss()
        }
    }
}
