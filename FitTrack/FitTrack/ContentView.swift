import SwiftUI
import SwiftData

enum Tab: String, CaseIterable {
    case home = "Home"
    case train = "Train"
    case nutrition = "Nutrition"
    case protocolTab = "Protocol"

    var icon: String {
        switch self {
        case .home: return "house.fill"
        case .train: return "figure.strengthtraining.traditional"
        case .nutrition: return "fork.knife"
        case .protocolTab: return "dna"
        }
    }

    var emoji: String {
        switch self {
        case .home: return "🏠"
        case .train: return "🏋️"
        case .nutrition: return "🥩"
        case .protocolTab: return "🧬"
        }
    }
}

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var settingsList: [AppSettings]
    @Query(sort: \WorkoutDay.sortOrder) private var workoutDays: [WorkoutDay]
    @Query(sort: \WorkoutSession.startedAt, order: .reverse) private var sessions: [WorkoutSession]
    @Query private var earnedBadges: [EarnedBadge]
    @Query(sort: \ProtocolItem.sortOrder) private var protocolItems: [ProtocolItem]

    @State private var sessionManager = WorkoutSessionManager()
    @State private var healthManager = HealthKitManager()
    @State private var selectedTab: Tab = .home
    @State private var showWorkoutLibrary = false
    @State private var showSchedule = false
    @State private var showBadgeUnlock = false
    @State private var unlockedBadges: [BadgeDefinition] = []
    @State private var exportShareURL: URL?
    @State private var showExportSheet = false
    @State private var showImportPicker = false
    @State private var importMessage = ""
    @State private var showImportAlert = false
    @Query(sort: \BodyWeightLog.loggedAt, order: .reverse) private var bodyWeights: [BodyWeightLog]
    @Query(sort: \NutritionEntry.loggedAt, order: .reverse) private var nutritionEntries: [NutritionEntry]
    @Query private var waterLogs: [DailyWaterLog]

    private var settings: AppSettings? { settingsList.first }
    private var selectedDay: WorkoutDay? {
        if let id = settings?.selectedWorkoutDayID {
            return workoutDays.first { $0.id == id } ?? workoutDays.first
        }
        return workoutDays.first
    }
    private var displayName: String { settings?.displayName ?? "Brandon Peralta" }

    var body: some View {
        Group {
            if settings?.hasCompletedOnboarding == true {
                mainApp
            } else {
                OnboardingView(health: healthManager)
            }
        }
        .onAppear {
            DataSeeder.seedIfNeeded(context: modelContext)
            // Ensure screenshot history lands even on existing installs.
            DataSeeder.seedWorkoutHistoryIfNeeded(context: modelContext)
            sessionManager.recoverIfNeeded()
            refreshNotificationsIfNeeded()
            refreshWidgetSnapshot()
        }
        .onChange(of: sessions.count) { _, _ in refreshWidgetSnapshot() }
        .onChange(of: earnedBadges.count) { _, _ in refreshWidgetSnapshot() }
        .onChange(of: settings?.selectedWorkoutDayID) { _, _ in refreshWidgetSnapshot() }
        .task(id: settings?.hasCompletedOnboarding) {
            guard settings?.hasCompletedOnboarding == true else { return }
            await healthManager.restoreConnectionIfNeeded(enabled: settings?.hasConnectedHealth == true)
            await healthManager.refresh()
        }
    }

    private var mainApp: some View {
        VStack(spacing: 0) {
            appHeader
            tabContent
            tabBar
        }
        .background(AppTheme.background)
        .preferredColorScheme(.dark)
        .fullScreenCover(isPresented: $sessionManager.isActive) {
            ActiveWorkoutView(manager: sessionManager)
        }
        .fullScreenCover(isPresented: $sessionManager.showCelebration) {
            WorkoutCompleteMomentView(
                dayName: sessionManager.celebrationDayName.isEmpty ? sessionManager.dayName : sessionManager.celebrationDayName,
                completedSets: sessionManager.celebrationCompletedSets,
                totalSets: sessionManager.celebrationTotalSets,
                durationSeconds: sessionManager.celebrationDurationSeconds,
                prCount: sessionManager.celebrationPRCount,
                onContinue: { sessionManager.continueAfterCelebration() }
            )
        }
        .sheet(isPresented: $sessionManager.showCheckIn) {
            PostWorkoutCheckInView(manager: sessionManager)
        }
        .sheet(isPresented: $sessionManager.showSummary) {
            if let summary = sessionManager.summary {
                WorkoutSummaryView(summary: summary, displayName: displayName) {
                    sessionManager.showSummary = false
                    sessionManager.summary = nil
                    selectedTab = .home
                    Task { await healthManager.refresh() }
                    refreshNotificationsIfNeeded()
                    refreshWidgetSnapshot()
                }
                .onAppear {
                    let newBadges = BadgeService.awardNewBadges(context: modelContext, sessions: sessions)
                    if !newBadges.isEmpty {
                        unlockedBadges = newBadges
                        // Slight delay so summary lands first, then badge pop
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                            showBadgeUnlock = true
                        }
                    }
                    refreshWidgetSnapshot()
                }
            }
        }
        .fullScreenCover(isPresented: $showBadgeUnlock) {
            BadgeUnlockedSheet(badges: unlockedBadges) {
                showBadgeUnlock = false
            }
        }
        .overlay(alignment: .top) {
            CelebrationToastOverlay()
                .padding(.top, 4)
        }
        .overlay {
            ConfettiOverlay()
        }
        .sheet(isPresented: $showWorkoutLibrary) {
            if let settings = settingsList.first {
                WorkoutLibraryView(settings: settings)
            }
        }
        .sheet(isPresented: $showSchedule) {
            if let settings = settingsList.first {
                ScheduleSettingsView(settings: settings, sessions: sessions)
            }
        }
        .sheet(isPresented: $showExportSheet) {
            if let url = exportShareURL {
                ShareSheet(items: [url])
            }
        }
        .fileImporter(
            isPresented: $showImportPicker,
            allowedContentTypes: [.json],
            allowsMultipleSelection: false
        ) { result in
            handleImport(result)
        }
        .alert("Import", isPresented: $showImportAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(importMessage)
        }
    }

    private var appHeader: some View {
        AppBrandHeader(
            displayName: displayName,
            onExport: exportBackup,
            onImport: { showImportPicker = true },
            onSignOut: signOut
        )
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 12)
    }

    @ViewBuilder
    private var tabContent: some View {
        if let day = selectedDay, let settings = settingsList.first {
            switch selectedTab {
            case .home:
                HomeView(
                    settings: settings,
                    displayName: displayName,
                    health: healthManager,
                    sessions: sessions,
                    earnedBadges: earnedBadges,
                    workoutDays: workoutDays,
                    selectedTab: $selectedTab,
                    onStartWorkout: startWorkout
                )
            case .train:
                WorkoutsView(
                    day: day,
                    workoutDays: workoutDays,
                    settings: settings,
                    sessionManager: sessionManager,
                    sessions: sessions,
                    onSwapWorkout: { showWorkoutLibrary = true },
                    onStartWorkout: startWorkout,
                    onSelectDay: { selected in
                        settings.selectedWorkoutDayID = selected.id
                        try? modelContext.save()
                    }
                )
            case .nutrition:
                NutritionView(settings: settings, health: healthManager)
            case .protocolTab:
                ProtocolView(settings: settings, onRemindersChanged: refreshNotificationsIfNeeded)
            }
        } else {
            Text("Loading program…")
                .foregroundStyle(AppTheme.textSecondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(Tab.allCases, id: \.self) { tab in
                Button { selectedTab = tab } label: {
                    VStack(spacing: 3) {
                        Text(tab.emoji)
                            .font(.system(size: 18))
                            .opacity(selectedTab == tab ? 1 : 0.55)
                        Text(tab.rawValue)
                            .font(.system(size: 10, weight: selectedTab == tab ? .semibold : .regular))
                            .foregroundStyle(selectedTab == tab ? AppTheme.gold : AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 6)
        .padding(.top, 6)
        .padding(.bottom, 4)
        .background(AppTheme.card)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Color.white.opacity(0.06))
                .frame(height: 0.5)
        }
    }

    private func startWorkout() {
        guard let settings = settingsList.first, let day = selectedDay else { return }
        sessionManager.startWorkout(from: day, pastSessions: sessions, settings: settings)
    }

    private func signOut() {
        guard let settings = settingsList.first else { return }
        settings.hasCompletedOnboarding = false
        try? modelContext.save()
    }

    private func refreshNotificationsIfNeeded() {
        guard let settings = settingsList.first else { return }
        let todayEntries = nutritionEntries.filter { Calendar.current.isDateInToday($0.loggedAt) }
        let protein = todayEntries.reduce(0) { $0 + $1.proteinG }
        let calories = todayEntries.reduce(0) { $0 + $1.calories }
        Task {
            await NotificationManager.shared.ensureAuthorizedAndRefresh(
                settings: settings,
                workoutDays: workoutDays,
                sessions: sessions,
                protocolItems: protocolItems,
                todayProteinG: protein,
                todayCalories: calories
            )
        }
    }

    private func exportBackup() {
        guard let data = FitTrackExport.build(
            displayName: displayName,
            sessions: sessions,
            weights: bodyWeights,
            protocolItems: protocolItems,
            nutrition: nutritionEntries,
            water: waterLogs
        ), let url = FitTrackExport.writeTempFile(data: data) else { return }
        exportShareURL = url
        showExportSheet = true
    }

    private func handleImport(_ result: Result<[URL], Error>) {
        switch result {
        case .failure(let error):
            importMessage = error.localizedDescription
            showImportAlert = true
        case .success(let urls):
            guard let url = urls.first else { return }
            let access = url.startAccessingSecurityScopedResource()
            defer { if access { url.stopAccessingSecurityScopedResource() } }
            do {
                let data = try Data(contentsOf: url)
                let payload = try FitTrackExport.decode(data)
                let imported = try FitTrackExport.importPayload(
                    payload,
                    into: modelContext,
                    settings: settingsList.first
                )
                importMessage = "Added \(imported.sessionsAdded) sessions, \(imported.weightsAdded) weigh-ins, \(imported.nutritionAdded) meals. Protocol + water merged."
                showImportAlert = true
                refreshWidgetSnapshot()
            } catch {
                importMessage = "Could not import: \(error.localizedDescription)"
                showImportAlert = true
            }
        }
    }

    private func refreshWidgetSnapshot() {
        let completed = sessions.filter { $0.endedAt != nil }
        let weekly = WorkoutAnalytics.weeklySummary(from: completed)
        let settings = settingsList.first
        let todayName = WorkoutRotation.scheduledName(on: .now, settings: settings) ?? "Rest day"
        let weekday = Calendar.current.component(.weekday, from: .now)
        let due = protocolItems.filter { $0.isDue(on: weekday) }
        let takenKey = DailyTracker.dateKey()
        let taken = due.filter { $0.isTaken(on: takenKey) }.count

        WidgetSnapshotStore.update(
            workoutName: todayName,
            streak: weekly.streak,
            sessionsThisWeek: weekly.sessionCount,
            badgeCount: earnedBadges.count,
            displayName: displayName,
            protocolDue: taken,
            protocolTotal: due.count
        )
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [
            AppSettings.self, WorkoutDay.self, StoredExercise.self,
            WorkoutSession.self, ExerciseLog.self, SetLog.self, BodyWeightLog.self,
            EarnedBadge.self, CustomExercise.self, DailyWaterLog.self,
            NutritionEntry.self, ProtocolItem.self, CoachingCheckIn.self,
            DexaScanLog.self, ProgressPhotoLog.self,
        ], inMemory: true)
}
