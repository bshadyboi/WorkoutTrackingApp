import Foundation
import SwiftData

enum FitTrackExport {
    struct Payload: Codable {
        var exportedAt: String
        var displayName: String
        var sessions: [SessionDTO]
        var bodyWeights: [WeightDTO]
        var protocolItems: [ProtocolDTO]
        var nutrition: [NutritionDTO]
        var water: [WaterDTO]
    }

    struct SessionDTO: Codable {
        var dayName: String
        var startedAt: String
        var endedAt: String?
        var durationSeconds: Int
        var exercises: [ExerciseDTO]
    }

    struct ExerciseDTO: Codable {
        var name: String
        var muscle: String
        var sets: [SetDTO]
    }

    struct SetDTO: Codable {
        var setNumber: Int
        var weight: Double
        var reps: Int
        var rir: Int?
    }

    struct WeightDTO: Codable {
        var weightLbs: Double
        var loggedAt: String
    }

    struct ProtocolDTO: Codable {
        var name: String
        var dosage: String
        var scheduleLabel: String
        var frequencyLabel: String
        var takenDates: [String]
    }

    struct NutritionDTO: Codable {
        var mealName: String
        var calories: Int
        var proteinG: Int
        var carbsG: Int
        var fatG: Int
        var loggedAt: String
    }

    struct WaterDTO: Codable {
        var dateKey: String
        var ounces: Int
        var goalOz: Int
    }

    struct ImportResult {
        var sessionsAdded: Int
        var weightsAdded: Int
        var nutritionAdded: Int
        var waterUpdated: Int
        var protocolUpdated: Int
    }

    private static let iso: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let isoBasic: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    private static func parseDate(_ string: String) -> Date? {
        iso.date(from: string) ?? isoBasic.date(from: string)
    }

    static func build(
        displayName: String,
        sessions: [WorkoutSession],
        weights: [BodyWeightLog],
        protocolItems: [ProtocolItem],
        nutrition: [NutritionEntry],
        water: [DailyWaterLog]
    ) -> Data? {
        let payload = Payload(
            exportedAt: iso.string(from: .now),
            displayName: displayName,
            sessions: sessions.filter { $0.endedAt != nil }.map { session in
                SessionDTO(
                    dayName: session.dayName,
                    startedAt: isoBasic.string(from: session.startedAt),
                    endedAt: session.endedAt.map { isoBasic.string(from: $0) },
                    durationSeconds: session.durationSeconds,
                    exercises: session.exerciseLogs.map { log in
                        ExerciseDTO(
                            name: log.exerciseName,
                            muscle: log.muscle,
                            sets: log.sets.sorted { $0.setNumber < $1.setNumber }.map {
                                SetDTO(setNumber: $0.setNumber, weight: $0.weight, reps: $0.reps, rir: $0.rir)
                            }
                        )
                    }
                )
            },
            bodyWeights: weights.map {
                WeightDTO(weightLbs: $0.weightLbs, loggedAt: isoBasic.string(from: $0.loggedAt))
            },
            protocolItems: protocolItems.map {
                ProtocolDTO(
                    name: $0.name,
                    dosage: $0.dosage,
                    scheduleLabel: $0.scheduleLabel,
                    frequencyLabel: $0.frequencyLabel,
                    takenDates: Array($0.takenDateKeys).sorted()
                )
            },
            nutrition: nutrition.map {
                NutritionDTO(
                    mealName: $0.mealName,
                    calories: $0.calories,
                    proteinG: $0.proteinG,
                    carbsG: $0.carbsG,
                    fatG: $0.fatG,
                    loggedAt: isoBasic.string(from: $0.loggedAt)
                )
            },
            water: water.map {
                WaterDTO(dateKey: $0.dateKey, ounces: $0.ounces, goalOz: $0.goalOz)
            }
        )

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try? encoder.encode(payload)
    }

    static func writeTempFile(data: Data) -> URL? {
        let name = "FitTrack-export-\(DailyTracker.dateKey()).json"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        do {
            try data.write(to: url, options: .atomic)
            return url
        } catch {
            return nil
        }
    }

    static func decode(_ data: Data) throws -> Payload {
        try JSONDecoder().decode(Payload.self, from: data)
    }

