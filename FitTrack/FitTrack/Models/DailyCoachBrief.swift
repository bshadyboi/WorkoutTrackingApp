import Foundation

struct DailyCoachBrief: Equatable {
    let headline: String
    let workoutLine: String
    let loadLine: String?
    let nutritionLine: String
    let protocolLine: String
    let weighInLine: String
    let insightLine: String?
    let recoveryLine: String?
    let actions: [CoachAction]

    struct CoachAction: Equatable, Identifiable {
        let id: String
        let title: String
        let kind: Kind

        enum Kind: Equatable {
            case train
            case nutrition
            case protocolTab
            case weighIn
            case recoverMissed
        }
    }
}

enum DailyCoachBriefEngine {
    /// Target lean-bulk gain ~0.25–0.5 lb/week.
    private static let leanBulkMinPerWeek = 0.2
    private static let leanBulkMaxPerWeek = 0.55

    static func build(
        settings: AppSettings,
        workoutDays: [WorkoutDay],
        sessions: [WorkoutSession],
        nutritionEntries: [NutritionEntry],
        bodyWeights: [BodyWeightLog],
        protocolItems: [ProtocolItem],
        now: Date = .now
    ) -> DailyCoachBrief {
        let completed = sessions.filter { $0.endedAt != nil }
        let workoutName = WorkoutRotation.scheduledName(on: now, settings: settings)
        let day = WorkoutRotation.workoutDay(from: workoutDays, on: now, settings: settings)
        let alreadyTrainedToday = completed.contains {
            Calendar.current.isDate($0.startedAt, inSameDayAs: now)
        }

        let (workoutLine, loadLine, trainAction) = workoutSection(
            workoutName: workoutName,
            day: day,
            sessions: completed,
            alreadyTrainedToday: alreadyTrainedToday
        )

        let nutrition = DailyTracker.todayNutritionTotals(from: nutritionEntries)
        let (nutritionLine, nutritionAction) = nutritionSection(
            settings: settings,
            calories: nutrition.calories,
            protein: nutrition.protein,
            now: now
        )

        let (protocolLine, protocolAction) = protocolSection(items: protocolItems, now: now)
        let (weighInLine, weighAction) = weighInSection(settings: settings, logs: bodyWeights, now: now)

        let insightsReport = ProtocolInsights.build(
            protocolItems: protocolItems,
            sessions: completed,
            bodyWeights: bodyWeights,
            now: now
        )
        let insightLine = ProtocolInsights.briefLine(from: insightsReport)

        let recovery = MissedDayRecoveryEngine.build(
            settings: settings,
            sessions: completed,
            now: now
        )
        let recoveryLine = recovery.map { "\($0.summaryLine) \($0.detailLine)" }

        var actions: [DailyCoachBrief.CoachAction] = []
        if let recovery {
            actions.append(
                DailyCoachBrief.CoachAction(
                    id: "recover",
                    title: recovery.primaryActionTitle,
                    kind: .recoverMissed
                )
            )
        }
        if let trainAction { actions.append(trainAction) }
        if let nutritionAction { actions.append(nutritionAction) }
        if let protocolAction { actions.append(protocolAction) }
        if let weighAction { actions.append(weighAction) }

        let prToday = completed.contains { session in
            Calendar.current.isDate(session.startedAt, inSameDayAs: now) && !session.prsHit.isEmpty
        }

        let headline = makeHeadline(
            workoutName: workoutName,
            alreadyTrainedToday: alreadyTrainedToday,
            loadLine: loadLine,
            proteinLeft: max(0, settings.proteinGoalG - nutrition.protein),
            protocolDue: protocolDueCount(items: protocolItems, now: now),
            prToday: prToday,
            recovery: recovery,
            now: now
        )

        return DailyCoachBrief(
            headline: headline,
            workoutLine: workoutLine,
            loadLine: loadLine,
            nutritionLine: nutritionLine,
            protocolLine: protocolLine,
            weighInLine: weighInLine,
            insightLine: insightLine,
            recoveryLine: recoveryLine,
            actions: Array(actions.prefix(3))
        )
    }

