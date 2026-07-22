import WidgetKit
import SwiftUI

struct FitTrackWidgetEntry: TimelineEntry {
    let date: Date
    let workoutName: String
    let streak: Int
    let sessionsThisWeek: Int
    let badgeCount: Int
    let displayName: String
    let protocolDue: Int
    let protocolTotal: Int
    let liveExercise: String
    let liveSetNumber: Int
    let liveActive: Bool
    let restEndsAt: Date?
}

struct FitTrackWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> FitTrackWidgetEntry {
        FitTrackWidgetEntry(
            date: .now,
            workoutName: "Upper A",
            streak: 3,
            sessionsThisWeek: 2,
            badgeCount: 4,
            displayName: "Brandon",
            protocolDue: 2,
            protocolTotal: 8,
            liveExercise: "Chest Press",
            liveSetNumber: 2,
            liveActive: true,
            restEndsAt: .now.addingTimeInterval(90)
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (FitTrackWidgetEntry) -> Void) {
        completion(makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FitTrackWidgetEntry>) -> Void) {
        let entry = makeEntry()
        let next: Date
        if let rest = entry.restEndsAt, rest > .now {
            next = rest
        } else if entry.liveActive {
            next = Calendar.current.date(byAdding: .minute, value: 1, to: .now) ?? .now.addingTimeInterval(60)
        } else {
            next = Calendar.current.date(byAdding: .minute, value: 60, to: .now) ?? .now.addingTimeInterval(3600)
        }
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func makeEntry() -> FitTrackWidgetEntry {
        let data = WidgetSnapshotReader.load()
        return FitTrackWidgetEntry(
            date: .now,
            workoutName: data.workoutName,
            streak: data.streak,
            sessionsThisWeek: data.sessionsThisWeek,
            badgeCount: data.badgeCount,
            displayName: data.displayName,
            protocolDue: data.protocolDue,
            protocolTotal: data.protocolTotal,
            liveExercise: data.liveExercise,
            liveSetNumber: data.liveSetNumber,
            liveActive: data.liveActive,
            restEndsAt: data.restEndsAt
        )
    }
}

enum WidgetSnapshotReader {
    static let suiteName = "group.com.brandonperalta.fittrack"

    static func load() -> (
        workoutName: String,
        streak: Int,
        sessionsThisWeek: Int,
        badgeCount: Int,
        displayName: String,
        protocolDue: Int,
        protocolTotal: Int,
        liveExercise: String,
        liveSetNumber: Int,
        liveActive: Bool,
        restEndsAt: Date?
    ) {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            return ("Rest day", 0, 0, 0, "Athlete", 0, 0, "", 0, false, nil)
        }
        let restTs = defaults.double(forKey: "widget.restEndsAt")
        let restEnds: Date? = restTs > Date().timeIntervalSince1970 - 600 && restTs > 0
            ? Date(timeIntervalSince1970: restTs)
            : nil
        return (
            defaults.string(forKey: "widget.workoutName") ?? "Rest day",
            defaults.integer(forKey: "widget.streak"),
            defaults.integer(forKey: "widget.sessionsThisWeek"),
            defaults.integer(forKey: "widget.badgeCount"),
            defaults.string(forKey: "widget.displayName") ?? "Athlete",
            defaults.integer(forKey: "widget.protocolDue"),
            defaults.integer(forKey: "widget.protocolTotal"),
            defaults.string(forKey: "widget.liveExercise") ?? "",
            defaults.integer(forKey: "widget.liveSetNumber"),
            defaults.bool(forKey: "widget.liveActive"),
            restEnds.flatMap { $0 > .now ? $0 : nil }
        )
    }
}

struct FitTrackWidgetView: View {
    let entry: FitTrackWidgetEntry
    @Environment(\.widgetFamily) private var family

    private var isResting: Bool {
        if let rest = entry.restEndsAt { return rest > .now }
        return false
    }

    var body: some View {
        ZStack {
            Color.black
            VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 10) {
                HStack {
                    HStack(spacing: 0) {
                        Text("Fit")
                            .foregroundStyle(.white)
                        Text("Track")
                            .foregroundStyle(Color(red: 0.35, green: 0.65, blue: 1.0))
                    }
                    .font(.system(size: 11, weight: .bold))
                    Spacer()
                    if isResting {
                        Text("REST")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.black)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color(red: 1.0, green: 0.80, blue: 0.20))
                            .clipShape(Capsule())
                    } else if entry.liveActive {
                        Text("LIVE")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.black)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color(red: 0.19, green: 0.82, blue: 0.35))
                            .clipShape(Capsule())
                    } else {
                        Text(entry.displayName.split(separator: " ").first.map(String.init) ?? entry.displayName)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color(white: 0.5))
                    }
                }

                Text(entry.workoutName)
                    .font(.system(size: family == .systemSmall ? 16 : 18, weight: .bold))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)

                if isResting, let restEndsAt = entry.restEndsAt {
                    HStack(spacing: 6) {
                        Image(systemName: "timer")
                            .font(.system(size: 12, weight: .semibold))
                        Text(restEndsAt, style: .timer)
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .monospacedDigit()
                    }
                    .foregroundStyle(Color(red: 1.0, green: 0.80, blue: 0.20))
                } else if entry.liveActive, !entry.liveExercise.isEmpty {
                    Text("\(entry.liveExercise) · Set \(entry.liveSetNumber)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(red: 0.35, green: 0.65, blue: 1.0))
                        .lineLimit(1)
                } else if entry.protocolTotal > 0 {
                    HStack(spacing: 6) {
                        Text("🧬")
                            .font(.system(size: 11))
                        Text("Protocol \(entry.protocolDue)/\(entry.protocolTotal)")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(entry.protocolDue >= entry.protocolTotal
                                            ? Color(red: 0.19, green: 0.82, blue: 0.35)
                                            : Color(red: 1.0, green: 0.80, blue: 0.20))
                    }
                }

                if family != .systemSmall && !entry.liveActive && !isResting {
                    HStack(spacing: 14) {
                        Label("\(entry.streak)d streak", systemImage: "flame.fill")
                        Label("\(entry.sessionsThisWeek) this wk", systemImage: "calendar")
                    }
                    .font(.caption2)
                    .foregroundStyle(Color(white: 0.55))
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }
}

struct FitTrackWidget: Widget {
    let kind = "FitTrackWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FitTrackWidgetProvider()) { entry in
            FitTrackWidgetView(entry: entry)
                .containerBackground(for: .widget) { Color.black }
        }
        .configurationDisplayName("FitTrack")
        .description("Today's workout, rest timer, live set, and protocol due.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct FitTrackWidgetBundle: WidgetBundle {
    var body: some Widget {
        FitTrackWidget()
        RestTimerLiveActivity()
    }
}
