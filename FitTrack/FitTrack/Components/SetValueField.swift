import SwiftUI

struct SetValueField<FocusValue: Hashable>: View {
    @Binding var value: Int
    var minimum: Int = 0
    var focused: FocusState<FocusValue?>.Binding
    var equals: FocusValue

    @State private var text = ""

    private var isFocused: Bool {
        focused.wrappedValue == equals
    }

    var body: some View {
        TextField("0", text: $text)
            .keyboardType(.numberPad)
            .multilineTextAlignment(.center)
            .font(.system(size: 16, weight: .medium, design: .monospaced))
            .foregroundStyle(AppTheme.textPrimary)
            .padding(.vertical, 10)
            .padding(.horizontal, 8)
            .background(AppTheme.surface)
            .overlay(Rectangle().stroke(isFocused ? AppTheme.gold.opacity(0.5) : AppTheme.gold.opacity(0.2), lineWidth: 0.5))
            .focused(focused, equals: equals)
            .onAppear { syncTextFromValue() }
            .onChange(of: value) { _, _ in
                if !isFocused { syncTextFromValue() }
            }
            .onChange(of: focused.wrappedValue) { old, new in
                let wasFocused = old == equals
                let nowFocused = new == equals
                if nowFocused && !wasFocused {
                    text = "\(value)"
                } else if wasFocused && !nowFocused {
                    commitText()
                }
            }
            .onChange(of: text) { _, newValue in
                guard isFocused else { return }
                let digits = newValue.filter(\.isNumber)
                if digits != newValue {
                    text = digits
                    return
                }
                guard !digits.isEmpty else { return }
                if let parsed = Int(digits) {
                    value = max(parsed, minimum)
                }
            }
    }

    private func syncTextFromValue() {
        text = value == 0 && minimum == 0 ? "" : "\(value)"
    }

    private func commitText() {
        let digits = text.filter(\.isNumber)
        if let parsed = Int(digits), !digits.isEmpty {
            value = max(parsed, minimum)
        } else {
            value = minimum
        }
        syncTextFromValue()
    }
}
