import Foundation
import SwiftData

struct FavoriteMeal: Identifiable, Hashable {
    var id: String { name.lowercased() }
    var name: String
    var calories: Int
    var proteinG: Int
    var carbsG: Int
    var fatG: Int
    var serving: String

    var encoded: String {
        [name, "\(calories)", "\(proteinG)", "\(carbsG)", "\(fatG)", serving]
            .joined(separator: "|")
    }

    static func parse(_ raw: String) -> FavoriteMeal? {
        let parts = raw.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
        guard parts.count >= 6,
              let cal = Int(parts[1]),
              let p = Int(parts[2]),
              let c = Int(parts[3]),
              let f = Int(parts[4]) else { return nil }
        return FavoriteMeal(
            name: parts[0],
            calories: cal,
            proteinG: p,
            carbsG: c,
            fatG: f,
            serving: parts[5]
        )
    }

    init(name: String, calories: Int, proteinG: Int, carbsG: Int, fatG: Int, serving: String = "1 serving") {
        self.name = name
        self.calories = calories
        self.proteinG = proteinG
        self.carbsG = carbsG
        self.fatG = fatG
        self.serving = serving
    }

    init(from entry: NutritionEntry) {
        self.name = entry.mealName
        self.calories = entry.calories
        self.proteinG = entry.proteinG
        self.carbsG = entry.carbsG
        self.fatG = entry.fatG
        self.serving = entry.servingDescription.isEmpty ? "1 serving" : entry.servingDescription
    }
}

@Model
final class AppSettings {
    var id: UUID
    var hasCompletedOnboarding: Bool
    var displayName: String
    var programName: String
    var programSubtitle: String
    var selectedWorkoutDayID: UUID?
    var hasConnectedHealth: Bool = false
    var restTimerSeconds: Int = 90
    var autoStartRestTimer: Bool = true
    var workoutRemindersEnabled: Bool = false
    var workoutReminderHour: Int = 17
    var workoutReminderMinute: Int = 30
    var streakRemindersEnabled: Bool = true
    var weeklySummaryEnabled: Bool = true
    var waterGoalOz: Int = 128
    var calorieGoal: Int = 2400
    var proteinGoalG: Int = 180
    var carbsGoalG: Int = 220
    var fatGoalG: Int = 70
    var protocolRemindersEnabled: Bool = true
    var protocolReminderHour: Int = 8
    var protocolReminderMinute: Int = 0
    var weighInRemindersEnabled: Bool = true
    var weighInReminderHour: Int = 7
    var weighInReminderMinute: Int = 0
    var macroLeftoverRemindersEnabled: Bool = true
    var macroLeftoverReminderHour: Int = 19
    var macroLeftoverReminderMinute: Int = 0
    /// Favorite meals: name|cal|p|c|f|serving|||...
    var favoriteMealsCSV: String = ""
    /// Highest athlete level already celebrated (to fire level-up once).
    var lastCelebratedAthleteLevel: Int = 0
    /// One-time Brandon EA workout history from Jul 2026 calendar.
    var hasSeededWorkoutHistory: Bool = false
    /// Bump to re-import screenshot previous weights onto existing installs.
    var seededWorkoutHistoryVersion: Int = 0
    /// Date keys (yyyy-MM-dd) the user intentionally skipped.
    var skippedWorkoutDatesCSV: String = ""
    /// Overrides: "yyyy-MM-dd:Upper A|yyyy-MM-dd:Lower B"
    var scheduleOverrideCSV: String = ""

