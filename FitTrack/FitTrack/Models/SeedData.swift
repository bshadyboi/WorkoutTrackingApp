import Foundation
import SwiftData

struct ExerciseTemplate {
    let name: String
    let muscle: String
    let hasCrownSet: Bool
    /// e.g. "6–8" — only used when hasCrownSet
    let crownRepRange: String
    let workingSets: Int
    /// e.g. "8–10" or "12–15"
    let workingRepRange: String
    let weight: Int
    let instructions: String
    let tips: [String]

    var totalSets: Int { hasCrownSet ? workingSets + 1 : workingSets }

    var defaultReps: Int {
        StoredExercise.midpoint(of: workingRepRange)
            ?? StoredExercise.midpoint(of: crownRepRange)
            ?? 10
    }
}

struct WorkoutTemplate {
    let name: String
    let subtitle: String
    let exercises: [ExerciseTemplate]
}

enum WorkoutLibrary {
    static let programSubtitle = "5-Day Upper/Lower — Lean Bulk"

    /// Brandon's EA 5-day split matching the coaching preview screens.
    static let builtIn: [WorkoutTemplate] = [
        WorkoutTemplate(
            name: "Upper A",
            subtitle: programSubtitle,
            exercises: [
                ExerciseTemplate(
                    name: "Chest Press", muscle: "Chest", hasCrownSet: true,
                    crownRepRange: "6–8", workingSets: 3, workingRepRange: "8–10", weight: 98,
                    instructions: "Machine or DB chest press. Control the stretch, drive up without locking hard.",
                    tips: ["Crown set first", "Keep scapulae set"]
                ),
                ExerciseTemplate(
                    name: "Triceps Pushdown", muscle: "Triceps", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 65,
                    instructions: "Elbows pinned. Full extension, controlled return.",
                    tips: ["No elbow flare", "Squeeze at bottom"]
                ),
                ExerciseTemplate(
                    name: "Wide Grip Lat Pulldown", muscle: "Lats", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "8–12", weight: 118,
                    instructions: "Wide grip, pull to upper chest, squeeze lats.",
                    tips: ["Lean slightly back", "Full stretch at top"]
                ),
                ExerciseTemplate(
                    name: "Lateral Raise (Cable)", muscle: "Side Delts", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 17,
                    instructions: "Cable at low position. Raise to just below shoulder height.",
                    tips: ["Lead with elbows", "Soft elbows"]
                ),
                ExerciseTemplate(
                    name: "Preacher Curl", muscle: "Biceps", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 113,
                    instructions: "Full stretch at bottom, squeeze at top. No swinging.",
                    tips: ["Control the negative", "Keep upper arms planted"]
                ),
            ]
        ),
        WorkoutTemplate(
            name: "Lower B",
            subtitle: programSubtitle,
            exercises: [
                ExerciseTemplate(
                    name: "Belt Squat", muscle: "Quads", hasCrownSet: true,
                    crownRepRange: "6–8", workingSets: 3, workingRepRange: "8–10", weight: 0,
                    instructions: "Upright torso. Sit between heels, drive up through mid-foot.",
                    tips: ["6–8 crown set", "Depth you can own"]
                ),
                ExerciseTemplate(
                    name: "Hip Thrust", muscle: "Glutes", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "8–12", weight: 0,
                    instructions: "Upper back on bench. Drive hips to full lockout, pause.",
                    tips: ["Chin tucked", "Ribs down"]
                ),
                ExerciseTemplate(
                    name: "Lying Leg Curl", muscle: "Hamstrings", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "8–12", weight: 0,
                    instructions: "Hips pinned. Full squeeze at top, controlled lower.",
                    tips: ["Don't arch lumbar", "Pause at peak"]
                ),
                ExerciseTemplate(
                    name: "Leg Extension", muscle: "Quads", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 123,
                    instructions: "Full extension, controlled negative. Soft lockout.",
                    tips: ["Don't slam the stack", "Squeeze quads hard"]
                ),
                ExerciseTemplate(
                    name: "Hanging Leg Raise", muscle: "Abs", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 0,
                    instructions: "Posterior pelvic tilt. Raise legs without swinging.",
                    tips: ["12–15 reps", "Control the lower"]
                ),
            ]
        ),
        WorkoutTemplate(
            name: "Upper B",
            subtitle: programSubtitle,
            exercises: [
                ExerciseTemplate(
                    name: "Incline Chest Press", muscle: "Upper Chest", hasCrownSet: true,
                    crownRepRange: "6–8", workingSets: 3, workingRepRange: "8–10", weight: 73,
                    instructions: "30–45° incline. Lower with control, press up and slightly in.",
                    tips: ["Crown set first", "Don't flare elbows wide"]
                ),
                ExerciseTemplate(
                    name: "Seated Cable Row", muscle: "Back", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "8–12", weight: 145,
                    instructions: "Neutral spine. Pull to stomach, squeeze mid-back.",
                    tips: ["No shrug", "Pause at contraction"]
                ),
                ExerciseTemplate(
                    name: "Reverse Fly", muscle: "Rear Delts", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 83,
                    instructions: "Light weight, wide arc. Squeeze rear delts at peak.",
                    tips: ["Soft elbows", "No momentum"]
                ),
                ExerciseTemplate(
                    name: "Overhead Triceps Extension", muscle: "Triceps", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 37,
                    instructions: "Elbows high and fixed. Full stretch overhead, extend.",
                    tips: ["12–15 reps", "Don't flare elbows"]
                ),
                ExerciseTemplate(
                    name: "Hammer Curl", muscle: "Biceps", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 33,
                    instructions: "Neutral grip. Elbows tight to sides.",
                    tips: ["Control both directions", "No swinging"]
                ),
            ]
        ),
        WorkoutTemplate(
            name: "Upper C",
            subtitle: programSubtitle,
            exercises: [
                ExerciseTemplate(
                    name: "Lat Pulldown", muscle: "Lats", hasCrownSet: true,
                    crownRepRange: "6–8", workingSets: 3, workingRepRange: "8–10", weight: 143,
                    instructions: "Slight lean. Pull to upper chest, full stretch at top.",
                    tips: ["Crown set first", "Drive elbows down"]
                ),
                ExerciseTemplate(
                    name: "Chest Fly", muscle: "Chest", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 73,
                    instructions: "Wide hug arc. Stretch at bottom, squeeze at midline.",
                    tips: ["Soft elbows", "Don't bounce"]
                ),
                ExerciseTemplate(
                    name: "Rear Delt Pulls", muscle: "Rear Delts", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 140,
                    instructions: "Pull to face / upper chest with rear delt focus.",
                    tips: ["High elbows", "Slow eccentrics"]
                ),
                ExerciseTemplate(
                    name: "Triceps Extension", muscle: "Triceps", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 38,
                    instructions: "Cable or machine extension. Full lockout squeeze.",
                    tips: ["Elbows fixed", "Control the return"]
                ),
                ExerciseTemplate(
                    name: "Incline Curl", muscle: "Biceps", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 33,
                    instructions: "Incline bench. Full stretch at bottom of each rep.",
                    tips: ["No shoulder swing", "Squeeze hard at top"]
                ),
            ]
        ),
        WorkoutTemplate(
            name: "Lower A",
            subtitle: programSubtitle,
            exercises: [
                ExerciseTemplate(
                    name: "Leg Press", muscle: "Quads", hasCrownSet: true,
                    crownRepRange: "6–8", workingSets: 3, workingRepRange: "8–10", weight: 380,
                    instructions: "Feet shoulder-width. Deep controlled depth, don't lock out hard.",
                    tips: ["Crown set first", "Keep lower back glued"]
                ),
                ExerciseTemplate(
                    name: "Seated Leg Curl", muscle: "Hamstrings", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "8–12", weight: 78,
                    instructions: "Hips down. Curl through a full squeeze.",
                    tips: ["No hip lift", "Pause at peak"]
                ),
                ExerciseTemplate(
                    name: "Leg Extension", muscle: "Quads", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 123,
                    instructions: "Full extension with control. Soft knees at top.",
                    tips: ["Mind-muscle on quads", "Slow negative"]
                ),
                ExerciseTemplate(
                    name: "Standing Calf Raise", muscle: "Calves", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 88,
                    instructions: "Full stretch at bottom, pause at top.",
                    tips: ["Straight knees", "Don't bounce"]
                ),
                ExerciseTemplate(
                    name: "Cable Crunch", muscle: "Abs", hasCrownSet: false,
                    crownRepRange: "", workingSets: 3, workingRepRange: "12–15", weight: 28,
                    instructions: "Crunch elbows toward knees. Round upper spine.",
                    tips: ["Pelvis stable", "Squeeze abs hard"]
                ),
            ]
        ),
    ]
}

