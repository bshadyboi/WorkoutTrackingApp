import SwiftUI
import SwiftData

struct CoachView: View {
    let settings: AppSettings
    let workoutDays: [WorkoutDay]
    let sessions: [WorkoutSession]
    let health: HealthKitManager
    let earnedBadges: [EarnedBadge]
    var nutritionEntries: [NutritionEntry] = []
    var protocolItems: [ProtocolItem] = []
    var onAction: ((DailyCoachBrief.CoachAction.Kind) -> Void)?

    @Environment(\.modelContext) private var modelContext
    @Query(sort: \BodyWeightLog.loggedAt, order: .reverse) private var bodyWeights: [BodyWeightLog]
    @Query(sort: \DexaScanLog.scannedAt, order: .reverse) private var dexaScans: [DexaScanLog]

    @State private var selectedExercise = ""

    private var completedSessions: [WorkoutSession] {
        sessions.filter { $0.endedAt != nil }
    }

    private var brief: DailyCoachBrief {
        DailyCoachBriefEngine.build(
            settings: settings,
            workoutDays: workoutDays,
            sessions: sessions,
            nutritionEntries: nutritionEntries,
            bodyWeights: bodyWeights,
            protocolItems: protocolItems
        )
    }

    private var protocolInsights: ProtocolInsights.Report {
        ProtocolInsights.build(
            protocolItems: protocolItems,
            sessions: sessions,
            bodyWeights: bodyWeights
        )
    }

    private var athleteSignals: AthleteLevelEngine.Signals {
        AthleteLevelEngine.signals(from: completedSessions, adherence: protocolInsights.overallAdherence)
    }

    private var athleteLevel: AthleteLevel {
        AthleteLevelEngine.compute(signals: athleteSignals)
    }

    private var missedRecovery: MissedDayRecovery? {
        MissedDayRecoveryEngine.build(settings: settings, sessions: sessions)
    }

    private var weeklyRecap: WeeklyRecap {
        WeeklyRecapEngine.build(
            settings: settings,
            sessions: sessions,
            nutritionEntries: nutritionEntries
        )
    }

    private var weeklySummary: WeeklySummary {
        WorkoutAnalytics.weeklySummary(from: completedSessions)
    }

    private var trackedExercises: [String] {
        let top = WorkoutAnalytics.topTrackedExercises(from: completedSessions)
        if top.isEmpty {
            return ["Barbell Bench Press", "Barbell Back Squat", "Deadlift"]
        }
        return top
    }

    private var recompMetrics: RecompMetrics {
        ProgressAnalytics.computeRecomp(
            sessions: completedSessions,
            bodyWeights: bodyWeights,
            dexaScans: dexaScans,
            healthBodyFatPercent: health.bodyFatPercent
        )
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    PremiumScreenTitle(eyebrow: "Daily", title: "Coach")
                    Spacer()
                    Image(systemName: "sparkles")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundStyle(EAColor.blue)
                }

                CoachBriefCard(brief: brief) { kind in
                    onAction?(kind)
                }

                if let missedRecovery {
                    MissedDayRecoveryCard(
                        plan: missedRecovery,
                        onApply: {
                            onAction?(.recoverMissed)
                        },
                        onDismissSkip: {
                            settings.skipWorkout(on: missedRecovery.missedDate)
                            try? modelContext.save()
                        }
                    )
                }

                WeeklyRecapCard(recap: weeklyRecap)

                AthleteLevelDetailCard(level: athleteLevel, signals: athleteSignals)

                if !protocolItems.isEmpty {
                    ProtocolInsightsView(report: protocolInsights)
                }

                statsCard
                BodyMuscleMapView(sessions: completedSessions)
                BodyRecompDiagramView(metrics: recompMetrics)
                BodyWeightChartView(dataPoints: ProgressAnalytics.weightChartPoints(from: bodyWeights))
                DexaScanView(health: health)
                BadgesView(earnedBadges: earnedBadges)

                if !completedSessions.isEmpty {
                    strengthSection
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 24)
        }
        .onAppear {
            if selectedExercise.isEmpty {
                selectedExercise = trackedExercises.first ?? ""
            }
            Task { await health.refreshBodyComposition() }
        }
    }

    private var statsCard: some View {
        DashboardCard {
            HStack(spacing: 0) {
                statItem("\(weeklySummary.streak)", label: "Streak", unit: "days")
                divider
                statItem("\(completedSessions.count)", label: "Sessions", unit: "total")
                divider
                statItem("\(weeklySummary.prCount)", label: "PRs", unit: "this wk")
            }
        }
    }

    private var divider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.08))
            .frame(width: 1, height: 48)
    }

    private func statItem(_ value: String, label: String, unit: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(AppTheme.gold)
            Text(label)
                .font(.caption2.weight(.medium))
                .foregroundStyle(AppTheme.textPrimary)
            Text(unit)
                .font(.caption2)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    private var strengthSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            PremiumLabel(text: "Strength Progress")
            Picker("Exercise", selection: $selectedExercise) {
                ForEach(trackedExercises, id: \.self) { name in
                    Text(name).tag(name)
                }
            }
            .pickerStyle(.menu)
            .tint(AppTheme.gold)

            StrengthChartView(
                exerciseName: selectedExercise,
                dataPoints: WorkoutAnalytics.strengthHistory(for: selectedExercise, sessions: completedSessions)
            )
        }
    }
}
