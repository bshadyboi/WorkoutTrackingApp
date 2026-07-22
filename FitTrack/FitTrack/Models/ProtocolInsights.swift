import Foundation

/// On-device, observational correlation between protocol adherence and training/body trends.
/// This is association framing for a single user — NOT statistics, medical, or dosing advice.
enum ProtocolInsights {
    /// Minimum logged days in the window before we show any comparison claim.
    static let minDaysForClaim = 8
    static let minWindowDays = 21

    struct AdherenceStat: Identifiable {
        let id: String
        let name: String
        let calendarInitials: String
        /// 0...1 adherence over the window (due days taken / due days).
        let adherence: Double
        let dueDays: Int
        let takenDays: Int

        var percent: Int { Int((adherence * 100).rounded()) }
    }

    struct Report {
        let windowDays: Int
        let loggedDays: Int
        let overallAdherence: Double
        let perItem: [AdherenceStat]
        let comparison: Comparison?
        let hasEnoughData: Bool

        var overallPercent: Int { Int((overallAdherence * 100).rounded()) }
    }

    /// High- vs low-adherence split comparison of outcome metrics.
    struct Comparison {
        let highAdherencePercent: Int
        let lowAdherencePercent: Int
        let strengthDeltaHigh: Double?   // % strength change during high-adherence stretch
        let strengthDeltaLow: Double?
        let energyHigh: Double?          // avg session energy 0-5
        let energyLow: Double?
        let sorenessHigh: Double?        // avg session soreness 0-5
        let sorenessLow: Double?
        let weightRateHigh: Double?      // lb/wk during high stretch
        let weightRateLow: Double?
    }

    // MARK: - Build

    static func build(
        protocolItems: [ProtocolItem],
        sessions: [WorkoutSession],
        bodyWeights: [BodyWeightLog],
        windowDays: Int = 30,
        now: Date = .now
    ) -> Report {
        let cal = Calendar.current
        let today = cal.startOfDay(for: now)
        let start = cal.date(byAdding: .day, value: -(windowDays - 1), to: today) ?? today

        // Per-day adherence across the window.
        var dayAdherence: [Date: Double] = [:]
        var loggedDays = 0
        var dueTotal = 0
        var takenTotal = 0
        var perItemDue: [String: Int] = [:]
        var perItemTaken: [String: Int] = [:]

        for offset in 0..<windowDays {
            guard let day = cal.date(byAdding: .day, value: offset, to: start) else { continue }
            let weekday = cal.component(.weekday, from: day)
            let key = DailyTracker.dateKey(for: day)
            let due = protocolItems.filter { $0.isDue(on: weekday) }
            guard !due.isEmpty else { continue }

            let taken = due.filter { $0.isTaken(on: key) }
            if !taken.isEmpty { loggedDays += 1 }

            dueTotal += due.count
            takenTotal += taken.count
            dayAdherence[day] = Double(taken.count) / Double(due.count)

            for item in due {
                perItemDue[item.name, default: 0] += 1
                if item.isTaken(on: key) {
                    perItemTaken[item.name, default: 0] += 1
                }
            }
        }

        let overall = dueTotal > 0 ? Double(takenTotal) / Double(dueTotal) : 0

        let perItem: [AdherenceStat] = protocolItems.compactMap { item in
            let due = perItemDue[item.name] ?? 0
            guard due > 0 else { return nil }
            let taken = perItemTaken[item.name] ?? 0
            return AdherenceStat(
                id: item.id.uuidString,
                name: item.name,
                calendarInitials: item.calendarInitials,
                adherence: Double(taken) / Double(due),
                dueDays: due,
                takenDays: taken
            )
        }
        .sorted { $0.adherence > $1.adherence }

        let hasEnough = loggedDays >= minDaysForClaim && windowDays >= minWindowDays
        let comparison = hasEnough
            ? buildComparison(dayAdherence: dayAdherence, sessions: sessions, bodyWeights: bodyWeights, now: now)
            : nil

        return Report(
            windowDays: windowDays,
            loggedDays: loggedDays,
            overallAdherence: overall,
            perItem: perItem,
            comparison: comparison,
            hasEnoughData: hasEnough
        )
    }

    // MARK: - Comparison

