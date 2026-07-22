import SwiftUI

struct BadgesView: View {
    let earnedBadges: [EarnedBadge]

    private var earnedDefinitions: [BadgeDefinition] {
        earnedBadges.compactMap { BadgeCatalog.definition(for: $0.id) }
    }

    private var lockedDefinitions: [BadgeDefinition] {
        let earnedIDs = Set(earnedBadges.map(\.id))
        return BadgeCatalog.all.filter { !earnedIDs.contains($0.id) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                PremiumLabel(text: "Achievements")
                Spacer()
                Text("\(earnedDefinitions.count)/\(BadgeCatalog.all.count)")
                    .font(.caption)
                    .foregroundStyle(AppTheme.gold)
            }

            if earnedDefinitions.isEmpty {
                Text("Complete workouts to start earning badges.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            } else {
                badgeGrid(earnedDefinitions, locked: false)
            }

            if !lockedDefinitions.isEmpty {
                PremiumLabel(text: "Locked")
                    .padding(.top, 8)
                badgeGrid(lockedDefinitions, locked: true)
            }
        }
    }

    private func badgeGrid(_ badges: [BadgeDefinition], locked: Bool) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(badges) { badge in
                VStack(spacing: 8) {
                    Image(systemName: badge.icon)
                        .font(.system(size: 22))
                        .foregroundStyle(locked ? AppTheme.textSecondary.opacity(0.4) : BadgeStyle.tierColor(badge.tier))
                    Text(badge.title)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(locked ? AppTheme.textSecondary : AppTheme.textPrimary)
                        .multilineTextAlignment(.center)
                    Text(badge.description)
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                }
                .padding(12)
                .frame(maxWidth: .infinity, minHeight: 110)
                .background(locked ? AppTheme.surface.opacity(0.35) : AppTheme.surface)
                .overlay(Rectangle().stroke(locked ? AppTheme.gold.opacity(0.1) : AppTheme.gold.opacity(0.3), lineWidth: 0.5))
            }
        }
    }
}

enum BadgeStyle {
    static func tierColor(_ tier: BadgeDefinition.BadgeTier) -> Color {
        switch tier {
        case .bronze: return Color(red: 0.86, green: 0.54, blue: 0.28)
        case .silver: return Color(red: 0.78, green: 0.80, blue: 0.84)
        case .gold: return EAColor.yellow
        case .platinum: return Color(red: 0.75, green: 0.90, blue: 1.0)
        }
    }

    static func tierLabel(_ tier: BadgeDefinition.BadgeTier) -> String {
        switch tier {
        case .bronze: return "BRONZE"
        case .silver: return "SILVER"
        case .gold: return "GOLD"
        case .platinum: return "PLATINUM"
        }
    }
}

struct BadgeUnlockedSheet: View {
    let badges: [BadgeDefinition]
    let onDismiss: () -> Void

    @State private var appeared = false
    @State private var index = 0
    @State private var confetti = 0

    private var current: BadgeDefinition? {
        guard badges.indices.contains(index) else { return badges.first }
        return badges[index]
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let badge = current {
                Circle()
                    .fill(BadgeStyle.tierColor(badge.tier).opacity(appeared ? 0.2 : 0))
                    .frame(width: 280, height: 280)
                    .blur(radius: 50)
                    .offset(y: -60)
            }

            ConfettiView(trigger: confetti, pieceCount: 70)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Spacer()

                Text(badges.count == 1 ? "BADGE UNLOCKED" : "BADGES UNLOCKED")
                    .font(.system(size: 12, weight: .bold))
                    .tracking(1.6)
                    .foregroundStyle(EAColor.yellow)

                if let badge = current {
                    Image(systemName: badge.icon)
                        .font(.system(size: 56))
                        .foregroundStyle(BadgeStyle.tierColor(badge.tier))
                        .padding(28)
                        .background(
                            Circle()
                                .fill(Color(white: 0.12))
                                .overlay(Circle().stroke(BadgeStyle.tierColor(badge.tier).opacity(0.6), lineWidth: 2))
                        )
                        .scaleEffect(appeared ? 1 : 0.5)
                        .opacity(appeared ? 1 : 0)

                    Text(BadgeStyle.tierLabel(badge.tier))
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(BadgeStyle.tierColor(badge.tier))

                    Text(badge.title)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)

                    Text(badge.description)
                        .font(.system(size: 15))
                        .foregroundStyle(Color(white: 0.6))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 28)

                    if badges.count > 1 {
                        Text("\(index + 1) of \(badges.count)")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color(white: 0.45))
                    }
                }

                Spacer()

                Button {
                    if index < badges.count - 1 {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                            appeared = false
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                            index += 1
                            withAnimation(.spring(response: 0.45, dampingFraction: 0.78)) {
                                appeared = true
                            }
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            confetti += 1
                        }
                    } else {
                        onDismiss()
                    }
                } label: {
                    Text(index < badges.count - 1 ? "Next" : "Nice!")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(EAColor.yellow)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 24)
                .padding(.bottom, 36)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            Haptics.celebrate()
            withAnimation(.spring(response: 0.55, dampingFraction: 0.75)) {
                appeared = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                confetti += 1
            }
        }
    }
}

struct RecentlyEarnedBadgesCard: View {
    let earnedBadges: [EarnedBadge]
    var onTapAll: (() -> Void)? = nil

    private var recent: [(badge: BadgeDefinition, earnedAt: Date)] {
        earnedBadges
            .compactMap { earned -> (BadgeDefinition, Date)? in
                guard let def = BadgeCatalog.definition(for: earned.id) else { return nil }
                return (def, earned.earnedAt)
            }
            .sorted { $0.1 > $1.1 }
            .prefix(4)
            .map { ($0.0, $0.1) }
    }

    var body: some View {
        if !recent.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("🏆 Recently earned")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                    Spacer()
                    if let onTapAll {
                        Button("All", action: onTapAll)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(EAColor.blue)
                    }
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(recent, id: \.badge.id) { item in
                            VStack(spacing: 8) {
                                Image(systemName: item.badge.icon)
                                    .font(.system(size: 20))
                                    .foregroundStyle(BadgeStyle.tierColor(item.badge.tier))
                                    .frame(width: 44, height: 44)
                                    .background(Color(white: 0.14))
                                    .clipShape(Circle())
                                Text(item.badge.title)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .lineLimit(1)
                                Text(relativeDay(item.earnedAt))
                                    .font(.system(size: 10))
                                    .foregroundStyle(Color(white: 0.45))
                            }
                            .frame(width: 88)
                            .padding(.vertical, 10)
                            .background(Color(white: 0.10))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                    }
                }
            }
            .padding(14)
            .background(EAColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }

    private func relativeDay(_ date: Date) -> String {
        let days = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: date), to: Calendar.current.startOfDay(for: .now)).day ?? 0
        if days == 0 { return "Today" }
        if days == 1 { return "Yesterday" }
        return "\(days)d ago"
    }
}
