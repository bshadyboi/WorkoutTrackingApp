import SwiftUI
import SwiftData

@main
struct FitTrackApp: App {
    init() {
        PhoneWatchSync.shared.activate()
    }

    /// Local SwiftData store. iCloud/CloudKit needs a paid Apple Developer Program team —
    /// personal teams can't provision the iCloud capability.
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            AppSettings.self,
            WorkoutDay.self,
            StoredExercise.self,
            WorkoutSession.self,
            ExerciseLog.self,
            SetLog.self,
            BodyWeightLog.self,
            EarnedBadge.self,
            CustomExercise.self,
            DailyWaterLog.self,
            NutritionEntry.self,
            ProtocolItem.self,
            CoachingCheckIn.self,
            DexaScanLog.self,
            ProgressPhotoLog.self,
        ])

        let localConfig = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false
        )
        return try! ModelContainer(for: schema, configurations: [localConfig])
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}
