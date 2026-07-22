import SwiftUI

struct StepRingView: View {
    let steps: Int
    let goal: Int

    private var progress: Double { min(Double(steps) / Double(goal), 1.0) }

    var body: some View {
        VStack(spacing: 20) {
            PremiumLabel(text: "Steps Today")

            ZStack {
                Circle()
                    .stroke(AppTheme.gold.opacity(0.12), lineWidth: 3)
                    .frame(width: 148, height: 148)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(AppTheme.gold, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .frame(width: 148, height: 148)
                    .rotationEffect(.degrees(-90))

                Text(steps.formatted())
                    .font(AppTheme.displayLight(40))
                    .foregroundStyle(AppTheme.textPrimary)
            }

            Text("\(Int(progress * 100))% of goal")
                .font(.caption)
                .foregroundStyle(AppTheme.gold)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
}
