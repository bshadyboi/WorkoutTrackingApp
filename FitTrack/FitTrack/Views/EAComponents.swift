import SwiftUI
import Charts

enum EAColor {
    static let blue = Color(red: 0.35, green: 0.65, blue: 1.0)
    static let green = Color(red: 0.19, green: 0.82, blue: 0.35)
    static let yellow = Color(red: 1.0, green: 0.80, blue: 0.20)
    static let orange = Color(red: 1.0, green: 0.70, blue: 0.15)
    static let card = Color(red: 0.11, green: 0.11, blue: 0.12)
    static let track = Color(red: 0.18, green: 0.18, blue: 0.20)
}

struct EASparkline: View {
    let values: [Double]
    var color: Color = EAColor.blue
    var height: CGFloat = 36

    var body: some View {
        GeometryReader { geo in
            let pts = normalizedPoints(in: geo.size)
            if pts.count >= 2 {
                Path { path in
                    path.move(to: pts[0])
                    for p in pts.dropFirst() { path.addLine(to: p) }
                }
                .stroke(color, style: StrokeStyle(lineWidth: 1.8, lineCap: .round, lineJoin: .round))
            }
        }
        .frame(width: 72, height: height)
    }

    private func normalizedPoints(in size: CGSize) -> [CGPoint] {
        guard values.count >= 2,
              let minV = values.min(),
              let maxV = values.max() else { return [] }
        let range = max(maxV - minV, 0.0001)
        return values.enumerated().map { index, value in
            let x = CGFloat(index) / CGFloat(values.count - 1) * size.width
            let y = size.height - CGFloat((value - minV) / range) * size.height
            return CGPoint(x: x, y: y)
        }
    }
}

struct EALiftCard: View {
    let name: String
    let sessions: Int
    let e1RM: Int
    let status: String
    let stalledWeeks: Int
    let changePercent: Double
    let spark: [Double]

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 6) {
                Text(name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Text("\(sessions) sessions · e1RM \(e1RM) lb")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(white: 0.55))
                    Text(statusEmoji)
                        .font(.system(size: 11))
                }

                Text(statusLabel)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(statusColor)
            }

            Spacer(minLength: 8)

            EASparkline(values: spark, color: EAColor.blue, height: 34)

            Text(String(format: "%+.1f%%", changePercent))
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(changePercent >= 0 ? EAColor.green : EAColor.orange)
                .frame(width: 62, alignment: .trailing)
        }
        .padding(14)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var statusLabel: String {
        if status == "Stalled", stalledWeeks > 0 {
            return "Stalled \(stalledWeeks) wks"
        }
        return status
    }

    private var statusEmoji: String {
        switch status {
        case "Progressing": return "📈"
        case "New": return "🆕"
        case "Stalled": return "⚠️"
        default: return "➡️"
        }
    }

    private var statusColor: Color {
        switch status {
        case "Progressing": return EAColor.green
        case "New": return EAColor.blue
        case "Stalled": return EAColor.orange
        default: return Color(white: 0.55)
        }
    }
}

struct EARecompChart: View {
    let weightIndex: [(date: Date, value: Double)]
    let strengthIndex: [(date: Date, value: Double)]

    var body: some View {
        Chart {
            ForEach(Array(weightIndex.enumerated()), id: \.offset) { _, point in
                LineMark(
                    x: .value("Date", point.date),
                    y: .value("Index", point.value),
                    series: .value("Series", "Bodyweight")
                )
                .foregroundStyle(EAColor.blue)
                .lineStyle(StrokeStyle(lineWidth: 2))
                .interpolationMethod(.catmullRom)
            }
            ForEach(Array(strengthIndex.enumerated()), id: \.offset) { _, point in
                LineMark(
                    x: .value("Date", point.date),
                    y: .value("Index", point.value),
                    series: .value("Series", "Strength")
                )
                .foregroundStyle(EAColor.green)
                .lineStyle(StrokeStyle(lineWidth: 2))
                .interpolationMethod(.catmullRom)
            }
        }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 4)) { value in
                AxisValueLabel {
                    if let date = value.as(Date.self) {
                        Text(date.formatted(.dateTime.month(.abbreviated).day()))
                            .font(.system(size: 9))
                            .foregroundStyle(Color(white: 0.5))
                    }
                }
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { value in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                    .foregroundStyle(Color.white.opacity(0.06))
                AxisValueLabel {
                    if let v = value.as(Double.self) {
                        Text("\(Int(v))")
                            .font(.system(size: 9))
                            .foregroundStyle(Color(white: 0.45))
                    }
                }
            }
        }
        .frame(height: 160)
    }
}

struct EAWorkoutRow: View {
    let title: String
    let subtitle: String
    var highlighted: Bool = false
    let onStart: () -> Void
    var onTap: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 12) {
            Button {
                onTap?()
            } label: {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.white)
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundStyle(Color(white: 0.55))
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)

            Button(action: onStart) {
                Text("Start")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 10)
                    .background(EAColor.green)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(highlighted ? EAColor.blue : Color.clear, lineWidth: 1.5)
        )
    }
}

struct EAComplianceRing: View {
    let title: String
    let center: String
    let subtitle: String
    let progress: Double
    var tint: Color = EAColor.blue

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(EAColor.track, lineWidth: 7)
                Circle()
                    .trim(from: 0, to: min(max(progress, 0), 1))
                    .stroke(tint, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text(center)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.white)
            }
            .frame(width: 72, height: 72)

            Text(title)
                .font(.system(size: 11))
                .foregroundStyle(Color(white: 0.55))
            Text(subtitle)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color(white: 0.75))
        }
        .frame(maxWidth: .infinity)
    }
}
