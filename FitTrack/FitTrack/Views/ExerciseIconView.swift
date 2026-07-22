import SwiftUI

enum ExerciseGlyph {
    static func symbol(name: String, muscle: String) -> String {
        let n = name.lowercased()
        let m = muscle.lowercased()

        if n.contains("squat") { return "figure.strengthtraining.traditional" }
        if n.contains("deadlift") || n.contains("rdl") || n.contains("romanian") { return "figure.hiking" }
        if n.contains("bench") || n.contains("chest press") || n.contains("press") && m.contains("chest") {
            return "figure.boxing"
        }
        if n.contains("incline") && (n.contains("press") || n.contains("bench")) { return "figure.boxing" }
        if n.contains("row") || n.contains("pulldown") || n.contains("pull-down") || n.contains("pullup") || n.contains("pull-up") || n.contains("chin") {
            return "figure.climbing"
        }
        if n.contains("lat") { return "figure.climbing" }
        if n.contains("curl") || n.contains("bicep") { return "figure.arms.open" }
        if n.contains("tricep") || n.contains("pushdown") || n.contains("skull") || n.contains("extension") && m.contains("tricep") {
            return "figure.boxing"
        }
        if n.contains("lateral raise") || n.contains("shoulder") || n.contains("delt") || n.contains("overhead press") || n.contains("ohp") {
            return "figure.mind.and.body"
        }
        if n.contains("shrug") || n.contains("trap") { return "figure.stand" }
        if n.contains("leg press") || n.contains("leg extension") || n.contains("hack") { return "figure.walk" }
        if n.contains("leg curl") || n.contains("hamstring") { return "figure.run" }
        if n.contains("calf") { return "figure.walk" }
        if n.contains("abduct") || n.contains("adduct") || n.contains("hip") || n.contains("glute") { return "figure.cooldown" }
        if n.contains("crunch") || n.contains("plank") || n.contains("ab") || m.contains("core") { return "figure.core.training" }
        if n.contains("fly") || n.contains("pec") { return "figure.boxing" }
        if n.contains("face pull") || n.contains("rear delt") { return "figure.mind.and.body" }
        if n.contains("carry") || n.contains("farmer") { return "figure.strengthtraining.functional" }

        switch MuscleGroup.from(muscleLabel: muscle) {
        case .chest: return "figure.boxing"
        case .back, .traps: return "figure.climbing"
        case .shoulders: return "figure.mind.and.body"
        case .biceps: return "figure.arms.open"
        case .triceps, .forearms: return "figure.boxing"
        case .quads: return "figure.strengthtraining.traditional"
        case .hamstrings, .glutes: return "figure.run"
        case .calves: return "figure.walk"
        case .abs: return "figure.core.training"
        case .none: return "figure.strengthtraining.traditional"
        }
    }
}

struct ExerciseIconView: View {
    let name: String
    let muscle: String
    var size: CGFloat = 44
    var compact: Bool = false

    var body: some View {
        Image(systemName: ExerciseGlyph.symbol(name: name, muscle: muscle))
            .font(.system(size: compact ? size * 0.38 : size * 0.42, weight: .semibold))
            .foregroundStyle(EAColor.blue)
            .frame(width: size, height: size)
            .background(EAColor.blue.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: compact ? 10 : 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: compact ? 10 : 12, style: .continuous)
                    .stroke(EAColor.blue.opacity(0.25), lineWidth: 1)
            )
    }
}
