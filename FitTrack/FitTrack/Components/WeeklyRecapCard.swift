import SwiftUI

struct WeeklyRecapCard: View {
    let recap: WeeklyRecap
    var compact: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 10 : 14) {
            HStack(spacing: 8) {
                Image(systemName: "calendar.badge.checkmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(EAColor.green)
                Text(recap.isWeekendSpotlight ? "Weekly recap" : "This week")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                Text(recap.weekLabel)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color(white: 0.45))
            }

            HStack(spacing: 10) {
                metric(recap.sessionsLine, label: "Training")
                metric("\(recap.prCount)", label: "PRs")
                metric(recap.tonnage.formatted(), label: "lb volume")
            }

            if let protein = recap.proteinLine {
                Label(protein, systemImage: "fork.knife")
                    .font(.system(size: 13))
                    .foregroundStyle(Color(white: 0.7))
            }

            if let name = recap.bestLiftName {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(EAColor.yellow)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Best lift")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color(white: 0.45))
                        Text(name)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                        if let detail = recap.bestLiftDetail {
                            Text(detail)
                                .font(.system(size: 13))
                                .foregroundStyle(Color(white: 0.65))
                        }
                    }
                }
            } else if recap.sessionsDone == 0 {
                Text("No sessions logged yet this week — still time.")
                    .font(.system(size: 13))
                    .foregroundStyle(Color(white: 0.55))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(EAColor.green.opacity(0.22), lineWidth: 1)
        )
    }

    private func metric(_ value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color(white: 0.45))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 10)
        .background(Color(white: 0.12))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

struct MissedDayRecoveryCard: View {
    let plan: MissedDayRecovery
    var onApply: () -> Void
    var onDismissSkip: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "arrow.uturn.backward.circle.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(EAColor.yellow)
                Text("Missed-day recovery")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                if plan.missCount > 1 {
                    Text("\(plan.missCount) open")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color(white: 0.5))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(white: 0.14))
                        .clipShape(Capsule())
                }
            }

            Text(plan.summaryLine)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)

            Text(plan.detailLine)
                .font(.system(size: 13))
                .foregroundStyle(Color(white: 0.68))
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 8) {
                Button(action: onApply) {
                    Text(plan.primaryActionTitle)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.black)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(EAColor.yellow)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)

                if plan.recommendation != .skipAndMoveOn, let onDismissSkip {
                    Button(action: onDismissSkip) {
                        Text("Skip it")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color(white: 0.7))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color(white: 0.14))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(EAColor.yellow.opacity(0.28), lineWidth: 1)
        )
    }
}
