import SwiftUI
import SwiftData
import UIKit

/// Before/after scrubber for progress photos (front or back).
struct PhotoProgressTimelineView: View {
    let photos: [ProgressPhotoLog]
    var title: String = "Progress photos"

    @State private var index = 0
    @State private var showCompare = true

    private var ordered: [ProgressPhotoLog] {
        photos.sorted { $0.capturedAt < $1.capturedAt }
    }

    private var older: ProgressPhotoLog? {
        guard ordered.count >= 2 else { return ordered.first }
        let i = min(max(index, 0), ordered.count - 2)
        return ordered[i]
    }

    private var newer: ProgressPhotoLog? {
        guard ordered.count >= 2 else { return ordered.last }
        let i = min(max(index + 1, 1), ordered.count - 1)
        return ordered[i]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("📷 \(title)")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                if ordered.count >= 2 {
                    Button(showCompare ? "Single" : "Compare") {
                        showCompare.toggle()
                    }
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(EAColor.blue)
                }
            }

            if ordered.isEmpty {
                Text("Add front/back shots in Body map to unlock before & after.")
                    .font(.caption)
                    .foregroundStyle(Color(white: 0.5))
                    .padding(.vertical, 8)
            } else if showCompare, let older, let newer, ordered.count >= 2 {
                HStack(spacing: 8) {
                    photoPane(older, label: "Before")
                    photoPane(newer, label: "After")
                }
                if ordered.count > 2 {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Scrub pair")
                            .font(.caption2)
                            .foregroundStyle(Color(white: 0.45))
                        Slider(
                            value: Binding(
                                get: { Double(index) },
                                set: { index = Int($0.rounded()) }
                            ),
                            in: 0...Double(max(ordered.count - 2, 0)),
                            step: 1
                        )
                        .tint(EAColor.blue)
                    }
                }
            } else if let photo = ordered.last {
                photoPane(photo, label: photo.capturedAt.formatted(.dateTime.month().day().year()))
                    .frame(maxWidth: .infinity)
                    .frame(height: 220)
            }
        }
        .padding(14)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .onAppear {
            index = max(0, ordered.count - 2)
        }
    }

    private func photoPane(_ photo: ProgressPhotoLog, label: String) -> some View {
        VStack(spacing: 6) {
            if let ui = UIImage(data: photo.imageData) {
                Image(uiImage: ui)
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity)
                    .frame(height: 180)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            } else {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Color(white: 0.12))
                    .frame(height: 180)
                    .overlay(Text("No image").foregroundStyle(Color(white: 0.4)))
            }
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color(white: 0.55))
            Text(photo.capturedAt.formatted(.dateTime.month(.abbreviated).day().year()))
                .font(.system(size: 10))
                .foregroundStyle(Color(white: 0.4))
        }
        .frame(maxWidth: .infinity)
    }
}
