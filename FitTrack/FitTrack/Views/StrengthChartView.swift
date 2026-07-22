import SwiftUI
import Charts

struct StrengthChartView: View {
    let exerciseName: String
    let dataPoints: [StrengthDataPoint]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(exerciseName)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(AppTheme.textPrimary)

            if dataPoints.count < 2 {
                Text("Log more sessions to see your strength trend.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(height: 120, alignment: .leading)
            } else {
                Chart(dataPoints) { point in
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
                    .foregroundStyle(AppTheme.gold)
                }
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                            .foregroundStyle(AppTheme.gold.opacity(0.15))
                        AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
                .chartYAxis {
                    AxisMarks { _ in
                        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                            .foregroundStyle(AppTheme.gold.opacity(0.15))
                        AxisValueLabel()
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
                .frame(height: 160)
            }
        }
        .padding(.vertical, 8)
    }
}
