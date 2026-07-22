import SwiftUI

private enum AthleteLevelStyle {
    static let accent = Color(red: 0.72, green: 0.55, blue: 1.0)
    static let accentBright = Color(red: 0.82, green: 0.68, blue: 1.0)

    static func tint(for title: String) -> Color {
        switch title {
        case "Rookie": return Color(red: 0.55, green: 0.75, blue: 0.95)
        case "Consistent": return Color(red: 0.35, green: 0.82, blue: 0.65)
        case "Grinder": return Color(red: 0.95, green: 0.75, blue: 0.30)
        case "Savage": return Color(red: 1.0, green: 0.55, blue: 0.35)
        case "Elite": return Color(red: 0.72, green: 0.55, blue: 1.0)
        default: return Color(red: 1.0, green: 0.82, blue: 0.35) // Legend
        }
    }
}

/// Compact Athlete Level card for the Home screen (near the greeting).
struct AthleteLevelCard: View {
    let level: AthleteLevel
    var onOpen: (() -> Void)? = nil

    private var tint: Color { AthleteLevelStyle.tint(for: level.title) }

    var body: some View {
        Button {
            onOpen?()
        } label: {
            HStack(spacing: 14) {
                levelBadge

                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        Text(level.title.uppercased())
                            .font(.system(size: 11, weight: .bold))
                            .tracking(1.1)
                            .foregroundStyle(tint)
                        Spacer(minLength: 0)
                        Text("\(level.xpToGo) XP to go")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(Color(white: 0.5))
                    }

                    progressBar

                    Text("Level \(level.level) · \(level.nextTitle == level.title ? "keep climbing" : "next: \(level.nextTitle)")")
                        .font(.system(size: 11))
                        .foregroundStyle(Color(white: 0.55))
                }

                if onOpen != nil {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(white: 0.4))
                }
            }
            .padding(14)
            .background(EAColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(tint.opacity(0.28), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var levelBadge: some View {
        ZStack {
            Circle()
                .fill(tint.opacity(0.16))
                .frame(width: 46, height: 46)
            Circle()
                .stroke(tint.opacity(0.6), lineWidth: 1.5)
                .frame(width: 46, height: 46)
            VStack(spacing: -2) {
                Text("LVL")
                    .font(.system(size: 7, weight: .bold))
                    .foregroundStyle(tint.opacity(0.8))
                Text("\(level.level)")
                    .font(.system(size: 18, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
            }
        }
    }

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color(white: 0.16))
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [tint.opacity(0.7), tint],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: max(6, geo.size.width * level.progress))
            }
        }
        .frame(height: 7)
    }
}

/// Fuller Athlete Level card for the Coach tab.
struct AthleteLevelDetailCard: View {
    let level: AthleteLevel
    let signals: AthleteLevelEngine.Signals

    private var tint: Color { AthleteLevelStyle.tint(for: level.title) }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(tint)
                Text("Athlete Level")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                Text("\(level.totalXP) XP")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Color(white: 0.55))
            }

            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(tint.opacity(0.16))
                        .frame(width: 72, height: 72)
                    Circle()
                        .stroke(tint.opacity(0.6), lineWidth: 2)
                        .frame(width: 72, height: 72)
                    VStack(spacing: -2) {
                        Text("LVL")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(tint.opacity(0.8))
                        Text("\(level.level)")
                            .font(.system(size: 30, weight: .heavy, design: .rounded))
                            .foregroundStyle(.white)
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(level.title)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(.white)
                    Text(level.flavor)
                        .font(.system(size: 13))
                        .foregroundStyle(Color(white: 0.62))
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Level \(level.level)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color(white: 0.6))
                    Spacer()
                    Text(level.nextTitle == level.title
                         ? "\(level.xpToGo) XP to Level \(level.level + 1)"
                         : "\(level.xpToGo) XP to \(level.nextTitle)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(tint)
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color(white: 0.16))
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [tint.opacity(0.7), tint],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: max(8, geo.size.width * level.progress))
                    }
                }
                .frame(height: 9)
            }

            HStack(spacing: 0) {
                statCell("\(signals.sessions)", "Sessions")
                statDivider
                statCell("\(signals.totalSets)", "Sets")
                statDivider
                statCell("\(signals.prCount)", "PRs")
                statDivider
                statCell("\(signals.streak)", "Streak")
            }
            .padding(.top, 2)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(tint.opacity(0.28), lineWidth: 1)
        )
    }

    private var statDivider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.08))
            .frame(width: 1, height: 34)
    }

    private func statCell(_ value: String, _ label: String) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Color(white: 0.5))
        }
        .frame(maxWidth: .infinity)
    }
}