/// 5-day rotation matching EA calendar: Upper A → Lower B → Upper B → Upper C → Lower A.
/// Pattern: 3 training days, 1 rest (anchored so Jul 11, 2026 = Upper A).
enum WorkoutRotation {
    static let order = ["Upper A", "Lower B", "Upper B", "Upper C", "Lower A"]

    private static var anchorDate: Date {
        var comps = DateComponents()
        comps.year = 2026
        comps.month = 7
        comps.day = 11
        return Calendar.current.date(from: comps) ?? Date()
    }

    static func scheduledName(on date: Date, settings: AppSettings? = nil) -> String? {
        if let settings {
            let key = DailyTracker.dateKey(for: date)
            if let override = settings.scheduleOverrides[key] {
                return override
            }
            if settings.skippedWorkoutDates.contains(key) {
                return nil
            }
        }
        let cal = Calendar.current
        let day = cal.startOfDay(for: date)
        let anchor = cal.startOfDay(for: anchorDate)
        let delta = cal.dateComponents([.day], from: anchor, to: day).day ?? 0
        guard let ordinal = trainingOrdinal(delta: delta) else { return nil }
        let idx = ((ordinal % order.count) + order.count) % order.count
        return order[idx]
    }

    static func workoutDay(from days: [WorkoutDay], on date: Date = .now, settings: AppSettings? = nil) -> WorkoutDay? {
        guard let name = scheduledName(on: date, settings: settings) else { return nil }
        return days.first { $0.name == name }
    }

