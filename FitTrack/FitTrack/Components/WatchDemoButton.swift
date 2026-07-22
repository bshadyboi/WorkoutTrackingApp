import SwiftUI

struct WatchDemoButton: View {
    let videoURL: String
    var compact: Bool = false

    @Environment(\.openURL) private var openURL

    private var url: URL? {
        guard !videoURL.isEmpty else { return nil }
        return URL(string: videoURL)
    }

    var body: some View {
        if let url {
            Button {
                openURL(url)
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "play.rectangle.fill")
                        .font(.system(size: compact ? 11 : 12))
                    Text("Watch Demo")
                        .font(.system(size: compact ? 11 : 12, weight: .medium))
                }
                .foregroundStyle(AppTheme.gold)
                .padding(.horizontal, compact ? 10 : 12)
                .padding(.vertical, compact ? 6 : 8)
                .background(AppTheme.gold.opacity(0.1))
                .overlay(
                    Rectangle()
                        .stroke(AppTheme.gold.opacity(0.35), lineWidth: 0.5)
                )
            }
            .buttonStyle(.plain)
        }
    }
}
