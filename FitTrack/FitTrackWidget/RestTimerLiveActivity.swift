import ActivityKit
import WidgetKit
import SwiftUI

struct RestTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestTimerAttributes.self) { context in
            lockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("REST")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color(white: 0.55))
                        Text(context.attributes.exerciseName)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.endsAt, style: .timer)
                        .font(.system(size: 28, weight: .bold, design: .monospaced))
                        .foregroundStyle(Color(red: 0.35, green: 0.65, blue: 1.0))
                        .monospacedDigit()
                        .multilineTextAlignment(.trailing)
                        .frame(minWidth: 72)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(
                        timerInterval: context.state.endsAt.addingTimeInterval(-Double(context.state.totalSeconds))...context.state.endsAt,
                        countsDown: true
                    )
                    .tint(Color(red: 0.35, green: 0.65, blue: 1.0))
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundStyle(Color(red: 0.35, green: 0.65, blue: 1.0))
            } compactTrailing: {
                Text(context.state.endsAt, style: .timer)
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color(red: 0.35, green: 0.65, blue: 1.0))
                    .monospacedDigit()
                    .frame(minWidth: 40)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundStyle(Color(red: 0.35, green: 0.65, blue: 1.0))
            }
        }
    }

    private func lockScreenView(context: ActivityViewContext<RestTimerAttributes>) -> some View {
        let start = context.state.endsAt.addingTimeInterval(-Double(context.state.totalSeconds))
        return HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("REST")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(1.1)
                    .foregroundStyle(Color(white: 0.55))
                Text(context.attributes.exerciseName)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                if !context.attributes.workoutName.isEmpty {
                    Text(context.attributes.workoutName)
                        .font(.system(size: 12))
                        .foregroundStyle(Color(white: 0.5))
                }
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 6) {
                Text(context.state.endsAt, style: .timer)
                    .font(.system(size: 32, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color(red: 0.35, green: 0.65, blue: 1.0))
                    .monospacedDigit()
                ProgressView(timerInterval: start...context.state.endsAt, countsDown: true)
                    .tint(Color(red: 0.35, green: 0.65, blue: 1.0))
                    .frame(width: 110)
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .activityBackgroundTint(Color.black.opacity(0.85))
        .activitySystemActionForegroundColor(.white)
    }
}