    /// Training-day index (0 = Upper A on anchor), or nil if rest.
    private static func trainingOrdinal(delta: Int) -> Int? {
        let block = ((delta % 4) + 4) % 4
        if block == 3 { return nil }
        let q = Int(floor(Double(delta) / 4.0))
        return q * 3 + block
    }
}

enum DataSeeder {
    static func seedIfNeeded(context: ModelContext) {
        let settingsDescriptor = FetchDescriptor<AppSettings>()
        guard (try? context.fetch(settingsDescriptor).first) == nil else {
            seedWorkoutLibraryIfNeeded(context: context)
            syncEAPrescriptionsIfNeeded(context: context)
            syncExerciseVideosIfNeeded(context: context)
            assignDefaultSchedulesIfNeeded(context: context)
            seedProtocolIfNeeded(context: context)
            seedWorkoutHistoryIfNeeded(context: context)
            return
        }

        let settings = AppSettings(
            programName: "FitTrack Split",
            programSubtitle: WorkoutLibrary.programSubtitle
        )
        context.insert(settings)
        seedWorkoutLibraryIfNeeded(context: context)
        seedProtocolIfNeeded(context: context)

        if let firstDay = try? context.fetch(FetchDescriptor<WorkoutDay>(sortBy: [SortDescriptor(\.sortOrder)])).first {
            settings.selectedWorkoutDayID = firstDay.id
        }

        seedWorkoutHistoryIfNeeded(context: context)
        try? context.save()
    }

    static func seedWorkoutLibraryIfNeeded(context: ModelContext) {
        let existing = (try? context.fetch(FetchDescriptor<WorkoutDay>())) ?? []
        let hasCurrentSplit = existing.contains { $0.name == "Upper A" }
            && existing.contains { $0.name == "Lower B" }

        if !existing.isEmpty && !hasCurrentSplit {
            for day in existing { context.delete(day) }
        } else if hasCurrentSplit {
            assignDefaultSchedulesIfNeeded(context: context)
            return
        }

        for (index, template) in WorkoutLibrary.builtIn.enumerated() {
            insertWorkout(template, sortOrder: index, context: context)
        }

        let settings = try? context.fetch(FetchDescriptor<AppSettings>()).first
        if let upperA = try? context.fetch(FetchDescriptor<WorkoutDay>()).first(where: { $0.name == "Upper A" }) {
            settings?.selectedWorkoutDayID = upperA.id
        }

        assignDefaultSchedulesIfNeeded(context: context)
        try? context.save()
    }