    // MARK: - Sections

    private static func workoutSection(
        workoutName: String?,
        day: WorkoutDay?,
        sessions: [WorkoutSession],
        alreadyTrainedToday: Bool
    ) -> (String, String?, DailyCoachBrief.CoachAction?) {
        guard let workoutName else {
            return ("Rest day — recover, walk, and hit protein.", nil, nil)
        }

        if alreadyTrainedToday {
            return ("\(workoutName) already logged today. Nice work.", nil, nil)
        }

        let exercises = (day?.exercises ?? []).sorted { $0.sortOrder < $1.sortOrder }
        let focus = exercises.first(where: \.hasCrownSet) ?? exercises.first
        let lastSets = WorkoutAnalytics.lastSetsByExercise(from: sessions)
        var loadLine: String?

        if let focus {
            let previous = lastSets[focus.name] ?? []
            let top = previous.first
            if let top {
                let suggestion = suggestedLoad(previous: top)
                loadLine = "\(focus.name): last \(top.weight)×\(top.reps)"
                    + (top.rir.map { " @ RIR \($0)" } ?? "")
                    + " → \(suggestion)"
            } else {
                loadLine = "\(focus.name): no history yet — start around \(focus.defaultWeight) lb."
            }
        }

        let workoutLine = "Today is \(workoutName)"
            + (focus.map { " · focus \($0.name)" } ?? "")
            + "."

        return (
            workoutLine,
            loadLine,
            DailyCoachBrief.CoachAction(id: "train", title: "Start \(workoutName)", kind: .train)
        )
    }

    private static func suggestedLoad(previous: WorkoutAnalytics.PreviousSet) -> String {
        let rir = previous.rir ?? 2
        let bump: Double = previous.weight >= 100 ? 5 : 2

        if rir <= 1 {
            let next = previous.weight + bump
            return "try \(WeightFormat.display(next)) lb"
        }
        if rir >= 3 {
            return "hold \(WeightFormat.display(previous.weight)) lb, push reps"
        }
        return "repeat \(WeightFormat.display(previous.weight)) lb or +\(Int(bump)) if it feels easy"
    }

    private static func nutritionSection(
        settings: AppSettings,
        calories: Int,
        protein: Int,
        now: Date
    ) -> (String, DailyCoachBrief.CoachAction?) {
        let proteinLeft = settings.proteinGoalG - protein
        let calLeft = settings.calorieGoal - calories
        let evening = Calendar.current.component(.hour, from: now) >= 17

        if proteinLeft <= 0 && calLeft <= 150 {
            return ("Macros look solid — \(protein)g protein, \(calories) cal logged.", nil)
        }

        if proteinLeft > 25 {
            let fix = evening
                ? "Easy fix: whey shake or Greek yogurt tonight."
                : "Easy fix: chicken, shake, or Greek yogurt."
            return (
                "~\(proteinLeft)g protein still open (\(protein)/\(settings.proteinGoalG)g). \(fix)",
                DailyCoachBrief.CoachAction(id: "nutrition", title: "Log food", kind: .nutrition)
            )
        }

        if calLeft > 400 {
            return (
                "~\(calLeft) calories left under \(settings.calorieGoal). Add a meal if you're still hungry.",
                DailyCoachBrief.CoachAction(id: "nutrition", title: "Log food", kind: .nutrition)
            )
        }

        if proteinLeft > 0 {
            return (
                "Almost there — \(proteinLeft)g protein left.",
                DailyCoachBrief.CoachAction(id: "nutrition", title: "Log food", kind: .nutrition)
            )
        }

        return ("Calories still open by ~\(max(calLeft, 0)). Finish the day when ready.", nil)
    }

