import SwiftUI
import PhotosUI
import UIKit

struct MealPhotoScanView: View {
    let onFoodSelected: (FoodItem) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var previewImage: UIImage?
    @State private var isProcessing = false
    @State private var recognizedText = ""
    @State private var parsedLabel: ParsedNutritionLabel?
    @State private var matchedFoods: [FoodItem] = []
    @State private var errorMessage = ""
    @State private var showCamera = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Snap a meal, label, or menu. FitTrack reads the photo and suggests foods from your catalog + Open Food Facts.")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                        .lineSpacing(4)

                    HStack(spacing: 10) {
                        Button { showCamera = true } label: {
                            Label("Camera", systemImage: "camera.fill")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.black)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(EAColor.green)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                        .buttonStyle(.plain)

                        PhotosPicker(selection: $selectedPhoto, matching: .images) {
                            Label("Library", systemImage: "photo.on.rectangle")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(EAColor.blue)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                    }

                    if let previewImage {
                        Image(uiImage: previewImage)
                            .resizable()
                            .scaledToFit()
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
                            )
                    } else {
                        VStack(spacing: 10) {
                            Image(systemName: "camera.viewfinder")
                                .font(.system(size: 36))
                                .foregroundStyle(EAColor.blue)
                            Text("No photo yet")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(.white)
                            Text("Use Camera for a fresh snap, or Library for an existing shot.")
                                .font(.caption)
                                .foregroundStyle(Color(white: 0.5))
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 36)
                        .background(EAColor.card)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }

                    if isProcessing {
                        HStack(spacing: 10) {
                            ProgressView().tint(EAColor.blue)
                            Text("Reading photo…")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Color(white: 0.7))
                        }
                    }

                    if let parsedLabel, parsedLabel.isValid {
                        DashboardCard {
                            VStack(alignment: .leading, spacing: 8) {
                                PremiumLabel(text: "Nutrition Label Detected")
                                Text(parsedLabel.name)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text(labelSummary(parsedLabel))
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                                PremiumButton(title: "Log This Label", icon: "plus") {
                                    onFoodSelected(parsedLabel.asFoodItem())
                                    dismiss()
                                }
                            }
                        }
                    }

                    if !matchedFoods.isEmpty {
                        PremiumLabel(text: "Suggested Matches")
                        ForEach(matchedFoods) { food in
                            Button {
                                onFoodSelected(food)
                                dismiss()
                            } label: {
                                DashboardCard {
                                    HStack {
                                        Image(systemName: "fork.knife")
                                            .foregroundStyle(EAColor.blue)
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(food.name)
                                                .font(.system(size: 15, weight: .medium))
                                                .foregroundStyle(AppTheme.textPrimary)
                                            Text("\(food.brand) · \(food.servingLabel)")
                                                .font(.caption)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        Spacer()
                                        Image(systemName: "plus.circle.fill")
                                            .foregroundStyle(EAColor.green)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
                .padding(24)
            }
            .background(AppTheme.background)
            .navigationTitle("Snap a Meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .onChange(of: selectedPhoto) { _, item in
                Task { await processPhoto(item) }
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraPicker { image in
                    Task { await processImage(image) }
                }
                .ignoresSafeArea()
            }
        }
        .preferredColorScheme(.dark)
    }

    private func labelSummary(_ label: ParsedNutritionLabel) -> String {
        [
            label.calories.map { "\($0) kcal" },
            label.proteinG.map { "P \($0)g" },
            label.carbsG.map { "C \($0)g" },
            label.fatG.map { "F \($0)g" },
        ].compactMap { $0 }.joined(separator: " · ")
    }

    private func processPhoto(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        isProcessing = true
        errorMessage = ""
        defer { isProcessing = false }

        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data) else {
                errorMessage = "Could not load that photo."
                return
            }
            await processImage(image)
        } catch {
            errorMessage = "Photo scan failed. Try again."
        }
    }

    private func processImage(_ image: UIImage) async {
        isProcessing = true
        errorMessage = ""
        defer { isProcessing = false }

        previewImage = image
        recognizedText = await DocumentOCRService.extractText(from: image)
        parsedLabel = NutritionLabelParser.parse(recognizedText)

        var matches = NutritionLabelParser.foodItems(from: recognizedText)
        let tokens = recognizedText
            .split(whereSeparator: { !$0.isLetter })
            .map(String.init)
            .filter { $0.count > 3 }
            .prefix(4)
        let query = tokens.joined(separator: " ")
        if query.count >= 4, let online = try? await FoodDatabaseService.search(query: query) {
            var seen = Set(matches.map(\.id))
            for item in online where !seen.contains(item.id) {
                matches.append(item)
                seen.insert(item.id)
            }
        }
        matchedFoods = Array(matches.prefix(12))

        if parsedLabel?.isValid != true && matchedFoods.isEmpty {
            errorMessage = "Couldn't read nutrition info. Try a clearer photo of the label, menu, or plated meal name."
        }
    }
}