    /// Bring existing Upper/Lower days in line with EA preview screens (names, crown sets, ranges).
    static func syncEAPrescriptionsIfNeeded(context: ModelContext) {
        let days = (try? context.fetch(FetchDescriptor<WorkoutDay>())) ?? []
        guard days.contains(where: { $0.name == "Upper A" }) else { return }

        var needsSync = false
        if let upperA = days.first(where: { $0.name == "Upper A" }),
           let chest = upperA.exercises.first(where: { $0.name == "Chest Press" }) {
            if !chest.hasCrownSet || chest.workingRepRange != "8–10" || !upperA.subtitle.contains("Lean Bulk") {
                needsSync = true
            }
        } else {
            needsSync = true
        }

        guard needsSync else { return }

        for (index, template) in WorkoutLibrary.builtIn.enumerated() {
            if let existing = days.first(where: { $0.name == template.name }) {
                replaceExercises(on: existing, with: template, context: context)
                existing.subtitle = template.subtitle
                existing.sortOrder = index
            } else {
                insertWorkout(template, sortOrder: index, context: context)
            }
        }

        if let settings = try? context.fetch(FetchDescriptor<AppSettings>()).first {
            settings.programSubtitle = WorkoutLibrary.programSubtitle
            if settings.programName.isEmpty || settings.programName == "Hypertrophy Block A" {
                settings.programName = "FitTrack Split"
            }
        }

        try? context.save()
    }

    private static func replaceExercises(on day: WorkoutDay, with template: WorkoutTemplate, context: ModelContext) {
        for old in day.exercises {
            context.delete(old)
        }
        day.exercises.removeAll()

        for (index, item) in template.exercises.enumerated() {
            let catalog = ExerciseCatalogData.entry(named: item.name)
            let exercise = StoredExercise(
                name: item.name,
                muscle: item.muscle,
                defaultSets: item.totalSets,
                defaultReps: item.defaultReps,
                defaultWeight: item.weight,
                instructions: catalog?.instructions ?? item.instructions,
                tips: catalog?.tips ?? item.tips,
                sortOrder: index,
                videoURL: catalog?.videoURL ?? "",
                hasCrownSet: item.hasCrownSet,
                crownRepRange: item.crownRepRange,
                workingRepRange: item.workingRepRange
            )
            exercise.day = day
            day.exercises.append(exercise)
            context.insert(exercise)
        }
    }

    static func syncExerciseVideosIfNeeded(context: ModelContext) {
        let exercises = (try? context.fetch(FetchDescriptor<StoredExercise>())) ?? []
        var changed = false

        for exercise in exercises where exercise.videoURL.isEmpty {
            if let catalog = ExerciseCatalogData.entry(named: exercise.name) {
                exercise.videoURL = catalog.videoURL
                changed = true
            }
        }

        if changed { try? context.save() }
    }

    static func assignDefaultSchedulesIfNeeded(context: ModelContext) {
        let days = (try? context.fetch(FetchDescriptor<WorkoutDay>())) ?? []
        let defaults: [String: [Int]] = [
            "Upper A": [6, 7],
            "Lower B": [1],
            "Upper B": [2],
            "Upper C": [3],
            "Lower A": [4, 5],
        ]
        var changed = false
        for day in days {
            guard let weekdays = defaults[day.name], day.scheduledWeekdays.isEmpty else { continue }
            day.scheduledWeekdays = Set(weekdays)
            changed = true
        }
        if changed { try? context.save() }
    }

    static func seedProtocolIfNeeded(context: ModelContext) {
        let existing = (try? context.fetch(FetchDescriptor<ProtocolItem>())) ?? []
        // Replace any prior demo/legacy stack with Brandon's current protocol once.
        let alreadyCurrent = existing.contains { $0.name.localizedCaseInsensitiveContains("CJC") }
        if !existing.isEmpty {
            if alreadyCurrent { return }
            for item in existing { context.delete(item) }
        }

        // name, dosage, scheduleLabel, frequencyLabel
        let defaults: [(String, String, String, String)] = [
            ("CJC + IPA", "1mg · SubQ", "SubQ", "M-F"),
            ("MOTS-C", "4mg · SubQ", "SubQ", "Mon Thu"),
            ("Retatrutide", "4mg · SubQ", "SubQ", "Sun"),
            ("Glutathione", "200mg · SubQ", "SubQ", "Mon Wed Fri"),
            ("Citrus Bergamot", "1200mg · Oral · AM", "AM", "Daily"),
            ("Omega 3", "2500mg · Oral · AM", "AM", "Daily"),
            ("Psyllium Husk", "1200mg · Oral · AM", "AM", "Daily"),
            ("Multivitamin", "1 capsule · Oral · AM", "AM", "Daily"),
            ("Magnesium Glycinate", "420mg · Oral · PM", "PM", "Daily"),
            ("TUDCA", "500mg · Oral · PM", "PM", "Daily"),
        ]
        for (index, item) in defaults.enumerated() {
            context.insert(
                ProtocolItem(
                    name: item.0,
                    dosage: item.1,
                    scheduleLabel: item.2,
                    frequencyLabel: item.3,
                    sortOrder: index
                )
            )
        }
        try? context.save()
    }

