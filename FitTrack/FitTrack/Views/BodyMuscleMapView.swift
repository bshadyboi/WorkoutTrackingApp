import PhotosUI
import SwiftUI
import SwiftData
import MuscleMap

struct BodyMuscleMapView: View {
    let sessions: [WorkoutSession]

    @Environment(\.modelContext) private var modelContext
    @Query(sort: \ProgressPhotoLog.capturedAt, order: .reverse) private var progressPhotos: [ProgressPhotoLog]

    @State private var page = 0
    @State private var selectedGroup: MuscleGroup?
    @State private var selectedPhotoSide: ProgressPhotoSide = .front
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isAnalyzingPhoto = false
    @State private var photoErrorMessage = ""

    private static let maxPhotosPerSide = 24

    private var physiqueScores: [MuscleGroup: Int] {
        PhysiqueAnalysisService.combinedScores(from: progressPhotos)
    }

    private var progress: [MuscleGroupProgress] {
        MuscleProgressAnalytics.progress(
            from: sessions,
            physiqueScores: physiqueScores
        )
    }

    private var progressByGroup: [MuscleGroup: MuscleGroupProgress] {
        Dictionary(uniqueKeysWithValues: progress.map { ($0.group, $0) })
    }

    private var latestFrontPhoto: ProgressPhotoLog? {
        progressPhotos.first { $0.side == .front }
    }

    private var latestBackPhoto: ProgressPhotoLog? {
        progressPhotos.first { $0.side == .back }
    }

    private var photosForSelectedSide: [ProgressPhotoLog] {
        progressPhotos.filter { $0.side == selectedPhotoSide }
    }