    init(
        id: UUID = UUID(),
        hasCompletedOnboarding: Bool = false,
        displayName: String = "Brandon Peralta",
        programName: String = "Hypertrophy Block A",
        programSubtitle: String = "Week 3 of 8 · Day 1 of 4",
        selectedWorkoutDayID: UUID? = nil,
        hasConnectedHealth: Bool = false,
        restTimerSeconds: Int = 90,
        autoStartRestTimer: Bool = true,
        workoutRemindersEnabled: Bool = true,
        workoutReminderHour: Int = 17,
        workoutReminderMinute: Int = 30,
        streakRemindersEnabled: Bool = true,
        weeklySummaryEnabled: Bool = true,
        waterGoalOz: Int = 128,
        calorieGoal: Int = 2400,
        proteinGoalG: Int = 180,
        carbsGoalG: Int = 220,
        fatGoalG: Int = 70,
        protocolRemindersEnabled: Bool = true,
        protocolReminderHour: Int = 8,
        protocolReminderMinute: Int = 0,
        weighInRemindersEnabled: Bool = true,
        weighInReminderHour: Int = 7,
        weighInReminderMinute: Int = 0,
        macroLeftoverRemindersEnabled: Bool = true,
        macroLeftoverReminderHour: Int = 19,
        macroLeftoverReminderMinute: Int = 0,
        favoriteMealsCSV: String = "",
        skippedWorkoutDatesCSV: String = "",
        scheduleOverrideCSV: String = ""
    ) {
        self.id = id
        self.hasCompletedOnboarding = hasCompletedOnboarding
        self.displayName = displayName
        self.programName = programName
        self.programSubtitle = programSubtitle
        self.selectedWorkoutDayID = selectedWorkoutDayID
        self.hasConnectedHealth = hasConnectedHealth
        self.restTimerSeconds = restTimerSeconds
        self.autoStartRestTimer = autoStartRestTimer
        self.workoutRemindersEnabled = workoutRemindersEnabled
        self.workoutReminderHour = workoutReminderHour
        self.workoutReminderMinute = workoutReminderMinute
        self.streakRemindersEnabled = streakRemindersEnabled
        self.weeklySummaryEnabled = weeklySummaryEnabled
        self.waterGoalOz = waterGoalOz
        self.calorieGoal = calorieGoal
        self.proteinGoalG = proteinGoalG
        self.carbsGoalG = carbsGoalG
        self.fatGoalG = fatGoalG
        self.protocolRemindersEnabled = protocolRemindersEnabled
        self.protocolReminderHour = protocolReminderHour
        self.protocolReminderMinute = protocolReminderMinute
        self.weighInRemindersEnabled = weighInRemindersEnabled
        self.weighInReminderHour = weighInReminderHour
        self.weighInReminderMinute = weighInReminderMinute
        self.macroLeftoverRemindersEnabled = macroLeftoverRemindersEnabled
        self.macroLeftoverReminderHour = macroLeftoverReminderHour
        self.macroLeftoverReminderMinute = macroLeftoverReminderMinute
        self.favoriteMealsCSV = favoriteMealsCSV
        self.skippedWorkoutDatesCSV = skippedWorkoutDatesCSV
        self.scheduleOverrideCSV = scheduleOverrideCSV
    }

    var skippedWorkoutDates: Set<String> {
        get {
            Set(skippedWorkoutDatesCSV.split(separator: "|").map(String.init).filter { !$0.isEmpty })
        }
        set {
            skippedWorkoutDatesCSV = newValue.sorted().joined(separator: "|")
        }
    }

    var scheduleOverrides: [String: String] {
        get {
            var map: [String: String] = [:]
            for part in scheduleOverrideCSV.split(separator: "|") {
                let bits = part.split(separator: ":", maxSplits: 1).map(String.init)
                guard bits.count == 2 else { continue }
                map[bits[0]] = bits[1]
            }
            return map
        }
        set {
            scheduleOverrideCSV = newValue.keys.sorted().compactMap { key in
                guard let value = newValue[key] else { return nil }
                return "\(key):\(value)"
            }.joined(separator: "|")
        }
    }

    var favoriteMeals: [FavoriteMeal] {
        get {
            favoriteMealsCSV.split(separator: "|||").compactMap { FavoriteMeal.parse(String($0)) }
        }
        set {
            favoriteMealsCSV = newValue.map(\.encoded).joined(separator: "|||")
        }
    }

    func addFavoriteMeal(_ meal: FavoriteMeal) {
        var list = favoriteMeals
        list.removeAll { $0.name.caseInsensitiveCompare(meal.name) == .orderedSame }
        list.insert(meal, at: 0)
        if list.count > 20 { list = Array(list.prefix(20)) }
        favoriteMeals = list
    }

    func removeFavoriteMeal(named name: String) {
        favoriteMeals = favoriteMeals.filter { $0.name.caseInsensitiveCompare(name) != .orderedSame }
    }

    func isFavoriteMeal(named name: String) -> Bool {
        favoriteMeals.contains { $0.name.caseInsensitiveCompare(name) == .orderedSame }
    }

    func isWorkoutSkipped(on date: Date) -> Bool {
        skippedWorkoutDates.contains(DailyTracker.dateKey(for: date))
    }

    func skipWorkout(on date: Date) {
        var keys = skippedWorkoutDates
        keys.insert(DailyTracker.dateKey(for: date))
        skippedWorkoutDates = keys
        var overrides = scheduleOverrides
        overrides.removeValue(forKey: DailyTracker.dateKey(for: date))
        scheduleOverrides = overrides
    }

