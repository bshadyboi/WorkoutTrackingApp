import SwiftUI

struct BodyRecompDiagramView: View {
    let metrics: RecompMetrics

    var body: some View {
        DashboardCard {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        PremiumLabel(text: "Body Progress")
                        Text(metrics.phase.rawValue)
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(AppTheme.gold)
                    }
                    Spacer()
                    bodySilhouette
                }

                Text(metrics.phase.summary)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                    .lineSpacing(3)

                VStack(spacing: 14) {
                    progressBar(
                        title: "Weight",
                        value: normalized(metrics.weightChangeLbs, scale: 8),
                        label: formattedChange(metrics.weightChangeLbs, unit: "lb", invertGood: true)
                    )
                    progressBar(
                        title: "Strength",
                        value: normalized(metrics.strengthChangePercent, scale: 15),
                        label: formattedPercent(metrics.strengthChangePercent)
                    )
                    if let bf = metrics.bodyFatChange {
                        progressBar(
                            title: "Body Fat",
                            value: normalized(-bf, scale: 4),
                            label: String(format: "%+.1f%%", bf)
                        )
                    }
                    if let lean = metrics.leanMassChangeLbs {
                        progressBar(
                            title: "Lean Mass",
                            value: normalized(lean, scale: 5),
                            label: formattedChange(lean, unit: "lb", invertGood: false)
                        )
                    }
                    if let fat = metrics.fatMassChangeLbs {
                        progressBar(
                            title: "Fat Mass",
                            value: normalized(-fat, scale: 5),
                            label: formattedChange(fat, unit: "lb", invertGood: true)
                        )
                    }
                }

                Text("Source: \(metrics.dataSource)")
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary.opacity(0.8))
            }
        }
    }

    private var bodySilhouette: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppTheme.inputBackground)
                .frame(width: 72, height: 96)
            VStack(spacing: 4) {
                Circle()
                    .fill(AppTheme.gold.opacity(0.5))
                    .frame(width: 18, height: 18)
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [AppTheme.gold.opacity(0.7), AppTheme.gold.opacity(0.25)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(width: 28, height: 52)
            }
        }
    }

    private func progressBar(title: String, value: Double, label: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(AppTheme.textPrimary)
                Spacer()
                Text(label)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(AppTheme.gold)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(AppTheme.inputBackground)
                    Capsule()
                        .fill(barColor(for: value))
                        .frame(width: geo.size.width * min(max(value, 0.05), 1.0))
                }
            }
            .frame(height: 8)
        }
    }

    private func barColor(for value: Double) -> Color {
        if value >= 0.65 { return AppTheme.success }
        if value >= 0.35 { return AppTheme.gold }
        return AppTheme.textSecondary.opacity(0.5)
    }

    private func normalized(_ value: Double, scale: Double) -> Double {
        min(max((value / scale + 1) / 2, 0.05), 1.0)
    }

    private func formattedChange(_ value: Double, unit: String, invertGood: Bool) -> String {
        let sign = value >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.1f", value)) \(unit)"
    }

    private func formattedPercent(_ value: Double) -> String {
        String(format: "%+.0f%%", value)
    }
}
