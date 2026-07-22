import SwiftUI
import UIKit
import Observation

struct CelebrationToast: Identifiable, Equatable {
    let id = UUID()
    let emoji: String
    let title: String
    let subtitle: String
    var tint: Color = EAColor.blue
}

/// Central haptic patterns so celebratory moments feel consistent.
enum Haptics {
    @MainActor static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    @MainActor static func setComplete() {
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred(intensity: 0.9)
    }

    @MainActor static func light() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    /// A short celebratory sequence for PRs / level-ups / finishes.
    @MainActor static func celebrate() {
        let notif = UINotificationFeedbackGenerator()
        notif.notificationOccurred(.success)
        let heavy = UIImpactFeedbackGenerator(style: .heavy)
        Task {
            try? await Task.sleep(for: .milliseconds(120))
            heavy.impactOccurred(intensity: 0.8)
            try? await Task.sleep(for: .milliseconds(120))
            heavy.impactOccurred(intensity: 1.0)
        }
    }
}

@MainActor
@Observable
final class CelebrationCenter {
    static let shared = CelebrationCenter()

    var toast: CelebrationToast?
    /// Increments to trigger a full-screen confetti burst; observed by ConfettiOverlay.
    var confettiBurst: Int = 0
    private var hideTask: Task<Void, Never>?

    func show(
        emoji: String,
        title: String,
        subtitle: String = "",
        tint: Color = EAColor.blue,
        duration: TimeInterval = 1.8,
        confetti: Bool = false
    ) {
        hideTask?.cancel()
        withAnimation(.spring(response: 0.38, dampingFraction: 0.82)) {
            toast = CelebrationToast(emoji: emoji, title: title, subtitle: subtitle, tint: tint)
        }
        if confetti {
            Haptics.celebrate()
            confettiBurst += 1
        } else {
            Haptics.light()
        }
        hideTask = Task {
            try? await Task.sleep(for: .seconds(duration))
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.25)) {
                toast = nil
            }
        }
    }

    /// Fire confetti without a toast (used by full-screen moments).
    func burstConfetti() {
        confettiBurst += 1
    }

    func dismiss() {
        hideTask?.cancel()
        withAnimation(.easeOut(duration: 0.2)) { toast = nil }
    }
}

struct CelebrationToastOverlay: View {
    @Bindable var center: CelebrationCenter = .shared

    var body: some View {
        VStack {
            if let toast = center.toast {
                HStack(spacing: 12) {
                    Text(toast.emoji)
                        .font(.system(size: 22))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(toast.title)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                        if !toast.subtitle.isEmpty {
                            Text(toast.subtitle)
                                .font(.system(size: 12))
                                .foregroundStyle(Color(white: 0.7))
                        }
                    }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color(white: 0.12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(toast.tint.opacity(0.55), lineWidth: 1.5)
                        )
                )
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .transition(.move(edge: .top).combined(with: .opacity))
                .onTapGesture { center.dismiss() }
            }
            Spacer()
        }
        .animation(.spring(response: 0.38, dampingFraction: 0.82), value: center.toast)
        .allowsHitTesting(center.toast != nil)
    }
}

// MARK: - Confetti

private struct ConfettiPiece: Identifiable {
    let id = UUID()
    let xStart: CGFloat
    let color: Color
    let size: CGFloat
    let rotation: Double
    let delay: Double
    let drift: CGFloat
    let spin: Double
}

/// Lightweight, dependency-free confetti burst. Plays once per `trigger` change.
struct ConfettiView: View {
    /// Change this value to fire a new burst.
    var trigger: Int
    var pieceCount: Int = 60

    @State private var pieces: [ConfettiPiece] = []
    @State private var animate = false