    func rescheduleWorkout(_ name: String, from missed: Date, to target: Date) {
        skipWorkout(on: missed)
        var overrides = scheduleOverrides
        overrides[DailyTracker.dateKey(for: target)] = name
        scheduleOverrides = overrides
    }

    func overrideWorkoutName(on date: Date) -> String? {
        scheduleOverrides[DailyTracker.dateKey(for: date)]
    }
}

@Model
final class WorkoutDay {
    var id: UUID
    var name: String
    var subtitle: String
    var sortOrder: Int
    var scheduledWeekdaysCSV: String = ""
    @Relationship(deleteRule: .cascade, inverse: \StoredExercise.day)
    var exercises: [StoredExercise]

    init(
        id: UUID = UUID(),
        name: String,
        subtitle: String,
        sortOrder: Int = 0,
        scheduledWeekdaysCSV: String = "",
        exercises: [StoredExercise] = []
    ) {
        self.id = id
        self.name = name
        self.subtitle = subtitle
        self.sortOrder = sortOrder
        self.scheduledWeekdaysCSV = scheduledWeekdaysCSV
        self.exercises = exercises
    }

    var totalSets: Int { exercises.reduce(0) { $0 + $1.defaultSets } }

    var scheduledWeekdays: Set<Int> {
        get {
            Set(scheduledWeekdaysCSV.split(separator: ",").compactMap { Int($0.trimmingCharacters(in: .whitespaces)) })
        }
        set {
            scheduledWeekdaysCSV = newValue.sorted().map(String.init).joined(separator: ",")
        }
    }

    func isScheduled(on date: Date = .now) -> Bool {
        let weekday = Calendar.current.component(.weekday, from: date)
        return scheduledWeekdays.contains(weekday)
    }
}

@Model
final class StoredExercise {
    var id: UUID
    var name: String
    var muscle: String
    var defaultSets: Int
    var defaultReps: Int
    var defaultWeight: Int
    var unit: String
    var instructions: String
    var tipsCSV: String
    var videoURL: String = ""
    var sortOrder: Int
    /// First set is a heavier crown / top set (6–8) with longer rest.
    var hasCrownSet: Bool = false
    /// e.g. "6–8"
    var crownRepRange: String = ""
    /// e.g. "8–10" or "12–15"
    var workingRepRange: String = ""
    var day: WorkoutDay?

    init(
        id: UUID = UUID(),
        name: String,
        muscle: String,
        defaultSets: Int,
        defaultReps: Int,
        defaultWeight: Int,
        unit: String = "lbs",
        instructions: String = "",
        tips: [String] = [],
        sortOrder: Int = 0,
        videoURL: String = "",
        hasCrownSet: Bool = false,
        crownRepRange: String = "",
        workingRepRange: String = ""
    ) {
        self.id = id
        self.name = name
        self.muscle = muscle
        self.defaultSets = defaultSets
        self.defaultReps = defaultReps
        self.defaultWeight = defaultWeight
        self.unit = unit
        self.instructions = instructions
        self.tipsCSV = tips.joined(separator: "|")
        self.videoURL = videoURL
        self.sortOrder = sortOrder
        self.hasCrownSet = hasCrownSet
        self.crownRepRange = crownRepRange
        self.workingRepRange = workingRepRange
    }

    var tips: [String] {
        tipsCSV.split(separator: "|").map(String.init).filter { !$0.isEmpty }
    }

    /// Working-set count (excludes crown when present).
    var workingSetCount: Int {
        hasCrownSet ? max(defaultSets - 1, 0) : defaultSets
    }

    var displayWorkingRepRange: String {
        if !workingRepRange.isEmpty { return workingRepRange }
        return "\(defaultReps)"
    }

    var displayCrownRepRange: String {
        if !crownRepRange.isEmpty { return crownRepRange }
        return "6–8"
    }

    /// Compact prescription line for calendar look-ahead and previews.
    var prescriptionSummary: String {
        if hasCrownSet {
            return "\(defaultSets) × \(displayCrownRepRange) / \(displayWorkingRepRange) · rest 4m"
        }
        return "\(defaultSets) × \(displayWorkingRepRange) · rest 3m"
    }

    func targetReps(forSetNumber setNumber: Int) -> Int {
        if hasCrownSet && setNumber == 1 {
            return Self.midpoint(of: displayCrownRepRange) ?? defaultReps
        }
        return Self.midpoint(of: displayWorkingRepRange) ?? defaultReps
    }

