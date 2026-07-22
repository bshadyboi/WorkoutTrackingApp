import SwiftUI

struct ActivityRingsView: View {
    let metrics: [(label: String, pct: Double)]

    var body: some View {
        VStack(spacing: 14) {
            ForEach(metrics, id: \.label) { metric in
                HStack(spacing: 12) {
                    Text(metric.label)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(width: 56, alignment: .leading)
                    PremiumProgressBar(value: metric.pct)
                    Text("\(Int(metric.pct * 100))%")
                        .font(.system(size: 12, weight: .medium, design: .monospaced))
                        .foregroundStyle(AppTheme.gold)
                        .frame(width: 36, alignment: .trailing)
                }
            }
        }
    }
}
