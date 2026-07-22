import SwiftUI
import SwiftData

struct OnboardingView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var health: HealthKitManager

    @Query private var settingsList: [AppSettings]
    @State private var page = 0
    @State private var displayName = "Brandon Peralta"
    @State private var isConnectingHealth = false

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()

            VStack(spacing: 0) {
                TabView(selection: $page) {
                    welcomePage.tag(0)
                    profilePage.tag(1)
                    healthPage.tag(2)
                }
                .tabViewStyle(.page(indexDisplayMode: .always))
            }
        }
        .preferredColorScheme(.dark)
    }

    private var welcomePage: some View {
        VStack(spacing: 24) {
            Spacer()
            PremiumLabel(text: "FitTrack")
            Text("Performance,\nrefined.")
                .font(AppTheme.serifLight(36))
                .multilineTextAlignment(.center)
                .foregroundStyle(AppTheme.textPrimary)
            Text("Track workouts, health, and progress in one premium experience built for you.")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(AppTheme.textSecondary)
                .padding(.horizontal, 32)
            Spacer()
            PremiumButton(title: "Continue") { page = 1 }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
        }
    }

    private var profilePage: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()
            PremiumScreenTitle(eyebrow: "Profile", title: "Your name")
            TextField("Full name", text: $displayName)
                .padding(16)
                .background(AppTheme.surface)
                .foregroundStyle(AppTheme.textPrimary)
                .overlay(Rectangle().stroke(AppTheme.gold.opacity(0.25), lineWidth: 0.5))
            Spacer()
            PremiumButton(title: "Continue") { page = 2 }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 40)
    }

    private var healthPage: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()
            PremiumScreenTitle(eyebrow: "Health", title: "Apple Health")
            Text("Connect steps, heart rate, sleep, and activity so your dashboard stays live and accurate.")
                .font(.body)
                .foregroundStyle(AppTheme.textSecondary)
            if !health.isAvailable {
                Text("Health data is not available on this device.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            if health.authorizationFailed {
                Text("Could not connect. You can try again from the Health tab after setup.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            Spacer()
            PremiumButton(title: isConnectingHealth ? "Connecting…" : "Connect Health") {
                Task { await connectHealthAndFinish() }
            }
            .disabled(isConnectingHealth || !health.isAvailable)
            Button("Skip for now") { finishOnboarding(connectedHealth: false) }
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
                .frame(maxWidth: .infinity)
                .disabled(isConnectingHealth)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 40)
    }

    private func connectHealthAndFinish() async {
        isConnectingHealth = true
        await health.requestAuthorization()
        isConnectingHealth = false
        finishOnboarding(connectedHealth: health.isAuthorized)
    }

    private func finishOnboarding(connectedHealth: Bool) {
        let settings = settingsList.first ?? AppSettings()
        if settingsList.isEmpty {
            contextInsert(settings)
        }
        settings.hasCompletedOnboarding = true
        settings.hasConnectedHealth = connectedHealth
        settings.displayName = displayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? "Brandon Peralta"
            : displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        try? modelContext.save()
    }

    private func contextInsert(_ settings: AppSettings) {
        modelContext.insert(settings)
    }
}
