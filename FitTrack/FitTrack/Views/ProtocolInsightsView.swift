import SwiftUI

struct ProtocolInsightsView: View {
    let report: ProtocolInsights.Report

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            header

            if report.perItem.isEmpty {
                Text("Add protocol items and check them off daily to unlock adherence insights.")
                    .font(.system(size: 13))
                    .foregroundStyle(Color(white: 0.55))
            } else {
                overallBar
                perItemList

                if let comparison = report.comparison {
                    comparisonSection(comparison)
                } else {
                    Text("Log \(ProtocolInsights.minDaysForClaim)+ days over ~3 weeks to see how adherence tracks with your strength, energy, and weight.")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(white: 0.45))
                        .fixedSize(horizontal: false, vertical: true)
                }

                disclaimer
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

    private var header: some View {
        HStack(spacing: 8) {
            Image(systemName: "pills.circle.fill")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(EAColor.green)
            Text("Protocol insights")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white)
            Spacer()
            Text("\(report.windowDays)d")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(Color(white: 0.5))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(white: 0.14))
                .clipShape(Capsule())
        }
    }

    private var overallBar: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Overall adherence")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color(white: 0.6))
                Spacer()
                Text("\(report.overallPercent)%")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(adherenceColor(report.overallAdherence))
            }
            PremiumProgressBar(value: report.overallAdherence, height: 7, tint: adherenceColor(report.overallAdherence))
        }
    }

    private var perItemList: some View {
        VStack(spacing: 8) {
            ForEach(report.perItem) { item in
                HStack(spacing: 10) {
                    Text(item.calendarInitials)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 24)
                        .background(Color(white: 0.16))
                        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                    Text(item.name)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color(white: 0.85))
                        .lineLimit(1)
                    Spacer(minLength: 8)
                    Text("\(item.takenDays)/\(item.dueDays)")
                        .font(.system(size: 11))
                        .foregroundStyle(Color(white: 0.45))
                    Text("\(item.percent)%")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(adherenceColor(item.adherence))
                        .frame(width: 40, alignment: .trailing)
                }
            }
        }
    }

    private func comparisonSection(_ c: ProtocolInsights.Comparison) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("High vs low adherence weeks")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)

            comparisonRow(
                label: "Strength trend",
                high: c.strengthDeltaHigh.map { String(format: "%+.1f%%", $0) },
                low: c.strengthDeltaLow.map { String(format: "%+.1f%%", $0) },
                betterHigh: (c.strengthDeltaHigh ?? -99) > (c.strengthDeltaLow ?? -99)
            )
            comparisonRow(
                label: "Energy (0–5)",
                high: c.energyHigh.map { String(format: "%.1f", $0) },
                low: c.energyLow.map { String(format: "%.1f", $0) },
                betterHigh: (c.energyHigh ?? 0) > (c.energyLow ?? 0)
            )
            comparisonRow(
                label: "Soreness (0–5)",
                high: c.sorenessHigh.map { String(format: "%.1f", $0) },
                low: c.sorenessLow.map { String(format: "%.1f", $0) },
                betterHigh: (c.sorenessHigh ?? 5) < (c.sorenessLow ?? 5)
            )
            comparisonRow(
                label: "Weight rate (lb/wk)",
                high: c.weightRateHigh.map { String(format: "%+.2f", $0) },
                low: c.weightRateLow.map { String(format: "%+.2f", $0) },
                betterHigh: nil
            )
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(white: 0.09))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func comparisonRow(label: String, high: String?, low: String?, betterHigh: Bool?) -> some View {
        HStack(spacing: 8) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(Color(white: 0.6))
            Spacer(minLength: 8)
            Text(high ?? "—")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(betterHigh == true ? EAColor.green : .white)
                .frame(width: 62, alignment: .trailing)
            Text("vs")
                .font(.system(size: 10))
                .foregroundStyle(Color(white: 0.35))
            Text(low ?? "—")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(betterHigh == false ? EAColor.green : Color(white: 0.55))
                .frame(width: 62, alignment: .trailing)
        }
    }

    private var disclaimer: some View {
        Text("Association from your own logs — not statistics or medical/dosing advice.")
            .font(.system(size: 10))
            .foregroundStyle(Color(white: 0.38))
            .fixedSize(horizontal: false, vertical: true)
    }

    private func adherenceColor(_ value: Double) -> Color {
        if value >= 0.9 { return EAColor.green }
        if value >= 0.7 { return EAColor.yellow }
        return EAColor.orange
    }
}
