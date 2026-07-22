import SwiftUI

enum AppTheme {
    /// Primary accent — Engineered Advantage blue
    static let gold = Color(red: 0.35, green: 0.62, blue: 1.0)
    static let goldBright = Color(red: 0.45, green: 0.72, blue: 1.0)
    static let goldMuted = Color(red: 0.35, green: 0.62, blue: 1.0).opacity(0.45)
    static let accent = Color(red: 0.30, green: 0.55, blue: 0.95)
    static let success = Color(red: 0.22, green: 0.82, blue: 0.45)
    static let startGreen = Color(red: 0.18, green: 0.78, blue: 0.40)
    static let background = Color.black
    static let card = Color(red: 0.11, green: 0.11, blue: 0.12)
    static let cardElevated = Color(red: 0.13, green: 0.13, blue: 0.15)
    static let surface = Color(red: 0.16, green: 0.16, blue: 0.18)
    static let inputBackground = Color(red: 0.08, green: 0.08, blue: 0.09)
    static let textPrimary = Color(red: 0.96, green: 0.96, blue: 0.97)
    static let textSecondary = Color(red: 0.55, green: 0.55, blue: 0.58)
    static let cardRadius: CGFloat = 16
    static let cardPadding: CGFloat = 16

    static func labelFont() -> Font {
        .system(size: 11, weight: .medium)
    }

    static func serifLight(_ size: CGFloat) -> Font {
        .system(size: size, weight: .light, design: .serif)
    }

    static func displayLight(_ size: CGFloat) -> Font {
        .system(size: size, weight: .light, design: .default)
    }

    static func headline(_ size: CGFloat = 28) -> Font {
        .system(size: size, weight: .semibold, design: .default)
    }
}

struct GoldDivider: View {
    var body: some View {
        Rectangle()
            .fill(AppTheme.gold.opacity(0.22))
            .frame(height: 0.5)
    }
}

struct PremiumLabel: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(AppTheme.labelFont())
            .tracking(2.2)
            .foregroundStyle(AppTheme.textSecondary)
    }
}

struct PremiumScreenTitle: View {
    let eyebrow: String
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            PremiumLabel(text: eyebrow)
            Text(title)
                .font(AppTheme.headline(32))
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
}

struct PremiumButton: View {
    let title: String
    var icon: String? = nil
    var style: Style = .filled
    let action: () -> Void

    enum Style { case filled, outline }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 13, weight: .semibold))
                }
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .tracking(1.2)
            }
            .foregroundStyle(style == .filled ? AppTheme.background : AppTheme.gold)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(style == .filled ? AppTheme.gold : Color.clear)
            .overlay(
                RoundedRectangle(cornerRadius: 2)
                    .stroke(AppTheme.gold, lineWidth: style == .outline ? 1 : 0)
            )
        }
        .buttonStyle(.plain)
    }
}

struct PremiumListRow: View {
    let title: String
    let subtitle: String
    var trailing: String? = nil

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(AppTheme.textPrimary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                Spacer()
                if let trailing {
                    Text(trailing)
                        .font(.caption)
                        .foregroundStyle(AppTheme.gold)
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(AppTheme.textSecondary.opacity(0.6))
            }
            .padding(.vertical, 16)
            GoldDivider()
        }
    }
}

struct PremiumMetricColumn: View {
    let label: String
    let value: String
    let unit: String

    var body: some View {
        VStack(spacing: 6) {
            PremiumLabel(text: label)
            Text(value)
                .font(AppTheme.displayLight(26))
                .foregroundStyle(AppTheme.textPrimary)
            Text(unit)
                .font(.caption2)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct PremiumProgressBar: View {
    let value: Double
    var height: CGFloat = 6
    var tint: Color = AppTheme.gold

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(AppTheme.inputBackground)
                Capsule()
                    .fill(tint)
                    .frame(width: max(0, geo.size.width * min(1, value)))
            }
        }
        .frame(height: height)
    }
}

struct DashboardCard<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .padding(AppTheme.cardPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.card)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.cardRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.cardRadius, style: .continuous)
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)
            )
    }
}

struct DashboardCardHeader: View {
    let icon: String
    let title: String
    var trailing: AnyView?

    init(icon: String, title: String, @ViewBuilder trailing: () -> some View = { EmptyView() }) {
        self.icon = icon
        self.title = title
        self.trailing = AnyView(trailing())
    }

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(AppTheme.gold)
                .frame(width: 28, height: 28)
                .background(AppTheme.gold.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(AppTheme.textPrimary)

            Spacer()

            trailing
        }
    }
}

struct FeatureTile: View {
    let emoji: String
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                Text(emoji)
                    .font(.system(size: 28))
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                    .lineLimit(+2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(AppTheme.cardPadding)
            .background(AppTheme.card)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.cardRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.cardRadius, style: .continuous)
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct AppBrandHeader: View {
    let displayName: String
    var onExport: (() -> Void)?
    var onImport: (() -> Void)?
    var onSignOut: (() -> Void)?

    var body: some View {
        HStack(alignment: .center) {
            HStack(spacing: 0) {
                Text("Fit")
                    .font(.system(size: 15, weight: .bold))
                    .tracking(0.4)
                    .foregroundStyle(AppTheme.textPrimary)
                Text("Track")
                    .font(.system(size: 15, weight: .bold))
                    .tracking(0.4)
                    .foregroundStyle(AppTheme.gold)
            }

            Spacer()

            Menu {
                if let onExport {
                    Button("Export backup (JSON)", action: onExport)
                }
                if let onImport {
                    Button("Import backup…", action: onImport)
                }
                if let onSignOut {
                    Button("Sign out", role: .destructive, action: onSignOut)
                }
            } label: {
                HStack(spacing: 4) {
                    Text("\(UserProfile.firstName(from: displayName)) · settings")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                    Image(systemName: "gearshape.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
    }
}

struct EAStartButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(AppTheme.startGreen)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct EASegmentChip: View {
    let title: String
    var icon: String? = nil
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .semibold))
                }
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
            }
            .foregroundStyle(isSelected ? AppTheme.gold : AppTheme.textSecondary)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(AppTheme.card)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(isSelected ? AppTheme.gold : Color.white.opacity(0.08), lineWidth: isSelected ? 1.5 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct SaveChipButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(AppTheme.background)
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .background(AppTheme.gold)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct QuickChipButton: View {
    let title: String
    var style: Style = .outline
    let action: () -> Void

    enum Style { case outline, filled }

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(style == .filled ? AppTheme.background : AppTheme.textSecondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(style == .filled ? AppTheme.gold.opacity(0.85) : AppTheme.inputBackground)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(Color.white.opacity(style == .outline ? 0.08 : 0), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}
