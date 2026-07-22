import SwiftUI
import Charts

struct BodyWeightChartView: View {
    let dataPoints: [(date: Date, weight: Double)]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            PremiumLabel(text: "Weight Trend")

            if dataPoints.count < 2 {
                Text("Log morning weight on Home to see your trend.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(height: 140, alignment: .leading)
            } else {
                Chart(dataPoints, id: \.date) { point in
                    AreaMark(
                        x: .value("Date", point.date),
                        y: .value("Weight", point.weight)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [AppTheme.gold.opacity(0.35), AppTheme.gold.opacity(0.02)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                    LineMark(
                        x: .value("Date", point.date),
                        y: .value("Weight", point.weight)
                    )
                    .foregroundStyle(AppTheme.gold)
                    .interpolationMethod(.catmullRom)

                    PointMark(
                        x: .value("Date", point.date),
                        y: .value("Weight", point.weight)
                    )
                    .foregroundStyle(AppTheme.goldBright)
                }
                .chartYAxis {
                    AxisMarks { _ in
                        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                            .foregroundStyle(Color.white.opacity(0.08))
                        AxisValueLabel()
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                            .foregroundStyle(Color.white.opacity(0.08))
                        AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
                .frame(height: 180)
            }
        }
    }
}