    static func midpoint(of range: String) -> Int? {
        let parts = range
            .replacingOccurrences(of: "–", with: "-")
            .split(separator: "-")
            .compactMap { Int($0.trimmingCharacters(in: .whitespaces)) }
        guard let first = parts.first else { return nil }
        if parts.count == 1 { return first }
        return (first + parts[1]) / 2
    }
}

@Model
final class WorkoutSession {
    var id: UUID
    var dayName: String
    var startedAt: Date
    var endedAt: Date?
    var durationSeconds: Int
    var energyLevel: Int = 0
    var sorenessLevel: Int = 0
    var sessionNotes: String = ""
    var prsHitCSV: String = ""
    @Relationship(deleteRule: .cascade, inverse: \ExerciseLog.session)
    var exerciseLogs: [ExerciseLog]

    init(
        id: UUID = UUID(),
        dayName: String,
        startedAt: Date,
        endedAt: Date? = nil,
        durationSeconds: Int = 0,
        energyLevel: Int = 0,
        sorenessLevel: Int = 0,
        sessionNotes: String = "",
        prsHitCSV: String = "",
        exerciseLogs: [ExerciseLog] = []
    ) {
        self.id = id
        self.dayName = dayName
        self.startedAt = startedAt
        self.endedAt = endedAt
        self.durationSeconds = durationSeconds
        self.energyLevel = energyLevel
        self.sorenessLevel = sorenessLevel
        self.sessionNotes = sessionNotes
        self.prsHitCSV = prsHitCSV
        self.exerciseLogs = exerciseLogs
    }

    var prsHit: [String] {
        prsHitCSV.split(separator: "|").map(String.init).filter { !$0.isEmpty }
    }

    func setPRsHit(_ names: [String]) {
        prsHitCSV = names.joined(separator: "|")
    }

    var completedSetsCount: Int {
        exerciseLogs.flatMap(\.sets).filter(\.isCompleted).count
    }

    var estimatedCalories: Int {
        max(completedSetsCount * 8, durationSeconds / 10)
    }
}

@Model
final class ExerciseLog {
    var id: UUID
    var exerciseName: String
    var muscle: String
    var session: WorkoutSession?
    @Relationship(deleteRule: .cascade, inverse: \SetLog.exerciseLog)
    var sets: [SetLog]

    init(
        id: UUID = UUID(),
        exerciseName: String,
        muscle: String,
        sets: [SetLog] = []
    ) {
        self.id = id
        self.exerciseName = exerciseName
        self.muscle = muscle
        self.sets = sets
    }
}

enum WeightFormat {
    static func display(_ weight: Double) -> String {
        let scaled = (weight * 10).rounded()
        if scaled.truncatingRemainder(dividingBy: 10) == 0 {
            return String(Int(scaled / 10))
        }
        return String(format: "%.1f", weight)
    }

    static func setLabel(weight: Double, reps: Int) -> String {
        "\(display(weight))×\(reps)"
    }
}

@Model
final class SetLog {
    var id: UUID
    var setNumber: Int
    var weight: Double
    var reps: Int
    var rir: Int?
    var isCompleted: Bool
    var exerciseLog: ExerciseLog?

    init(
        id: UUID = UUID(),
        setNumber: Int,
        weight: Double,
        reps: Int,
        rir: Int? = nil,
        isCompleted: Bool = false
    ) {
        self.id = id
        self.setNumber = setNumber
        self.weight = weight
        self.reps = reps
        self.rir = rir
        self.isCompleted = isCompleted
    }
}

@Model
final class BodyWeightLog {
    var id: UUID
    var weightLbs: Double
    var loggedAt: Date

    init(id: UUID = UUID(), weightLbs: Double, loggedAt: Date = .now) {
        self.id = id
        self.weightLbs = weightLbs
        self.loggedAt = loggedAt
    }
}

@Model
final class EarnedBadge {
    var id: String
    var earnedAt: Date

    init(id: String, earnedAt: Date = .now) {
        self.id = id
        self.earnedAt = earnedAt
    }
}