    static func insertWorkout(_ template: WorkoutTemplate, sortOrder: Int, context: ModelContext) -> WorkoutDay {
        let day = WorkoutDay(name: template.name, subtitle: template.subtitle, sortOrder: sortOrder)
        context.insert(day)

        for (index, item) in template.exercises.enumerated() {
            let catalog = ExerciseCatalogData.entry(named: item.name)
            let exercise = StoredExercise(
                name: item.name,
                muscle: item.muscle,
                defaultSets: item.totalSets,
                defaultReps: item.defaultReps,
                defaultWeight: item.weight,
                instructions: catalog?.instructions ?? item.instructions,
                tips: catalog?.tips ?? item.tips,
                sortOrder: index,
                videoURL: catalog?.videoURL ?? "",
                hasCrownSet: item.hasCrownSet,
                crownRepRange: item.crownRepRange,
                workingRepRange: item.workingRepRange
            )
            exercise.day = day
            day.exercises.append(exercise)
            context.insert(exercise)
        }

        return day
    }

    /// Brandon's Jul 2026 EA calendar logs — the exact previous weights from his screenshots.
    /// Versioned so existing installs force-import / refresh the data.
    static let workoutHistoryVersion = 2

    static func seedWorkoutHistoryIfNeeded(context: ModelContext) {
        guard let settings = try? context.fetch(FetchDescriptor<AppSettings>()).first else { return }
        guard settings.seededWorkoutHistoryVersion < workoutHistoryVersion else { return }

        let existing = (try? context.fetch(FetchDescriptor<WorkoutSession>())) ?? []

        // Replace any sessions on the screenshot history dates so previous: lines match exactly.
        for seed in BrandonWorkoutHistory.sessions {
            let key = String(format: "%04d-%02d-%02d", seed.year, seed.month, seed.day)
            for session in existing where session.dayName == seed.dayName {
                guard let ended = session.endedAt else { continue }
                if DailyTracker.dateKey(for: ended) == key || DailyTracker.dateKey(for: session.startedAt) == key {
                    context.delete(session)
                }
            }
            insertHistoricalSession(seed, context: context)
        }

        // Prefill exercise default weights from the most recent logged set for each lift.
        syncDefaultWeightsFromHistory(context: context)

        settings.hasSeededWorkoutHistory = true
        settings.seededWorkoutHistoryVersion = workoutHistoryVersion
        try? context.save()
    }

    private static func syncDefaultWeightsFromHistory(context: ModelContext) {
        let sessions = ((try? context.fetch(FetchDescriptor<WorkoutSession>())) ?? [])
            .filter { $0.endedAt != nil }
        let lastSets = WorkoutAnalytics.lastSetsByExercise(from: sessions)
        let exercises = (try? context.fetch(FetchDescriptor<StoredExercise>())) ?? []
        for exercise in exercises {
            guard let first = lastSets[exercise.name]?.first, first.weight > 0 else { continue }
            exercise.defaultWeight = Int(first.weight.rounded())
        }
    }

    private static func insertHistoricalSession(_ seed: BrandonWorkoutHistory.Session, context: ModelContext) {
        var components = DateComponents()
        components.year = seed.year
        components.month = seed.month
        components.day = seed.day
        components.hour = 10
        components.minute = 30
        guard let startedAt = Calendar.current.date(from: components) else { return }

        let duration = seed.durationMinutes * 60
        let endedAt = startedAt.addingTimeInterval(TimeInterval(duration))

        let session = WorkoutSession(
            dayName: seed.dayName,
            startedAt: startedAt,
            endedAt: endedAt,
            durationSeconds: duration
        )

        let orderedNames = WorkoutLibrary.builtIn
            .first(where: { $0.name == seed.dayName })?
            .exercises.map(\.name) ?? Array(seed.loggedExercises.keys)

        for exerciseName in orderedNames {
            guard let sets = seed.loggedExercises[exerciseName] else { continue }
            let log = ExerciseLog(
                exerciseName: exerciseName,
                muscle: BrandonWorkoutHistory.muscle(for: exerciseName)
            )
            for (index, set) in sets.enumerated() {
                let setLog = SetLog(
                    setNumber: index + 1,
                    weight: set.weight,
                    reps: set.reps,
                    isCompleted: true
                )
                setLog.exerciseLog = log
                log.sets.append(setLog)
            }
            log.session = session
            session.exerciseLogs.append(log)
        }

        context.insert(session)
    }
}