    var body: some View {
        DashboardCard {
            VStack(alignment: .leading, spacing: 16) {
                header
                progressPhotoSection
                bodyMapPager
                lifterLevelLegend
            }
        }
        .onChange(of: selectedPhotoItem) { _, item in
            Task { await processSelectedPhoto(item) }
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                PremiumLabel(text: "Body Progress")
                Text("Progress")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
            }
            Spacer()
            Image(systemName: "figure.strengthtraining.traditional")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(AppTheme.gold)
        }
    }

    private var progressPhotoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Photos save on your phone. Add as many as you want — the heat map always uses your latest front and back shots.")
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
                .lineSpacing(3)

            Picker("Photo side", selection: $selectedPhotoSide) {
                ForEach(ProgressPhotoSide.allCases) { side in
                    Text(side.label).tag(side)
                }
            }
            .pickerStyle(.segmented)

            HStack(spacing: 12) {
                latestPhotoPreview

                PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                    VStack(spacing: 8) {
                        if isAnalyzingPhoto {
                            ProgressView()
                                .tint(AppTheme.gold)
                        } else {
                            Image(systemName: "camera.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(AppTheme.gold)
                        }
                        Text(isAnalyzingPhoto ? "Analyzing…" : "Add Photo")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(AppTheme.inputBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(AppTheme.gold.opacity(0.35), lineWidth: 1)
                    )
                }
                .disabled(isAnalyzingPhoto)
            }
            .frame(height: 92)

            if photosForSelectedSide.count > 1 {
                photoHistoryStrip
            }

            if !photoErrorMessage.isEmpty {
                Text(photoErrorMessage)
                    .font(.caption)
                    .foregroundStyle(.orange)
            } else if !physiqueScores.isEmpty {
                Text(heatMapStatusText)
                    .font(.caption2)
                    .foregroundStyle(AppTheme.goldMuted)
            }
        }
    }

    private var heatMapStatusText: String {
        let frontCount = progressPhotos.filter { $0.side == .front }.count
        let backCount = progressPhotos.filter { $0.side == .back }.count
        if frontCount > 0 && backCount > 0 {
            return "\(frontCount) front · \(backCount) back saved. Heat map uses the newest of each."
        }
        if frontCount > 0 {
            return "\(frontCount) front photo\(frontCount == 1 ? "" : "s") saved. Add a back shot when you can."
        }
        return "\(backCount) back photo\(backCount == 1 ? "" : "s") saved."
    }

    private var photoHistoryStrip: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\(selectedPhotoSide.label) timeline")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(AppTheme.textSecondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(Array(photosForSelectedSide.enumerated()), id: \.element.id) { index, photo in
                        photoHistoryTile(photo, isLatest: index == 0)
                    }
                }
            }
        }
    }

    private func photoHistoryTile(_ photo: ProgressPhotoLog, isLatest: Bool) -> some View {
        VStack(spacing: 4) {
            ZStack(alignment: .topTrailing) {
                if let image = UIImage(data: photo.imageData) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 64, height: 64)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(isLatest ? AppTheme.gold : Color.white.opacity(0.08), lineWidth: isLatest ? 2 : 1)
                        )
                }

                if isLatest {
                    Text("LIVE")
                        .font(.system(size: 7, weight: .bold))
                        .foregroundStyle(AppTheme.background)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(AppTheme.gold)
                        .clipShape(Capsule())
                        .offset(x: 4, y: -4)
                }
            }

            Text(photo.capturedAt.formatted(date: .abbreviated, time: .omitted))
                .font(.system(size: 9))
                .foregroundStyle(AppTheme.textSecondary)
        }
        .contextMenu {
            if !isLatest {
                Button("Use for heat map") {
                    bumpPhotoToLatest(photo)
                }
            }
            Button("Delete", role: .destructive) {
                modelContext.delete(photo)
            }
        }
    }

    private func bumpPhotoToLatest(_ photo: ProgressPhotoLog) {
        photo.capturedAt = .now
    }

    @ViewBuilder
    private var latestPhotoPreview: some View {
        let photo = selectedPhotoSide == .front ? latestFrontPhoto : latestBackPhoto

        if let photo, let image = UIImage(data: photo.imageData) {
            ZStack(alignment: .bottomLeading) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 92, height: 92)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                Text(photo.side.label)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.black.opacity(0.55))
                    .clipShape(Capsule())
                    .padding(6)
            }
        } else {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppTheme.inputBackground)
                .frame(width: 92, height: 92)
                .overlay {
                    VStack(spacing: 6) {
                        Image(systemName: "person.fill")
                            .foregroundStyle(AppTheme.textSecondary)
                        Text("No \(selectedPhotoSide.label.lowercased()) photo")
                            .font(.system(size: 9))
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
        }
    }

    private var bodyMapPager: some View {
        TabView(selection: $page) {
            bodyMap(side: .front)
                .tag(0)
            bodyMap(side: .back)
                .tag(1)
        }
        .tabViewStyle(.page(indexDisplayMode: .always))
        .frame(height: 380)
    }

    private func bodyMap(side: BodySide) -> some View {
        configuredBody(side: side)
            .onMuscleSelected { muscle, _ in
                guard let group = MuscleGroup.from(muscleMapMuscle: muscle) else { return }
                withAnimation(.easeInOut(duration: 0.2)) {
                    selectedGroup = selectedGroup == group ? nil : group
                }
            }
            .padding(.horizontal, 8)
    }

    private func configuredBody(side: BodySide) -> BodyView {
        var body = BodyView(gender: .male, side: side, style: Self.progressStyle)

        for item in progress {
            guard let color = highlightColor(for: item) else { continue }
            for muscle in item.group.muscleMapMuscles {
                body = body.highlight(muscle, color: color)
            }
        }

        return body
    }

    private func highlightColor(for item: MuscleGroupProgress) -> Color? {
        if item.tier == .beginner && item.recentSets == 0 && physiqueScores[item.group] == nil {
            return nil
        }
        return item.tier.color
    }

    private var lifterLevelLegend: some View {
        VStack(spacing: 12) {
            VStack(spacing: 10) {
                HStack(spacing: 0) {
                    legendItem(.beginner)
                    legendItem(.novice)
                    legendItem(.intermediate)
                }
                HStack(spacing: 0) {
                    legendItem(.advanced)
                    legendItem(.elite)
                    legendItem(.worldClass)
                }
            }

            Text("Lifter Level")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)

            if let selectedGroup, let item = progressByGroup[selectedGroup] {
                Text("\(item.group.displayName) · \(item.tier.label)")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func legendItem(_ tier: MuscleGrowthTier) -> some View {
        HStack(spacing: 6) {
            Circle()
                .fill(tier.color)
                .frame(width: 9, height: 9)
            Text(tier.label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(AppTheme.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity)
    }

    private func processSelectedPhoto(_ item: PhotosPickerItem?) async {
        guard let item else { return }

        await MainActor.run {
            isAnalyzingPhoto = true
            photoErrorMessage = ""
        }

        defer {
            Task { @MainActor in
                isAnalyzingPhoto = false
                selectedPhotoItem = nil
            }
        }

        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data) else {
            await MainActor.run {
                photoErrorMessage = "Could not load that photo."
            }
            return
        }

        let analysis = await PhysiqueAnalysisService.analyze(
            image: image,
            side: selectedPhotoSide
        )

        guard analysis.isUsable else {
            await MainActor.run {
                photoErrorMessage = "Could not find a person in that photo. Try framing your torso in the mirror."
            }
            return
        }

        let scores = analysis.scores

        guard let compressed = PhysiqueAnalysisService.compressedJPEGData(from: image) else {
            await MainActor.run {
                photoErrorMessage = "Could not save photo."
            }
            return
        }

        await MainActor.run {
            let sidePhotos = progressPhotos.filter { $0.side == selectedPhotoSide }
            if sidePhotos.count >= Self.maxPhotosPerSide {
                sidePhotos.dropFirst(Self.maxPhotosPerSide - 1).forEach { modelContext.delete($0) }
            }

            let log = ProgressPhotoLog(
                viewSide: selectedPhotoSide.rawValue,
                imageData: compressed,
                muscleScoresJSON: ProgressPhotoLog.encodeScores(scores)
            )
            modelContext.insert(log)

            if selectedPhotoSide == .front {
                page = 0
            } else {
                page = 1
            }
        }
    }

    private static let progressStyle = BodyViewStyle(
        defaultFillColor: Color(red: 0.16, green: 0.16, blue: 0.18),
        strokeColor: Color.white.opacity(0.12),
        strokeWidth: 0.6,
        selectionColor: Color(red: 0.16, green: 0.16, blue: 0.18),
        selectionStrokeColor: AppTheme.gold,
        selectionStrokeWidth: 1.4,
        headColor: Color(red: 0.42, green: 0.44, blue: 0.47),
        hairColor: Color(red: 0.42, green: 0.44, blue: 0.47)
    )
}

private extension MuscleGroup {
    var muscleMapMuscles: [Muscle] {
        switch self {
        case .chest: return [.chest]
        case .shoulders: return [.deltoids]
        case .biceps: return [.biceps]
        case .triceps: return [.triceps]
        case .forearms: return [.forearm]
        case .abs: return [.abs]
        case .quads: return [.quadriceps]
        case .hamstrings: return [.hamstring]
        case .glutes: return [.gluteal]
        case .calves: return [.calves]
        case .back: return [.upperBack, .lowerBack, .rhomboids]
        case .traps: return [.trapezius]
        }
    }

    static func from(muscleMapMuscle muscle: Muscle) -> MuscleGroup? {
        switch muscle {
        case .chest, .upperChest, .lowerChest: return .chest
        case .deltoids, .frontDeltoid, .rearDeltoid: return .shoulders
        case .biceps: return .biceps
        case .triceps: return .triceps
        case .forearm: return .forearms
        case .abs, .upperAbs, .lowerAbs, .obliques, .serratus: return .abs
        case .quadriceps, .innerQuad, .outerQuad, .hipFlexors: return .quads
        case .hamstring, .adductors: return .hamstrings
        case .gluteal: return .glutes
        case .calves, .tibialis, .ankles: return .calves
        case .upperBack, .lowerBack, .rhomboids: return .back
        case .trapezius, .upperTrapezius, .lowerTrapezius: return .traps
        default: return nil
        }
    }
}
