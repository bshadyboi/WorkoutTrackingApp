import Foundation
import UserNotifications

@MainActor
final class NotificationManager {
    static let shared = NotificationManager()

    private let center = UNUserNotificationCenter.current()
    private let restTimerID = "fittrack.rest"
    private let streakID = "fittrack.streak"
    private let weeklyID = "fittrack.weekly"
    private let weighInID = "fittrack.weighin"
    private let macroLeftoverID = "fittrack.macro.leftover"

    func requestAuthorization() async -> Bool {
        do {
            return try await center.requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return false
        }
    }

    func authorizationStatus() async -> UNAuthorizationStatus {
        await center.notificationSettings().authorizationStatus
    }

    /// Request permission if needed, then reschedule everything currently enabled.
    func ensureAuthorizedAndRefresh(
        settings: AppSettings,
        workoutDays: [WorkoutDay],
        sessions: [WorkoutSession],
        protocolItems: [ProtocolItem],
        todayProteinG: Int = 0,
        todayCalories: Int = 0
    ) async {
        let wantsAny =
            settings.workoutRemindersEnabled
            || settings.streakRemindersEnabled
            || settings.weeklySummaryEnabled
            || settings.protocolRemindersEnabled
            || settings.weighInRemindersEnabled
            || settings.macroLeftoverRemindersEnabled

        if wantsAny {
            let status = await authorizationStatus()
            if status == .notDetermined {
                _ = await requestAuthorization()
            }
        }
        await refreshAll(
            settings: settings,
            workoutDays: workoutDays,
            sessions: sessions,
            protocolItems: protocolItems,
            todayProteinG: todayProteinG,
            todayCalories: todayCalories
        )
    }

    func refreshAll(
        settings: AppSettings,
        workoutDays: [WorkoutDay],
        sessions: [WorkoutSession],
        protocolItems: [ProtocolItem],
        todayProteinG: Int = 0,
        todayCalories: Int = 0
    ) async {
        // Keep an in-flight rest timer notification if one is pending.
        let pending = await center.pendingNotificationRequests()
        let restPending = pending.first { $0.identifier == restTimerID }

        center.removeAllPendingNotificationRequests()
        if let restPending {
            try? await center.add(restPending)
        }

        guard await authorizationStatus() == .authorized else { return }

        if settings.workoutRemindersEnabled {
            scheduleWorkoutReminders(settings: settings)
        }
        if settings.weighInRemindersEnabled {
            scheduleWeighInReminder(settings: settings)
        }
        if settings.streakRemindersEnabled {
            scheduleStreakReminder(sessions: sessions)
        }
        if settings.weeklySummaryEnabled {
            scheduleWeeklySummary()
        }
        if settings.protocolRemindersEnabled {
            scheduleProtocolReminders(settings: settings, items: protocolItems)
        }
        if settings.macroLeftoverRemindersEnabled {
            scheduleMacroLeftoverReminder(
                settings: settings,
                todayProteinG: todayProteinG,
                todayCalories: todayCalories
            )
        }
    }

    /// Schedules the next ~3 weeks of training-day reminders from the rotation.
    func scheduleWorkoutReminders(settings: AppSettings) {
        let cal = Calendar.current
        let start = cal.startOfDay(for: .now)

        for offset in 0..<21 {
            guard let day = cal.date(byAdding: .day, value: offset, to: start),
                  let name = WorkoutRotation.scheduledName(on: day, settings: settings) else { continue }

            var comps = cal.dateComponents([.year, .month, .day], from: day)
            comps.hour = settings.workoutReminderHour
            comps.minute = settings.workoutReminderMinute

            if let fire = cal.date(from: comps), fire <= .now { continue }

            let content = UNMutableNotificationContent()
            content.title = "Workout Day"
            content.body = "Time for \(name). Open FitTrack and start your session."
            content.sound = .default

            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            let key = DailyTracker.dateKey(for: day)
            let id = "fittrack.workout.rotation.\(key)"
            center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
        }
    }

    func scheduleWeighInReminder(settings: AppSettings) {
        var date = DateComponents()
        date.hour = settings.weighInReminderHour
        date.minute = settings.weighInReminderMinute

        let content = UNMutableNotificationContent()
        content.title = "Morning Weigh-In"
        content.body = "Log your morning weight before you eat or drink."
        content.sound = .default

        let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        center.add(UNNotificationRequest(identifier: weighInID, content: content, trigger: trigger))
    }