/// Historical sessions matching the EA calendar screenshots (Jul 2026).
private enum BrandonWorkoutHistory {
    struct Session {
        let dayName: String
        let year: Int
        let month: Int
        let day: Int
        let durationMinutes: Int
        /// Exercise name → ordered (weight, reps). Omit lifts with no prior log.
        let loggedExercises: [String: [(weight: Double, reps: Int)]]
    }

    static func muscle(for exerciseName: String) -> String {
        for template in WorkoutLibrary.builtIn {
            if let match = template.exercises.first(where: { $0.name == exerciseName }) {
                return match.muscle
            }
        }
        return ""
    }

    static let sessions: [Session] = [
        Session(
            dayName: "Upper B",
            year: 2026, month: 7, day: 7,
            durationMinutes: 62,
            loggedExercises: [
                "Incline Chest Press": [(70, 8), (65, 10), (65, 10), (65, 10)],
                "Seated Cable Row": [(60, 12), (55, 12), (55, 12)],
                "Reverse Fly": [(80, 15), (75, 15), (75, 15)],
                "Overhead Triceps Extension": [(40, 15), (40, 12), (32.5, 15)],
                "Hammer Curl": [(22.5, 15), (22.5, 13), (22.5, 15)],
            ]
        ),
        Session(
            dayName: "Lower A",
            year: 2026, month: 7, day: 8,
            durationMinutes: 58,
            loggedExercises: [
                "Leg Press": [(360, 8), (340, 10), (340, 10), (340, 10)],
                "Seated Leg Curl": [(72, 12), (68, 10), (68, 10)],
                "Leg Extension": [(115, 15), (115, 15), (115, 14)],
                "Standing Calf Raise": [(85, 15), (85, 15), (85, 12)],
                "Cable Crunch": [(25, 15), (25, 15), (25, 12)],
            ]
        ),
        Session(
            dayName: "Upper C",
            year: 2026, month: 7, day: 9,
            durationMinutes: 64,
            loggedExercises: [
                "Lat Pulldown": [(130, 8), (125, 10), (125, 10), (128, 10)],
                "Chest Fly": [(105, 15), (110, 15), (110, 14)],
                "Rear Delt Pulls": [(125, 15), (125, 14), (120, 13)],
                "Triceps Extension": [(32.5, 15), (32.5, 14), (32.5, 14)],
                "Incline Curl": [(27.5, 15), (25, 15), (25, 13)],
            ]
        ),
        Session(
            dayName: "Upper A",
            year: 2026, month: 7, day: 11,
            durationMinutes: 66,
            loggedExercises: [
                "Chest Press": [(95, 8), (90, 10), (90, 10), (90, 10)],
                "Triceps Pushdown": [(65, 12), (55, 12), (55, 14)],
                "Wide Grip Lat Pulldown": [(115, 12), (100, 10), (100, 10)],
                "Lateral Raise (Cable)": [(14, 15), (12.5, 15), (12.5, 5)],
                "Preacher Curl": [(110, 15), (110, 12), (110, 15)],
            ]
        ),
        Session(
            dayName: "Lower B",
            year: 2026, month: 7, day: 12,
            durationMinutes: 60,
            loggedExercises: [
                // Belt Squat intentionally omitted — no previous logged in look-ahead.
                "Hip Thrust": [(140, 12), (135, 10), (135, 10)],
                "Lying Leg Curl": [(90, 12), (85, 10), (85, 10)],
                "Leg Extension": [(120, 15), (120, 15), (120, 15)],
                "Hanging Leg Raise": [(0, 15), (0, 12), (0, 12)],
            ]
        ),
        Session(
            dayName: "Upper B",
            year: 2026, month: 7, day: 13,
            durationMinutes: 65,
            loggedExercises: [
                "Incline Chest Press": [(75, 8), (70, 10), (70, 10), (70, 10)],
                "Seated Cable Row": [(65, 12), (57.5, 12), (57.5, 12)],
                "Reverse Fly": [(85, 15), (80, 15), (80, 15)],
                "Overhead Triceps Extension": [(42.5, 15), (42.5, 12), (35, 15)],
                "Hammer Curl": [(25, 15), (25, 13), (25, 15)],
            ]
        ),
        Session(
            dayName: "Upper C",
            year: 2026, month: 7, day: 14,
            durationMinutes: 63,
            loggedExercises: [
                "Lat Pulldown": [(135, 8), (130, 10), (130, 10), (133, 10)],
                "Chest Fly": [(110, 15), (115, 15), (115, 14)],
                "Rear Delt Pulls": [(130, 15), (130, 14), (125, 13)],
                "Triceps Extension": [(32.5, 15), (32.5, 15), (32.5, 14)],
                "Incline Curl": [(27.5, 15), (25, 15), (25, 13)],
            ]
        ),
        Session(
            dayName: "Upper C",
            year: 2026, month: 7, day: 15,
            durationMinutes: 67,
            loggedExercises: [
                "Lat Pulldown": [(140, 8), (135, 10), (135, 10), (138, 10)],
                "Chest Fly": [(115, 15), (120, 15), (120, 15)],
                "Rear Delt Pulls": [(135, 15), (135, 15), (130, 13)],
                "Triceps Extension": [(35, 15), (35, 15), (35, 15)],
                "Incline Curl": [(30, 15), (27.5, 15), (27.5, 14)],
            ]
        ),
        Session(
            dayName: "Lower A",
            year: 2026, month: 7, day: 16,
            durationMinutes: 59,
            loggedExercises: [
                "Leg Press": [(370, 8), (350, 10), (350, 10), (350, 10)],
                "Seated Leg Curl": [(75, 12), (70, 10), (70, 10)],
                "Leg Extension": [(118, 15), (118, 15), (118, 15)],
                "Standing Calf Raise": [(88, 15), (88, 15), (88, 13)],
                "Cable Crunch": [(28, 15), (28, 15), (28, 12)],
            ]
        ),
    ]
}