    private static func protocolSection(items: [ProtocolItem], now: Date) -> (String, DailyCoachBrief.CoachAction?) {
        let weekday = Calendar.current.component(.weekday, from: now)
        let key = DailyTracker.dateKey(for: now)
        let due = items.filter { $0.isDue(on: weekday) }
        guard !due.isEmpty else {
            return ("No protocol items due today.", nil)
        }
        let taken = due.filter { $0.isTaken(on: key) }.count
        let remaining = due.count - taken
        if remaining == 0 {
            return ("Protocol stack complete (\(taken)/\(due.count)).", nil)
        }
        return (
            "\(remaining) protocol item\(remaining == 1 ? "" : "s") still due (\(taken)/\(due.count) done).",
            DailyCoachBrief.CoachAction(id: "protocol", title: "Open Protocol", kind: .protocolTab)
        )
    }

    private static func protocolDueCount(items: [ProtocolItem], now: Date) -> Int {
        let weekday = Calendar.current.component(.weekday, from: now)
        let key = DailyTracker.dateKey(for: now)
        let due = items.filter { $0.isDue(on: weekday) }
        return due.filter { !$0.isTaken(on: key) }.count
    }

    private static func weighInSection(
        settings: AppSettings,
        logs: [BodyWeightLog],
        now: Date
    ) -> (String, DailyCoachBrief.CoachAction?) {
        let todayLogged = logs.contains { Calendar.current.isDate($0.loggedAt, inSameDayAs: now) }
        let points = ProgressAnalytics.weightChartPoints(from: logs, days: 21)
        let rate = weeklyRate(from: points)

        var parts: [String] = []
        if !todayLogged {
            parts.append("No morning weight yet.")
        }

        if let rate {
            let pace: String
            if rate < leanBulkMinPerWeek {
                pace = "slow for lean bulk (~\(String(format: "%.2f", rate)) lb/wk)"
            } else if rate > leanBulkMaxPerWeek {
                pace = "fast for lean bulk (~\(String(format: "%.2f", rate)) lb/wk) — watch surplus"
            } else {
                pace = "on pace (~\(String(format: "%.2f", rate)) lb/wk)"
            }
            parts.append(pace.prefix(1).uppercased() + pace.dropFirst())
        } else if todayLogged {
            parts.append("Log a few more mornings to see lean-bulk pace.")
        }

        let line = parts.isEmpty ? "Weigh-in tracking looks good." : parts.joined(separator: " ")
        let action: DailyCoachBrief.CoachAction? = todayLogged
            ? nil
            : DailyCoachBrief.CoachAction(id: "weigh", title: "Log weight", kind: .weighIn)
        return (line, action)
    }

    private static func weeklyRate(from points: [(date: Date, weight: Double)]) -> Double? {
        guard let first = points.first, let last = points.last, points.count >= 3 else { return nil }
        let days = max(last.date.timeIntervalSince(first.date) / 86_400, 1)
        guard days >= 5 else { return nil }
        return (last.weight - first.weight) / days * 7
    }