    private static func buildComparison(
        dayAdherence: [Date: Double],
        sessions: [WorkoutSession],
        bodyWeights: [BodyWeightLog],
        now: Date
    ) -> Comparison? {
        let cal = Calendar.current
        // Split logged days into high (>=0.9) and low (<0.7) adherence buckets.
        let high = dayAdherence.filter { $0.value >= 0.9 }.map(\.key)
        let low = dayAdherence.filter { $0.value < 0.7 }.map(\.key)

        guard high.count >= 3, low.count >= 2 else { return nil }

        let highSet = Set(high.map { cal.startOfDay(for: $0) })
        let lowSet = Set(low.map { cal.startOfDay(for: $0) })

        let completed = sessions.filter { $0.endedAt != nil }

        func sessionsIn(_ set: Set<Date>) -> [WorkoutSession] {
            completed.filter { set.contains(cal.startOfDay(for: $0.startedAt)) }
        }

        let highSessions = sessionsIn(highSet)
        let lowSessions = sessionsIn(lowSet)

        return Comparison(
            highAdherencePercent: 90,
            lowAdherencePercent: 70,
            strengthDeltaHigh: strengthDelta(for: highSessions),
            strengthDeltaLow: strengthDelta(for: lowSessions),
            energyHigh: avg(highSessions.map { Double($0.energyLevel) }.filter { $0 > 0 }),
            energyLow: avg(lowSessions.map { Double($0.energyLevel) }.filter { $0 > 0 }),
            sorenessHigh: avg(highSessions.map { Double($0.sorenessLevel) }.filter { $0 > 0 }),
            sorenessLow: avg(lowSessions.map { Double($0.sorenessLevel) }.filter { $0 > 0 }),
            weightRateHigh: weightRate(in: highSet, weights: bodyWeights),
            weightRateLow: weightRate(in: lowSet, weights: bodyWeights)
        )
    }

    /// Approximate strength change across a set of sessions: compares avg top-set weight
    /// of the first third vs last third of sessions (per shared exercise).
    private static func strengthDelta(for sessions: [WorkoutSession]) -> Double? {
        let ordered = sessions.sorted { $0.startedAt < $1.startedAt }
        guard ordered.count >= 4 else { return nil }

        func topWeights(_ subset: [WorkoutSession]) -> [String: Double] {
            var best: [String: Double] = [:]
            for session in subset {
                for log in session.exerciseLogs {
                    let top = log.sets.filter(\.isCompleted).map(\.weight).max() ?? 0
                    if top > best[log.exerciseName, default: 0] {
                        best[log.exerciseName] = top
                    }
                }
            }
            return best
        }

        let third = max(ordered.count / 3, 1)
        let early = topWeights(Array(ordered.prefix(third)))
        let late = topWeights(Array(ordered.suffix(third)))

        let shared = Set(early.keys).intersection(late.keys)
        guard !shared.isEmpty else { return nil }

        var ratios: [Double] = []
        for name in shared {
            guard let e = early[name], e > 0, let l = late[name] else { continue }
            ratios.append((l - e) / e)
        }
        guard !ratios.isEmpty else { return nil }
        return ratios.reduce(0, +) / Double(ratios.count) * 100
    }

    private static func weightRate(in daySet: Set<Date>, weights: [BodyWeightLog]) -> Double? {
        let cal = Calendar.current
        let points = weights
            .filter { daySet.contains(cal.startOfDay(for: $0.loggedAt)) }
            .sorted { $0.loggedAt < $1.loggedAt }
        guard let first = points.first, let last = points.last, points.count >= 3 else { return nil }
        let days = max(last.loggedAt.timeIntervalSince(first.loggedAt) / 86_400, 1)
        guard days >= 5 else { return nil }
        return (last.weightLbs - first.weightLbs) / days * 7
    }

    private static func avg(_ values: [Double]) -> Double? {
        guard !values.isEmpty else { return nil }
        return values.reduce(0, +) / Double(values.count)
    }

    // MARK: - Headline for Coach brief

    static func briefLine(from report: Report) -> String? {
        guard report.overallAdherence > 0 else { return nil }
        let pct = report.overallPercent

        if let comp = report.comparison,
           let sHigh = comp.strengthDeltaHigh,
           let sLow = comp.strengthDeltaLow,
           sHigh - sLow >= 1.5 {
            return "Stack \(pct)% compliant — strength trended up in your high-adherence weeks."
        }

        if pct >= 90 {
            return "Protocol \(pct)% compliant this month. Keep it tight."
        }
        if pct >= 70 {
            return "Protocol \(pct)% compliant — a few misses. Tighten the stack."
        }
        return "Protocol only \(pct)% compliant this month. Consistency first."
    }
}
