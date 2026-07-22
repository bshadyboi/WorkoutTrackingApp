import SwiftUI

struct CoachBriefCard: View {
    let brief: DailyCoachBrief
    var onAction: (DailyCoachBrief.CoachAction.Kind) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(EAColor.blue)
                Text("Coach brief")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                Text("On-device")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color(white: 0.5))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(white: 0.14))
                    .clipShape(Capsule())
            }

            Text(brief.headline)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: 10) {
                briefRow(icon: "figure.strengthtraining.traditional", text: brief.workoutLine)
                if let loadLine = brief.loadLine {
                    briefRow(icon: "scalemass", text: loadLine)
                }
                if let recoveryLine = brief.recoveryLine {
                    briefRow(icon: "arrow.uturn.backward", text: recoveryLine)
                }
                briefRow(icon: "fork.knife", text: brief.nutritionLine)
                briefRow(icon: "pills", text: brief.protocolLine)
                briefRow(icon: "chart.line.uptrend.xyaxis", text: brief.weighInLine)
                if let insightLine = brief.insightLine {
                    briefRow(icon: "sparkles", text: insightLine)
                }
            }

            if !brief.actions.isEmpty {
                HStack(spacing: 8) {
                    ForEach(brief.actions.prefix(3)) { action in
                        Button {
                            onAction(action.kind)
                        } label: {
                            Text(action.title)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(action.kind == .train || action.kind == .recoverMissed ? .black : .white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 9)
                                .background(
                                    action.kind == .train ? EAColor.green
                                    : action.kind == .recoverMissed ? EAColor.yellow
                                    : Color(white: 0.16)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(EAColor.blue.opacity(0.25), lineWidth: 1)
        )
    }

    private func briefRow(icon: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(EAColor.blue)
                .frame(width: 16)
                .padding(.top, 2)
            Text(text)
                .font(.system(size: 13))
                .foregroundStyle(Color(white: 0.72))
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

struct CoachBriefHomeBanner: View {
    let headline: String
    var onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            HStack(spacing: 12) {
                Image(systemName: "sparkles")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(EAColor.blue)
                VStack(alignment: .leading, spacing: 3) {
                    Text("Coach")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(EAColor.blue)
                    Text(headline)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Color(white: 0.45))
            }
            .padding(14)
            .background(EAColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(EAColor.blue.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