    private static func makeHeadline(
        workoutName: String?,
        alreadyTrainedToday: Bool,
        loadLine: String?,
        proteinLeft: Int,
        protocolDue: Int,
        prToday: Bool,
        recovery: MissedDayRecovery?,
        now: Date
    ) -> String {
        // Hype: a PR already landed today.
        if prToday {
            return rotate([
                "PR in the books today. That's how it's done. 🔥",
                "New PR logged — you're rewriting the ceiling.",
                "That PR was earned. Ride the momentum into recovery.",
                "PR day. Days like this compound. Eat and sleep like you mean it."
            ], now: now)
        }

        // Missed-day recovery takes priority over soft nudges.
        if let recovery, !alreadyTrainedToday {
            switch recovery.recommendation {
            case .doToday:
                return rotate([
                    "Missed \(recovery.missedName) — today's open. Run it.",
                    "Catch-up day: \(recovery.missedName) is waiting.",
                    "Debt to clear: \(recovery.missedName). Today works."
                ], now: now)
            case .swapForToday:
                return rotate([
                    "Fresh miss on \(recovery.missedName). Swap it in today.",
                    "\(recovery.missedName) slipped — knock it out now.",
                    "Don't let \(recovery.missedName) stack. Swap it in."
                ], now: now)
            case .doTomorrow:
                break
            case .skipAndMoveOn:
                return rotate([
                    "Old miss on \(recovery.missedName) — skip it, stay on plan.",
                    "Don't stack debt. Skip \(recovery.missedName) and train today.",
                    "\(recovery.missedName) is stale. Move on."
                ], now: now)
            }
        }

        // Workout on deck: keep the grounded load tip, vary the wrapper.
        if let workoutName, !alreadyTrainedToday {
            if let loadLine, loadLine.contains("→"),
               let tip = loadLine.split(separator: "→").last
                .map({ String($0).trimmingCharacters(in: .whitespaces) }) {
                return rotate([
                    "\(workoutName) today — \(tip).",
                    "\(workoutName) on deck. Plan: \(tip).",
                    "Time for \(workoutName). \(tip.prefix(1).capitalized + tip.dropFirst()).",
                    "\(workoutName). Own the crown set — \(tip)."
                ], now: now)
            }
            return rotate([
                "\(workoutName) is on deck. Warm up and own the crown set.",
                "\(workoutName) today. Show up, warm up, work up.",
                "\(workoutName) is calling. First set is the hardest — start it.",
                "\(workoutName) day. Leave a little better than yesterday."
            ], now: now)
        }

        // Gentle nudge: trained but protein is short.
        if alreadyTrainedToday, proteinLeft > 25 {
            return rotate([
                "Training done — close ~\(proteinLeft)g protein.",
                "Lift's done, gains aren't — ~\(proteinLeft)g protein to go.",
                "Great session. Now feed it: ~\(proteinLeft)g protein left."
            ], now: now)
        }

        if let recovery, alreadyTrainedToday, recovery.recommendation == .doTomorrow {
            return rotate([
                "Nice session. Park \(recovery.missedName) for tomorrow.",
                "Logged today — \(recovery.missedName) can wait until tomorrow.",
                "Recovery plan: \(recovery.missedName) tomorrow."
            ], now: now)
        }

        if protocolDue > 0 {
            let item = "item\(protocolDue == 1 ? "" : "s")"
            return rotate([
                "\(protocolDue) protocol \(item) still open.",
                "Don't forget the stack — \(protocolDue) \(item) left.",
                "Quick one: \(protocolDue) protocol \(item) to check off."
            ], now: now)
        }

        if proteinLeft > 25 {
            return rotate([
                "Hit protein next — ~\(proteinLeft)g left.",
                "Protein's the gap today — ~\(proteinLeft)g to go.",
                "~\(proteinLeft)g protein between you and a clean day."
            ], now: now)
        }

        // Dry wit: rest day.
        if workoutName == nil {
            return rotate([
                "Rest day. Recover hard, eat on plan.",
                "Rest day — muscles grow now, not in the gym. Enjoy it.",
                "No lifting today. Doing nothing is the assignment. Nail it.",
                "Rest day. The couch is programming too. Hit your protein."
            ], now: now)
        }

        return rotate([
            "You're on track — keep logging.",
            "Everything's green today. Just keep it rolling.",
            "Dialed in. Nothing to fix — go live your day."
        ], now: now)
    }

    /// Deterministically pick a variant that stays stable within a day but rotates day to day.
    private static func rotate(_ options: [String], now: Date) -> String {
        guard !options.isEmpty else { return "" }
        let day = Calendar.current.ordinality(of: .day, in: .era, for: now) ?? 0
        return options[day % options.count]
    }
}