    func scheduleStreakReminder(sessions: [WorkoutSession]) {
        guard !WorkoutAnalytics.hasWorkoutThisWeek(from: sessions) else { return }

        var date = DateComponents()
        date.weekday = 5
        date.hour = 18
        date.minute = 0

        let content = UNMutableNotificationContent()
        content.title = "Keep Your Streak"
        content.body = "You haven't logged a workout this week. One session keeps momentum going."
        content.sound = .default

        let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        center.add(UNNotificationRequest(identifier: streakID, content: content, trigger: trigger))
    }

    func scheduleWeeklySummary() {
        var date = DateComponents()
        date.weekday = 1
        date.hour = 19
        date.minute = 0

        let content = UNMutableNotificationContent()
        content.title = "Weekly Summary"
        content.body = "Open FitTrack to review this week's sessions, PRs, and progress."
        content.sound = .default

        let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        center.add(UNNotificationRequest(identifier: weeklyID, content: content, trigger: trigger))
    }

    func scheduleProtocolReminders(settings: AppSettings, items: [ProtocolItem]) {
        guard !items.isEmpty else { return }

        var morning = DateComponents()
        morning.hour = settings.protocolReminderHour
        morning.minute = settings.protocolReminderMinute

        let morningContent = UNMutableNotificationContent()
        morningContent.title = "Protocol Stack"
        morningContent.body = "Morning stack is due — open FitTrack to check injectables & AM off."
        morningContent.sound = .default
        center.add(UNNotificationRequest(
            identifier: "fittrack.protocol.morning",
            content: morningContent,
            trigger: UNCalendarNotificationTrigger(dateMatching: morning, repeats: true)
        ))

        var evening = DateComponents()
        evening.hour = 20
        evening.minute = 0

        let eveningContent = UNMutableNotificationContent()
        eveningContent.title = "Protocol Check-In"
        eveningContent.body = "PM stack + anything left from today. Check them off before bed."
        eveningContent.sound = .default
        center.add(UNNotificationRequest(
            identifier: "fittrack.protocol.evening",
            content: eveningContent,
            trigger: UNCalendarNotificationTrigger(dateMatching: evening, repeats: true)
        ))
    }

    func scheduleMacroLeftoverReminder(settings: AppSettings, todayProteinG: Int, todayCalories: Int) {
        let proteinLeft = settings.proteinGoalG - todayProteinG
        let calLeft = settings.calorieGoal - todayCalories

        var date = DateComponents()
        date.hour = settings.macroLeftoverReminderHour
        date.minute = settings.macroLeftoverReminderMinute

        let content = UNMutableNotificationContent()
        content.title = "Evening Macros"
        if proteinLeft > 25 {
            content.body = "You're ~\(proteinLeft)g protein short. Shake, Greek yogurt, or chicken closes it."
        } else if calLeft > 350 {
            content.body = "~\(calLeft) calories left — log a snack if you're still under goal."
        } else if proteinLeft > 0 || calLeft > 0 {
            content.body = "Almost there — check FitTrack and finish the day strong."
        } else {
            content.body = "Macros look solid. Open FitTrack if you still need to log dinner."
        }
        content.sound = .default

        let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        center.add(UNNotificationRequest(identifier: macroLeftoverID, content: content, trigger: trigger))
    }

    func scheduleRestTimer(seconds: Int) {
        cancelRestTimerNotification()
        let content = UNMutableNotificationContent()
        content.title = "Rest Complete"
        content.body = "Time for your next set."
        content.sound = .default
        if #available(iOS 15.0, *) {
            content.interruptionLevel = .timeSensitive
        }

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(max(seconds, 1)), repeats: false)
        center.add(UNNotificationRequest(identifier: restTimerID, content: content, trigger: trigger))
    }

    func cancelRestTimerNotification() {
        center.removePendingNotificationRequests(withIdentifiers: [restTimerID])
    }

    func postPRNotification(exercise: String, weight: Int) {
        let content = UNMutableNotificationContent()
        content.title = "New Personal Record"
        content.body = "\(exercise) — \(weight) lbs. Strong work."
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        center.add(UNNotificationRequest(identifier: "fittrack.pr.\(UUID().uuidString)", content: content, trigger: trigger))
    }
}