    /// Merges backup into the store. Skips duplicate sessions (same dayName + startedAt day) and duplicate weigh-ins (same calendar day).
    @MainActor
    static func importPayload(_ payload: Payload, into context: ModelContext, settings: AppSettings?) throws -> ImportResult {
        var result = ImportResult(sessionsAdded: 0, weightsAdded: 0, nutritionAdded: 0, waterUpdated: 0, protocolUpdated: 0)
        let cal = Calendar.current

        if let settings, !payload.displayName.isEmpty {
            settings.displayName = payload.displayName
        }

        let existingSessions = (try? context.fetch(FetchDescriptor<WorkoutSession>())) ?? []
        let existingSessionKeys: Set<String> = Set(existingSessions.compactMap { session in
            guard let ended = session.endedAt else { return nil }
            return "\(session.dayName)|\(DailyTracker.dateKey(for: ended))"
        })

        for dto in payload.sessions {
            guard let started = parseDate(dto.startedAt) else { continue }
            let ended = dto.endedAt.flatMap(parseDate) ?? started
            let key = "\(dto.dayName)|\(DailyTracker.dateKey(for: ended))"
            if existingSessionKeys.contains(key) { continue }

            let session = WorkoutSession(
                dayName: dto.dayName,
                startedAt: started,
                endedAt: ended,
                durationSeconds: dto.durationSeconds
            )
            for exercise in dto.exercises {
                let log = ExerciseLog(exerciseName: exercise.name, muscle: exercise.muscle)
                for set in exercise.sets {
                    let setLog = SetLog(
                        setNumber: set.setNumber,
                        weight: set.weight,
                        reps: set.reps,
                        rir: set.rir,
                        isCompleted: true
                    )
                    setLog.exerciseLog = log
                    log.sets.append(setLog)
                }
                if !log.sets.isEmpty {
                    log.session = session
                    session.exerciseLogs.append(log)
                }
            }
            context.insert(session)
            result.sessionsAdded += 1
        }

        let existingWeights = (try? context.fetch(FetchDescriptor<BodyWeightLog>())) ?? []
        let weightDays = Set(existingWeights.map { DailyTracker.dateKey(for: $0.loggedAt) })
        for dto in payload.bodyWeights {
            guard let loggedAt = parseDate(dto.loggedAt) else { continue }
            let key = DailyTracker.dateKey(for: loggedAt)
            if weightDays.contains(key) { continue }
            context.insert(BodyWeightLog(weightLbs: dto.weightLbs, loggedAt: loggedAt))
            result.weightsAdded += 1
        }

        let existingNutrition = (try? context.fetch(FetchDescriptor<NutritionEntry>())) ?? []
        let nutritionKeys = Set(existingNutrition.map {
            "\($0.mealName)|\(DailyTracker.dateKey(for: $0.loggedAt))|\($0.calories)"
        })
        for dto in payload.nutrition {
            guard let loggedAt = parseDate(dto.loggedAt) else { continue }
            let key = "\(dto.mealName)|\(DailyTracker.dateKey(for: loggedAt))|\(dto.calories)"
            if nutritionKeys.contains(key) { continue }
            context.insert(NutritionEntry(
                loggedAt: loggedAt,
                mealName: dto.mealName,
                calories: dto.calories,
                proteinG: dto.proteinG,
                carbsG: dto.carbsG,
                fatG: dto.fatG
            ))
            result.nutritionAdded += 1
        }

        let existingWater = (try? context.fetch(FetchDescriptor<DailyWaterLog>())) ?? []
        var waterByKey = Dictionary(uniqueKeysWithValues: existingWater.map { ($0.dateKey, $0) })
        for dto in payload.water {
            if let existing = waterByKey[dto.dateKey] {
                existing.ounces = max(existing.ounces, dto.ounces)
                existing.goalOz = dto.goalOz
            } else {
                let log = DailyWaterLog(dateKey: dto.dateKey, ounces: dto.ounces, goalOz: dto.goalOz)
                context.insert(log)
                waterByKey[dto.dateKey] = log
            }
            result.waterUpdated += 1
        }

        let existingProtocol = (try? context.fetch(FetchDescriptor<ProtocolItem>())) ?? []
        var protocolByName = Dictionary(uniqueKeysWithValues: existingProtocol.map { ($0.name.lowercased(), $0) })
        for (index, dto) in payload.protocolItems.enumerated() {
            if let existing = protocolByName[dto.name.lowercased()] {
                existing.dosage = dto.dosage
                existing.scheduleLabel = dto.scheduleLabel
                existing.frequencyLabel = dto.frequencyLabel
                var keys = existing.takenDateKeys
                keys.formUnion(dto.takenDates)
                existing.takenDateKeys = keys
            } else {
                let item = ProtocolItem(
                    name: dto.name,
                    dosage: dto.dosage,
                    scheduleLabel: dto.scheduleLabel,
                    frequencyLabel: dto.frequencyLabel,
                    sortOrder: existingProtocol.count + index,
                    takenDatesCSV: dto.takenDates.sorted().joined(separator: "|")
                )
                context.insert(item)
                protocolByName[dto.name.lowercased()] = item
            }
            result.protocolUpdated += 1
        }

        try context.save()
        return result
    }
}