private extension ParsedNutritionLabel {
    func asFoodItem() -> FoodItem {
        .serving(
            id: "scan-\(UUID().uuidString)",
            name: name,
            brand: "Photo Scan",
            calories: calories ?? 0,
            protein: Double(proteinG ?? 0),
            carbs: Double(carbsG ?? 0),
            fat: Double(fatG ?? 0),
            label: servingText ?? "1 serving"
        )
    }
}

struct DexaDocumentImportView: View {
    let onParsed: (ParsedDexaReport, String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var showPicker = false
    @State private var showPhotoPicker = false
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var isProcessing = false
    @State private var previewText = ""
    @State private var parsed: ParsedDexaReport?
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Import a DEXA report PDF or photo. FitTrack reads body fat %, lean mass, fat mass, and more automatically.")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                        .lineSpacing(4)

                    PremiumButton(title: "Import PDF Report", icon: "doc.fill") {
                        showPicker = true
                    }

                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        HStack {
                            Image(systemName: "photo")
                            Text("Import Photo of Report")
                        }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(AppTheme.gold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(AppTheme.gold.opacity(0.5), lineWidth: 1)
                        )
                    }

                    if isProcessing {
                        ProgressView("Reading report…").tint(AppTheme.gold)
                    }

                    if let parsed, parsed.isValid {
                        DashboardCard {
                            VStack(alignment: .leading, spacing: 10) {
                                PremiumLabel(text: "Detected Values")
                                if let bf = parsed.bodyFatPercent {
                                    Text("Body fat: \(String(format: "%.1f", bf))%")
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                                if let lean = parsed.leanMassLbs {
                                    Text("Lean mass: \(String(format: "%.1f", lean)) lb")
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                                if let fat = parsed.fatMassLbs {
                                    Text("Fat mass: \(String(format: "%.1f", fat)) lb")
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                                if let weight = parsed.totalWeightLbs {
                                    Text("Total weight: \(String(format: "%.1f", weight)) lb")
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                                PremiumButton(title: "Save Imported Scan", icon: "checkmark") {
                                    onParsed(parsed, previewText)
                                    dismiss()
                                }
                            }
                        }
                    }

                    if !previewText.isEmpty {
                        PremiumLabel(text: "Extracted Text Preview")
                        Text(String(previewText.prefix(600)))
                            .font(.caption2)
                            .foregroundStyle(AppTheme.textSecondary)
                    }

                    if !errorMessage.isEmpty {
                        Text(errorMessage).font(.caption).foregroundStyle(AppTheme.textSecondary)
                    }
                }
                .padding(24)
            }
            .background(AppTheme.background)
            .navigationTitle("Import DEXA")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }.foregroundStyle(AppTheme.textSecondary)
                }
            }
            .fileImporter(
                isPresented: $showPicker,
                allowedContentTypes: [.pdf, .image],
                allowsMultipleSelection: false
            ) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first else { return }
                    Task { await processDocument(url) }
                case .failure:
                    errorMessage = "Could not open that file."
                }
            }
            .onChange(of: selectedPhoto) { _, item in
                Task { await processPhotoItem(item) }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func processDocument(_ url: URL) async {
        isProcessing = true
        errorMessage = ""
        defer { isProcessing = false }

        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }

        previewText = await DocumentOCRService.extractText(from: url)
        parsed = DexaReportParser.parse(previewText)
        if parsed?.isValid != true {
            errorMessage = "Couldn't find DEXA values. You can still edit fields manually after import."
        }
    }

    private func processPhotoItem(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        isProcessing = true
        errorMessage = ""
        defer { isProcessing = false }

        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data) else {
            errorMessage = "Could not load photo."
            return
        }
        previewText = await DocumentOCRService.extractText(from: image)
        parsed = DexaReportParser.parse(previewText)
        if parsed?.isValid != true {
            errorMessage = "Couldn't find DEXA values in this photo."
        }
    }
}