@Model
final class CustomExercise {
    var id: UUID
    var name: String
    var muscle: String
    var equipment: String
    var instructions: String
    var videoURL: String
    var defaultSets: Int
    var defaultReps: Int
    var defaultWeight: Int
    var createdAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        muscle: String,
        equipment: String = "Custom",
        instructions: String = "",
        videoURL: String = "",
        defaultSets: Int = 3,
        defaultReps: Int = 10,
        defaultWeight: Int = 0,
        createdAt: Date = .now
    ) {
        self.id = id
        self.name = name
        self.muscle = muscle
        self.equipment = equipment
        self.instructions = instructions
        self.videoURL = videoURL
        self.defaultSets = defaultSets
        self.defaultReps = defaultReps
        self.defaultWeight = defaultWeight
        self.createdAt = createdAt
    }

    func toCatalogEntry() -> ExerciseCatalogEntry {
        ExerciseCatalogEntry(
            name: name,
            muscle: muscle,
            equipment: equipment,
            defaultSets: defaultSets,
            defaultReps: defaultReps,
            defaultWeight: defaultWeight,
            instructions: instructions,
            videoURL: videoURL
        )
    }
}

@Model
final class DailyWaterLog {
    var id: UUID
    var dateKey: String
    var ounces: Int
    var goalOz: Int

    init(id: UUID = UUID(), dateKey: String, ounces: Int = 0, goalOz: Int = 128) {
        self.id = id
        self.dateKey = dateKey
        self.ounces = ounces
        self.goalOz = goalOz
    }

    var progress: Double {
        guard goalOz > 0 else { return 0 }
        return Double(ounces) / Double(goalOz)
    }
}

@Model
final class NutritionEntry {
    var id: UUID
    var loggedAt: Date
    var mealName: String
    var calories: Int
    var proteinG: Int
    var carbsG: Int
    var fatG: Int
    var notes: String
    var barcode: String = ""
    var servingDescription: String = ""

    init(
        id: UUID = UUID(),
        loggedAt: Date = .now,
        mealName: String,
        calories: Int = 0,
        proteinG: Int = 0,
        carbsG: Int = 0,
        fatG: Int = 0,
        notes: String = "",
        barcode: String = "",
        servingDescription: String = ""
    ) {
        self.id = id
        self.loggedAt = loggedAt
        self.mealName = mealName
        self.calories = calories
        self.proteinG = proteinG
        self.carbsG = carbsG
        self.fatG = fatG
        self.notes = notes
        self.barcode = barcode
        self.servingDescription = servingDescription
    }
}

@Model
final class ProtocolItem {
    var id: UUID
    var name: String
    var dosage: String
    var scheduleLabel: String
    /// Display frequency: "Daily", "Sun", "Mon Thu", etc.
    var frequencyLabel: String = "Daily"
    var sortOrder: Int
    var takenDatesCSV: String

    init(
        id: UUID = UUID(),
        name: String,
        dosage: String,
        scheduleLabel: String = "Morning",
        frequencyLabel: String = "Daily",
        sortOrder: Int = 0,
        takenDatesCSV: String = ""
    ) {
        self.id = id
        self.name = name
        self.dosage = dosage
        self.scheduleLabel = scheduleLabel
        self.frequencyLabel = frequencyLabel
        self.sortOrder = sortOrder
        self.takenDatesCSV = takenDatesCSV
    }

    var takenDateKeys: Set<String> {
        get {
            Set(takenDatesCSV.split(separator: "|").map(String.init).filter { !$0.isEmpty })
        }
        set {
            takenDatesCSV = newValue.sorted().joined(separator: "|")
        }
    }

    func isTaken(on dateKey: String) -> Bool {
        takenDateKeys.contains(dateKey)
    }

    func setTaken(_ taken: Bool, on dateKey: String) {
        var keys = takenDateKeys
        if taken { keys.insert(dateKey) } else { keys.remove(dateKey) }
        takenDateKeys = keys
    }

