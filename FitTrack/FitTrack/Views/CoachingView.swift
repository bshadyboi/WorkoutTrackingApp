import SwiftUI
import SwiftData

struct CoachingView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \CoachingCheckIn.loggedAt, order: .reverse) private var checkIns: [CoachingCheckIn]
    @Query(sort: \WorkoutSession.startedAt, order: .reverse) private var sessions: [WorkoutSession]

    @State private var showCheckIn = false
    @State private var energy = 3
    @State private var soreness = 2
    @State private var notes = ""

    private var completedSessions: [WorkoutSession] {
        sessions.filter { $0.endedAt != nil }
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 20) {
                PremiumScreenTitle(eyebrow: "CoachBot", title: "Coaching")

                DashboardCard {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("🤝")
                                .font(.system(size: 28))
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Check in + CoachBot")
                                    .font(.system(size: 17, weight: .semibold))
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text("Log energy, soreness, and how you're feeling.")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                        PremiumButton(title: "Check In", icon: "square.and.pencil") {
                            showCheckIn = true
                        }
                    }
                }

                if !checkIns.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        PremiumLabel(text: "Recent Check-Ins")
                        ForEach(checkIns.prefix(5)) { checkIn in
                            checkInRow(checkIn)
                        }
                    }
                }

                if !completedSessions.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        PremiumLabel(text: "Post-Workout Notes")
                        ForEach(completedSessions.prefix(5)) { session in
                            if session.energyLevel > 0 || session.sorenessLevel > 0 || !session.sessionNotes.isEmpty {
                                sessionCheckInRow(session)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 24)
        }
        .sheet(isPresented: $showCheckIn) {
            checkInSheet
        }
    }

    private func checkInRow(_ checkIn: CoachingCheckIn) -> some View {
        DashboardCard {
            VStack(alignment: .leading, spacing: 6) {
                Text(checkIn.loggedAt.formatted(.dateTime.weekday(.wide).hour().minute()))
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                Text("Energy: \(WorkoutAnalytics.energyLabel(checkIn.energyLevel)) · Soreness: \(WorkoutAnalytics.sorenessLabel(checkIn.sorenessLevel))")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(AppTheme.textPrimary)
                if !checkIn.notes.isEmpty {
                    Text(checkIn.notes)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
    }

    private func sessionCheckInRow(_ session: WorkoutSession) -> some View {
        DashboardCard {
            VStack(alignment: .leading, spacing: 6) {
                Text("\(session.dayName) · \(session.startedAt.formatted(.dateTime.month(.abbreviated).day()))")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(AppTheme.textPrimary)
                if session.energyLevel > 0 {
                    Text("Energy: \(WorkoutAnalytics.energyLabel(session.energyLevel))")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                if !session.sessionNotes.isEmpty {
                    Text(session.sessionNotes)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
    }

    private var checkInSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        PremiumLabel(text: "Energy")
                        Stepper(WorkoutAnalytics.energyLabel(energy), value: $energy, in: 1...5)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        PremiumLabel(text: "Soreness")
                        Stepper(WorkoutAnalytics.sorenessLabel(soreness), value: $soreness, in: 1...5)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        PremiumLabel(text: "Notes")
                        TextField("How are you feeling?", text: $notes, axis: .vertical)
                            .lineLimit(3...6)
                            .padding(14)
                            .background(AppTheme.inputBackground)
                            .foregroundStyle(AppTheme.textPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    PremiumButton(title: "Save Check-In", icon: "checkmark") {
                        saveCheckIn()
                    }
                }
                .padding(24)
            }
            .background(AppTheme.background)
            .navigationTitle("Check In")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { showCheckIn = false }
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func saveCheckIn() {
        let checkIn = CoachingCheckIn(
            energyLevel: energy,
            sorenessLevel: soreness,
            notes: notes.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        modelContext.insert(checkIn)
        try? modelContext.save()
        notes = ""
        energy = 3
        soreness = 2
        showCheckIn = false
    }
}