enum WorkoutDurationEstimator {
    /// Rough gym-floor estimate: work time + prescribed rests (no rest after final set).
    static func estimatedMinutes(for day: WorkoutDay) -> Int {
        estimatedMinutes(exercises: day.exercises.sorted { $0.sortOrder < $1.sortOrder }.map {
            (sets: $0.defaultSets, hasCrown: $0.hasCrownSet)
        })
    }

    static func estimatedMinutes(exercises: [(sets: Int, hasCrown: Bool)]) -> Int {
        var seconds = 0
        let flat = exercises.filter { $0.sets > 0 }
        for (exerciseIndex, exercise) in flat.enumerated() {
            let isLastExercise = exerciseIndex == flat.count - 1
            for setNumber in 1...exercise.sets {
                seconds += 40 // working time
                let isLastSet = isLastExercise && setNumber == exercise.sets
                if !isLastSet {
                    if exercise.hasCrown && setNumber == 1 {
                        seconds += 240
                    } else if setNumber == exercise.sets {
                        seconds += 90 // short transition between exercises
                    } else {
                        seconds += 180
                    }
                }
            }
        }
        return max(1, Int((Double(seconds) / 60.0).rounded()))
    }

    static func formattedRange(for day: WorkoutDay) -> String {
        let mid = estimatedMinutes(for: day)
        let low = max(1, mid - 5)
        let high = mid + 5
        return "~\(low)–\(high) min"
    }
}

enum UserProfile {
    static func initials(from name: String) -> String {
        let parts = name.split(separator: " ")
        let letters = parts.prefix(2).compactMap { $0.first }
        return letters.map { String($0) }.joined().uppercased()
    }

    static func firstName(from name: String) -> String {
        name.split(separator: " ").first.map(String.init) ?? name
    }

    static func workGreeting(for name: String) -> String {
        "Let's work, \(firstName(from: name))."
    }

    static func greeting(for date: Date = .now) -> String {
        let hour = Calendar.current.component(.hour, from: date)
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        default: return "Good evening"
        }
    }
}
