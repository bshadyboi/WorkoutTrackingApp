import SwiftUI

struct SessionTimerView: View {
    let startedAt: Date

    var body: some View {
        TimelineView(.periodic(from: startedAt, by: 1)) { context in
            let elapsed = max(0, Int(context.date.timeIntervalSince(startedAt)))
            let minutes = elapsed / 60
            let seconds = elapsed % 60

            VStack(alignment: .leading, spacing: 8) {
                PremiumLabel(text: "Session Timer")
                Text(String(format: "%d:%02d", minutes, seconds))
                    .font(.system(size: 48, weight: .light, design: .monospaced))
                    .foregroundStyle(AppTheme.gold)
                    .monospacedDigit()
            }
            .padding(.top, 8)
        }
    }
}

struct RestTimerBar: View {
    let restTimer: RestTimerManager
    let onCancel: () -> Void

    var body: some View {
        if let endsAt = restTimer.endsAt {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let remaining = max(0, Int(endsAt.timeIntervalSince(context.date).rounded(.up)))

                VStack(spacing: 10) {
                    HStack {
                        PremiumLabel(text: "Rest Timer")
                        Spacer()
                        Button("Skip", action: onCancel)
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    Text(restTimer.formattedRemaining(at: context.date))
                        .font(.system(size: 36, weight: .light, design: .monospaced))
                        .foregroundStyle(AppTheme.gold)
                        .monospacedDigit()
                    PremiumProgressBar(value: restTimer.progress(at: context.date))
                        .frame(height: 3)
                }
                .padding(16)
                .background(AppTheme.surface)
                .overlay(Rectangle().stroke(AppTheme.gold.opacity(0.35), lineWidth: 0.5))
                .onChange(of: remaining) { _, newValue in
                    if newValue == 0 {
                        restTimer.finishIfExpired()
                    }
                }
            }
        }
    }
}

struct PRBannerView: View {
    let alert: PRAlert

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "trophy.fill")
                .foregroundStyle(AppTheme.gold)
            VStack(alignment: .leading, spacing: 2) {
                Text("New Personal Record")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(AppTheme.gold)
                Text("\(alert.exerciseName) — \(alert.weight) lbs × \(alert.reps)")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textPrimary)
            }
            Spacer()
        }
        .padding(14)
        .background(AppTheme.gold.opacity(0.12))
        .overlay(Rectangle().stroke(AppTheme.gold.opacity(0.45), lineWidth: 0.5))
    }
}

struct OverloadBannerView: View {
    let nudge: OverloadNudge

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "arrow.up.right.circle.fill")
                .foregroundStyle(EAColor.green)
            VStack(alignment: .leading, spacing: 2) {
                Text("Overload ready")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(EAColor.green)
                Text("\(nudge.exerciseName) — try \(nudge.toWeight) lb next (was \(nudge.fromWeight))")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textPrimary)
            }
            Spacer()
        }
        .padding(14)
        .background(EAColor.green.opacity(0.12))
        .overlay(Rectangle().stroke(EAColor.green.opacity(0.45), lineWidth: 0.5))
    }
}
