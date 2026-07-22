import SwiftUI
import SwiftData
import UIKit

struct HealthView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.openURL) private var openURL
    @Bindable var health: HealthKitManager
    @Bindable var settings: AppSettings

    @State private var isConnecting = false

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 28) {
                PremiumScreenTitle(eyebrow: "Overview", title: "Health")

                if !health.isAvailable {
                    Text("Health data is not available on this device.")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                } else if !health.isAuthorized {
                    healthConnectCard
                }

                metricBlock(eyebrow: "Heart Rate", title: heartRateText, unit: "resting bpm") {
                    EmptyView()
                }

                metricBlock(eyebrow: "Sleep", title: sleepText, unit: "last night") {
                    stageRow("Recovery", sleepProgress)
                }

                metricBlock(eyebrow: "Activity", title: health.activeCalories > 0 ? health.activeCalories.formatted() : "—", unit: "active kcal today") {
                    PremiumProgressBar(value: health.moveProgress)
                        .frame(height: 2)
                    ActivityRingsView(metrics: [
                        ("Move", health.moveProgress),
                        ("Exercise", health.exerciseProgress),
                        ("Stand", health.standProgress),
                    ])
                    .padding(.top, 8)
                }

                metricBlock(eyebrow: "Steps", title: health.stepsToday.formatted(), unit: "of \(health.stepGoal.formatted()) goal") {
                    PremiumProgressBar(value: health.moveProgress)
                        .frame(height: 2)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 32)
        }
    }

    private var healthConnectCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Connect Apple Health to load your steps, heart rate, sleep, and activity.")
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)

            PremiumButton(title: isConnecting ? "Connecting…" : "Connect Apple Health", icon: "heart.fill") {
                Task { await connectHealth() }
            }
            .disabled(isConnecting)

            if health.authorizationFailed {
                Text("Connection failed. Open Settings → Health → FitTrack and turn on the data types you want to share.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    openURL(url)
                }
            }
            .font(.caption)
            .foregroundStyle(AppTheme.gold)
        }
        .padding(.vertical, 4)
    }

    private func connectHealth() async {
        isConnecting = true
        await health.requestAuthorization()
        settings.hasConnectedHealth = health.isAuthorized
        try? modelContext.save()
        isConnecting = false
    }

    private var heartRateText: String {
        health.restingHeartRate > 0 ? "\(health.restingHeartRate)" : "—"
    }

    private var sleepText: String {
        if health.sleepHours == 0 && health.sleepMinutes == 0 { return "—" }
        return "\(health.sleepHours)h \(health.sleepMinutes)m"
    }

    private var sleepProgress: Double {
        let totalMinutes = Double(health.sleepHours * 60 + health.sleepMinutes)
        return min(totalMinutes / 480.0, 1.0)
    }

    private func metricBlock<Content: View>(eyebrow: String, title: String, unit: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            PremiumLabel(text: eyebrow)
            Text(title)
                .font(AppTheme.displayLight(34))
                .foregroundStyle(AppTheme.textPrimary)
            Text(unit)
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
            content()
            GoldDivider()
                .padding(.top, 8)
        }
    }

    private func stageRow(_ label: String, _ pct: Double) -> some View {
        HStack(spacing: 12) {
            Text(label)
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
                .frame(width: 72, alignment: .leading)
            PremiumProgressBar(value: pct)
                .frame(height: 2)
            Text("\(Int(pct * 100))%")
                .font(.caption.monospacedDigit())
                .foregroundStyle(AppTheme.gold)
                .frame(width: 32, alignment: .trailing)
        }
    }
}