    private let palette: [Color] = [
        EAColor.blue, EAColor.green, EAColor.yellow, EAColor.orange,
        Color(red: 0.85, green: 0.4, blue: 0.9), .white
    ]

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(pieces) { piece in
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(piece.color)
                        .frame(width: piece.size, height: piece.size * 0.5)
                        .rotationEffect(.degrees(animate ? piece.rotation + piece.spin : piece.rotation))
                        .position(
                            x: piece.xStart * geo.size.width + (animate ? piece.drift : 0),
                            y: animate ? geo.size.height + 40 : -40
                        )
                        .opacity(animate ? 0 : 1)
                        .animation(
                            .easeIn(duration: 1.6).delay(piece.delay),
                            value: animate
                        )
                }
            }
        }
        .allowsHitTesting(false)
        .onChange(of: trigger) { _, _ in fire() }
    }

    private func fire() {
        pieces = (0..<pieceCount).map { _ in
            ConfettiPiece(
                xStart: CGFloat.random(in: 0.05...0.95),
                color: palette.randomElement() ?? EAColor.blue,
                size: CGFloat.random(in: 7...13),
                rotation: Double.random(in: 0...360),
                delay: Double.random(in: 0...0.25),
                drift: CGFloat.random(in: -60...60),
                spin: Double.random(in: 180...720)
            )
        }
        animate = false
        DispatchQueue.main.async {
            withAnimation { animate = true }
        }
        // Clear after the burst so we don't retain views.
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
            if !pieces.isEmpty { pieces = [] }
        }
    }
}

/// Global confetti overlay driven by CelebrationCenter. Place near the top of the app.
struct ConfettiOverlay: View {
    @Bindable var center: CelebrationCenter = .shared

    var body: some View {
        ConfettiView(trigger: center.confettiBurst)
            .ignoresSafeArea()
            .allowsHitTesting(false)
    }
}

struct WorkoutCompleteMomentView: View {
    let dayName: String
    let completedSets: Int
    let totalSets: Int
    let durationSeconds: Int
    let prCount: Int
    let onContinue: () -> Void

    @State private var appeared = false
    @State private var confetti = 0

    private var minutes: Int { max(1, durationSeconds / 60) }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Soft radial glow
            Circle()
                .fill(EAColor.green.opacity(appeared ? 0.18 : 0))
                .frame(width: 320, height: 320)
                .blur(radius: 40)
                .offset(y: -40)

            ConfettiView(trigger: confetti, pieceCount: prCount > 0 ? 90 : 55)
                .ignoresSafeArea()

            VStack(spacing: 22) {
                Spacer()

                ZStack {
                    Circle()
                        .stroke(EAColor.green.opacity(0.25), lineWidth: 3)
                        .frame(width: 96, height: 96)
                        .scaleEffect(appeared ? 1.15 : 0.6)
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(EAColor.green)
                        .scaleEffect(appeared ? 1 : 0.4)
                        .opacity(appeared ? 1 : 0)
                }

                VStack(spacing: 8) {
                    Text("SESSION COMPLETE")
                        .font(.system(size: 12, weight: .bold))
                        .tracking(1.4)
                        .foregroundStyle(EAColor.green)
                    Text(dayName)
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                    Text(subtitleLine)
                        .font(.system(size: 15))
                        .foregroundStyle(Color(white: 0.6))
                        .multilineTextAlignment(.center)
                }
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 12)

                HStack(spacing: 10) {
                    statPill("\(completedSets)", label: "sets")
                    statPill("\(minutes)m", label: "time")
                    if prCount > 0 {
                        statPill("\(prCount)", label: "PRs")
                    }
                }
                .opacity(appeared ? 1 : 0)

                Spacer()

                Button(action: onContinue) {
                    Text("Continue")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(EAColor.green)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 24)
                .padding(.bottom, 36)
                .opacity(appeared ? 1 : 0)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            Haptics.celebrate()
            withAnimation(.spring(response: 0.55, dampingFraction: 0.78)) {
                appeared = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                confetti += 1
            }
        }
    }

    private var subtitleLine: String {
        if prCount > 0 {
            return "\(completedSets) sets · \(minutes) min · \(prCount) PR\(prCount == 1 ? "" : "s")"
        }
        return "\(completedSets) sets logged · \(minutes) min"
    }

    private func statPill(_ value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color(white: 0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