    /// Short calendar label (e.g. C+I, MC, R).
    var calendarInitials: String {
        let n = name.lowercased()
        if n.contains("cjc") || (n.contains("ipa") && n.contains("+")) { return "C+I" }
        if n.contains("tesa") { return "T+I" }
        if n.contains("mots") { return "MC" }
        if n.contains("retatrutide") || n.hasPrefix("reta") { return "R" }
        if n.contains("glutathione") { return "G" }
        if n.contains("bergamot") { return "CB" }
        if n.contains("omega") { return "O3" }
        if n.contains("psyllium") { return "PH" }
        if n.contains("multi") { return "MV" }
        if n.contains("magnesium") { return "Mg" }
        if n.contains("tudca") { return "Tu" }
        let parts = name.split(whereSeparator: { !$0.isLetter && !$0.isNumber })
            .map(String.init)
            .filter { !$0.isEmpty }
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    /// Calendar weekday numbers (1=Sun … 7=Sat). Empty / Daily = every day.
    var dueWeekdays: Set<Int> {
        let f = frequencyLabel.lowercased()
            .replacingOccurrences(of: "–", with: "-")
            .replacingOccurrences(of: "—", with: "-")
        if f.isEmpty || f.contains("daily") || f.contains("every") { return [] }
        // Mon–Fri / M-F
        if f.contains("m-f") || f.contains("mon-fri") || f.contains("weekday") {
            return [2, 3, 4, 5, 6]
        }
        let map: [(String, Int)] = [
            ("sun", 1), ("mon", 2), ("tue", 3), ("wed", 4),
            ("thu", 5), ("fri", 6), ("sat", 7),
        ]
        var days = Set<Int>()
        for (token, day) in map where f.contains(token) {
            days.insert(day)
        }
        return days
    }

    func isDue(on weekday: Int) -> Bool {
        let days = dueWeekdays
        return days.isEmpty || days.contains(weekday)
    }
}

@Model
final class CoachingCheckIn {
    var id: UUID
    var loggedAt: Date
    var energyLevel: Int
    var sorenessLevel: Int
    var notes: String

    init(
        id: UUID = UUID(),
        loggedAt: Date = .now,
        energyLevel: Int = 3,
        sorenessLevel: Int = 2,
        notes: String = ""
    ) {
        self.id = id
        self.loggedAt = loggedAt
        self.energyLevel = energyLevel
        self.sorenessLevel = sorenessLevel
        self.notes = notes
    }
}

@Model
final class DexaScanLog {
    var id: UUID
    var scannedAt: Date
    var totalWeightLbs: Double
    var bodyFatPercent: Double
    var leanMassLbs: Double
    var fatMassLbs: Double
    var boneMassLbs: Double
    var visceralFatScore: Double
    var source: String
    var notes: String

    init(
        id: UUID = UUID(),
        scannedAt: Date = .now,
        totalWeightLbs: Double = 0,
        bodyFatPercent: Double = 0,
        leanMassLbs: Double = 0,
        fatMassLbs: Double = 0,
        boneMassLbs: Double = 0,
        visceralFatScore: Double = 0,
        source: String = "manual",
        notes: String = ""
    ) {
        self.id = id
        self.scannedAt = scannedAt
        self.totalWeightLbs = totalWeightLbs
        self.bodyFatPercent = bodyFatPercent
        self.leanMassLbs = leanMassLbs
        self.fatMassLbs = fatMassLbs
        self.boneMassLbs = boneMassLbs
        self.visceralFatScore = visceralFatScore
        self.source = source
        self.notes = notes
    }
}

@Model
final class ProgressPhotoLog {
    var id: UUID
    var capturedAt: Date
    var viewSide: String
    @Attribute(.externalStorage) var imageData: Data
    var muscleScoresJSON: String
    var notes: String

    init(
        id: UUID = UUID(),
        capturedAt: Date = .now,
        viewSide: String = ProgressPhotoSide.front.rawValue,
        imageData: Data = Data(),
        muscleScoresJSON: String = "{}",
        notes: String = ""
    ) {
        self.id = id
        self.capturedAt = capturedAt
        self.viewSide = viewSide
        self.imageData = imageData
        self.muscleScoresJSON = muscleScoresJSON
        self.notes = notes
    }

    var side: ProgressPhotoSide {
        ProgressPhotoSide(rawValue: viewSide) ?? .front
    }

    var muscleScores: [MuscleGroup: Int] {
        guard let data = muscleScoresJSON.data(using: .utf8),
              let raw = try? JSONDecoder().decode([String: Int].self, from: data) else {
            return [:]
        }
        var scores: [MuscleGroup: Int] = [:]
        for (key, value) in raw {
            if let group = MuscleGroup(rawValue: key) {
                scores[group] = value
            }
        }
        return scores
    }

    static func encodeScores(_ scores: [MuscleGroup: Int]) -> String {
        let raw = Dictionary(uniqueKeysWithValues: scores.map { ($0.key.rawValue, $0.value) })
        guard let data = try? JSONEncoder().encode(raw),
              let json = String(data: data, encoding: .utf8) else {
            return "{}"
        }
        return json
    }
}

enum ProgressPhotoSide: String, CaseIterable, Identifiable {
    case front
    case back

    var id: String { rawValue }

    var label: String {
        switch self {
        case .front: return "Front"
        case .back: return "Back"
        }
    }
}
