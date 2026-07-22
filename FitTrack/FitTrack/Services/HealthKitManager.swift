import Foundation
import HealthKit
import Observation

@MainActor
@Observable
final class HealthKitManager {
    private let store = HKHealthStore()

    var stepsToday = 0
    var stepGoal = 10_000
    var restingHeartRate = 0
    var activeMinutes = 0
    var activeCalories = 0
    var sleepHours = 0
    var sleepMinutes = 0
    var weeklySteps: [(day: String, steps: Int)] = []
    var moveProgress = 0.0
    var exerciseProgress = 0.0
    var standProgress = 0.0
    var bodyFatPercent = 0.0
    var leanMassLbs = 0.0
    var bodyMassLbs = 0.0
    var isAuthorized = false
    var authorizationFailed = false

    var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    private var readTypes: Set<HKObjectType> {
        var types = Set<HKObjectType>()
        if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) { types.insert(steps) }
        if let energy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) { types.insert(energy) }
        if let exercise = HKObjectType.quantityType(forIdentifier: .appleExerciseTime) { types.insert(exercise) }
        if let hr = HKObjectType.quantityType(forIdentifier: .restingHeartRate) { types.insert(hr) }
        if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { types.insert(sleep) }
        if let bodyFat = HKObjectType.quantityType(forIdentifier: .bodyFatPercentage) { types.insert(bodyFat) }
        if let leanMass = HKObjectType.quantityType(forIdentifier: .leanBodyMass) { types.insert(leanMass) }
        if let bodyMass = HKObjectType.quantityType(forIdentifier: .bodyMass) { types.insert(bodyMass) }
        return types
    }

    func requestAuthorization() async {
        guard isAvailable else {
            authorizationFailed = true
            isAuthorized = false
            return
        }
        authorizationFailed = false
        do {
            try await store.requestAuthorization(toShare: [], read: readTypes)
            isAuthorized = true
            await refresh()
        } catch {
            authorizationFailed = true
            isAuthorized = false
        }
    }

    func restoreConnectionIfNeeded(enabled: Bool) async {
        guard enabled, isAvailable else { return }
        if !isAuthorized {
            await requestAuthorization()
        } else {
            await refresh()
        }
    }

    func refresh() async {
        guard isAvailable else { return }
        stepsToday = await fetchStepsToday()
        restingHeartRate = await fetchRestingHeartRate()
        activeCalories = await fetchActiveCalories()
        activeMinutes = await fetchExerciseMinutes()
        let sleep = await fetchSleepDuration()
        sleepHours = sleep.hours
        sleepMinutes = sleep.minutes
        weeklySteps = await fetchWeeklySteps()
        moveProgress = min(Double(stepsToday) / Double(stepGoal), 1.0)
        exerciseProgress = min(Double(activeMinutes) / 30.0, 1.0)
        standProgress = min(Double(stepsToday) / 8000.0, 1.0)
    }

    func refreshBodyComposition() async {
        bodyFatPercent = await fetchLatestBodyFatPercent()
        leanMassLbs = await fetchLatestLeanMassLbs()
        bodyMassLbs = await fetchLatestBodyMassLbs()
    }

    private func fetchLatestBodyFatPercent() async -> Double {
        guard let type = HKObjectType.quantityType(forIdentifier: .bodyFatPercentage) else { return 0 }
        return await fetchLatestQuantity(type: type, unit: HKUnit.percent())
    }

    private func fetchLatestLeanMassLbs() async -> Double {
        guard let type = HKObjectType.quantityType(forIdentifier: .leanBodyMass) else { return 0 }
        return await fetchLatestQuantity(type: type, unit: .pound())
    }

    private func fetchLatestBodyMassLbs() async -> Double {
        guard let type = HKObjectType.quantityType(forIdentifier: .bodyMass) else { return 0 }
        return await fetchLatestQuantity(type: type, unit: .pound())
    }

    private func fetchLatestQuantity(type: HKQuantityType, unit: HKUnit) async -> Double {
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                let value = (samples?.first as? HKQuantitySample)?.quantity.doubleValue(for: unit) ?? 0
                continuation.resume(returning: value)
            }
            store.execute(query)
        }
    }

    private func fetchStepsToday() async -> Int {
        guard let type = HKObjectType.quantityType(forIdentifier: .stepCount) else { return 0 }
        let start = Calendar.current.startOfDay(for: .now)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: .now, options: .strictStartDate)
        return await sumQuantity(type: type, unit: .count(), predicate: predicate)
    }

    private func fetchRestingHeartRate() async -> Int {
        guard let type = HKObjectType.quantityType(forIdentifier: .restingHeartRate) else { return 0 }
        let start = Calendar.current.date(byAdding: .day, value: -7, to: .now) ?? .now
        let predicate = HKQuery.predicateForSamples(withStart: start, end: .now, options: .strictStartDate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                let value = (samples?.first as? HKQuantitySample)?
                    .quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute())) ?? 0
                continuation.resume(returning: Int(value.rounded()))
            }
            store.execute(query)
        }
    }

    private func fetchActiveCalories() async -> Int {
        guard let type = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else { return 0 }
        let start = Calendar.current.startOfDay(for: .now)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: .now, options: .strictStartDate)
        return await sumQuantity(type: type, unit: .kilocalorie(), predicate: predicate)
    }

    private func fetchExerciseMinutes() async -> Int {
        guard let type = HKObjectType.quantityType(forIdentifier: .appleExerciseTime) else { return 0 }
        let start = Calendar.current.startOfDay(for: .now)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: .now, options: .strictStartDate)
        return await sumQuantity(type: type, unit: .minute(), predicate: predicate)
    }

    private func fetchSleepDuration() async -> (hours: Int, minutes: Int) {
        guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return (0, 0) }
        let start = Calendar.current.date(byAdding: .day, value: -1, to: Calendar.current.startOfDay(for: .now)) ?? .now
        let end = Calendar.current.startOfDay(for: .now)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)

        let seconds: Int = await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
                let total = samples?.compactMap { $0 as? HKCategorySample }
                    .filter { $0.value != HKCategoryValueSleepAnalysis.awake.rawValue }
                    .reduce(0.0) { partial, sample in
                        partial + sample.endDate.timeIntervalSince(sample.startDate)
                    } ?? 0
                continuation.resume(returning: Int(total))
            }
            store.execute(query)
        }

        return (seconds / 3600, (seconds % 3600) / 60)
    }

    private func fetchWeeklySteps() async -> [(day: String, steps: Int)] {
        guard let type = HKObjectType.quantityType(forIdentifier: .stepCount) else { return [] }
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let symbols = calendar.shortWeekdaySymbols

        var results: [(day: String, steps: Int)] = []
        for offset in (0..<7).reversed() {
            guard let dayStart = calendar.date(byAdding: .day, value: -offset, to: today),
                  let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) else { continue }
            let predicate = HKQuery.predicateForSamples(withStart: dayStart, end: dayEnd, options: .strictStartDate)
            let steps = await sumQuantity(type: type, unit: .count(), predicate: predicate)
            let symbol = symbols[calendar.component(.weekday, from: dayStart) - 1]
            results.append((String(symbol.prefix(1)), steps))
        }
        return results
    }

    private func sumQuantity(type: HKQuantityType, unit: HKUnit, predicate: NSPredicate) async -> Int {
        await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
                let value = stats?.sumQuantity()?.doubleValue(for: unit) ?? 0
                continuation.resume(returning: Int(value.rounded()))
            }
            store.execute(query)
        }
    }
}
