import CoreImage
import UIKit
import Vision

struct PhysiqueAnalysisResult {
    let scores: [MuscleGroup: Int]
    let coverage: AnalysisCoverage

    var isUsable: Bool { !scores.isEmpty }
}

enum AnalysisCoverage: String {
    case fullBody
    case upperBody
    case partial
}

enum PhysiqueAnalysisService {
    static func analyze(image: UIImage, side: ProgressPhotoSide) async -> PhysiqueAnalysisResult {
        guard let prepared = prepare(image) else {
            return PhysiqueAnalysisResult(scores: [:], coverage: .partial)
        }

        async let pose = detectPose(in: prepared.cgImage)
        async let mask = generatePersonMask(for: prepared.cgImage)

        let observation = await pose
        let segmentation = await mask
        let detectedBounds = segmentation.flatMap { boundingRectFromMask($0) }

        let coverage = coverageLevel(pose: observation, personBounds: detectedBounds)
        let regions: [MuscleGroup: CGRect]

        if let observation {
            regions = muscleRegions(for: side, pose: observation, coverage: coverage, personBounds: detectedBounds)
        } else if let detectedBounds {
            regions = fallbackRegions(for: side, personBounds: detectedBounds, coverage: .partial)
        } else {
            return PhysiqueAnalysisResult(scores: [:], coverage: .partial)
        }

        var scores: [MuscleGroup: Int] = [:]

        for (group, rect) in regions {
            let score = definitionScore(
                cgImage: prepared.cgImage,
                mask: segmentation,
                rect: rect,
                imageSize: prepared.size
            )
            if score > 0 {
                scores[group] = score
            }
        }

        if scores.isEmpty, let detectedBounds {
            scores = fallbackScores(for: side, personBounds: detectedBounds, coverage: coverage)
        }

        return PhysiqueAnalysisResult(scores: scores, coverage: coverage)
    }

    static func combinedScores(from photos: [ProgressPhotoLog]) -> [MuscleGroup: Int] {
        var merged: [MuscleGroup: Int] = [:]

        for side in ProgressPhotoSide.allCases {
            guard let latest = photos.first(where: { $0.side == side }) else { continue }
            for (group, score) in latest.muscleScores {
                merged[group] = max(merged[group] ?? 0, score)
            }
        }

        return merged
    }

    static func compressedJPEGData(from image: UIImage, maxWidth: CGFloat = 900) -> Data? {
        let normalized = fixOrientation(image)
        let resized = resize(normalized, maxWidth: maxWidth)
        return resized.jpegData(compressionQuality: 0.72)
    }

    // MARK: - Vision

    private static func detectPose(in cgImage: CGImage) async -> VNHumanBodyPoseObservation? {
        await withCheckedContinuation { continuation in
            let request = VNDetectHumanBodyPoseRequest { request, _ in
                let observations = request.results as? [VNHumanBodyPoseObservation]
                let best = observations?.max(by: { poseConfidence($0) < poseConfidence($1) })
                continuation.resume(returning: best)
            }
            request.revision = VNDetectHumanBodyPoseRequestRevision1

            let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
            try? handler.perform([request])
        }
    }

    private static func generatePersonMask(for cgImage: CGImage) async -> CVPixelBuffer? {
        await withCheckedContinuation { continuation in
            let request = VNGeneratePersonSegmentationRequest { request, _ in
                let mask = (request.results as? [VNPixelBufferObservation])?.first?.pixelBuffer
                continuation.resume(returning: mask)
            }
            request.qualityLevel = .accurate

            let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
            try? handler.perform([request])
        }
    }

    private static func poseConfidence(_ pose: VNHumanBodyPoseObservation) -> Float {
        let joints: [VNHumanBodyPoseObservation.JointName] = [
            .neck, .leftShoulder, .rightShoulder, .leftElbow, .rightElbow,
            .root, .leftHip, .rightHip,
        ]
        let values = joints.compactMap { try? pose.recognizedPoint($0).confidence }
        guard !values.isEmpty else { return 0 }
        return values.reduce(0, +) / Float(values.count)
    }

    // MARK: - Scoring

    private static func definitionScore(
        cgImage: CGImage,
        mask: CVPixelBuffer?,
        rect: CGRect,
        imageSize: CGSize
    ) -> Int {
        let pixelRect = CGRect(
            x: rect.minX * imageSize.width,
            y: rect.minY * imageSize.height,
            width: rect.width * imageSize.width,
            height: rect.height * imageSize.height
        ).integral

        let bounds = CGRect(x: 0, y: 0, width: imageSize.width, height: imageSize.height)
        let croppedRect = pixelRect.intersection(bounds)

        guard croppedRect.width > 6, croppedRect.height > 6,
              let cropped = cgImage.cropping(to: croppedRect) else {
            return 0
        }

        if let mask {
            let coverage = maskCoverage(in: mask, rect: rect)
            if coverage < 0.06 {
                return 0
            }
        }

        let ciImage = CIImage(cgImage: cropped)
        let edges = ciImage
            .applyingFilter("CIEdges", parameters: [kCIInputIntensityKey: 1.8])
            .applyingFilter("CIColorControls", parameters: [kCIInputContrastKey: 1.2])

        let edgeAverage = regionAverageLuminance(of: edges) ?? 0
        let normalized = min(max((edgeAverage - 0.015) / 0.16, 0), 1)
        let edgeScore = Int((normalized * 75).rounded())

        // Keep partial/gym/mirror photos usable with a modest baseline.
        return min(100, max(18, edgeScore + 12))
    }

    private static func fallbackScores(
        for side: ProgressPhotoSide,
        personBounds: CGRect,
        coverage: AnalysisCoverage
    ) -> [MuscleGroup: Int] {
        let regions = fallbackRegions(for: side, personBounds: personBounds, coverage: coverage)
        var scores: [MuscleGroup: Int] = [:]
        for group in regions.keys {
            scores[group] = 28
        }
        return scores
    }

    private static func maskCoverage(in mask: CVPixelBuffer, rect: CGRect) -> Double {
        CVPixelBufferLockBaseAddress(mask, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(mask, .readOnly) }

        let width = CVPixelBufferGetWidth(mask)
        let height = CVPixelBufferGetHeight(mask)
        guard let base = CVPixelBufferGetBaseAddress(mask) else { return 0 }

        let bytesPerRow = CVPixelBufferGetBytesPerRow(mask)
        let buffer = base.assumingMemoryBound(to: UInt8.self)

        let startX = max(0, Int(rect.minX * Double(width)))
        let endX = min(width, Int(rect.maxX * Double(width)))
        let startY = max(0, Int(rect.minY * Double(height)))
        let endY = min(height, Int(rect.maxY * Double(height)))

        guard endX > startX, endY > startY else { return 0 }

        var hits = 0
        var total = 0

        for y in startY..<endY {
            for x in startX..<endX {
                total += 1
                if buffer[y * bytesPerRow + x] > 96 {
                    hits += 1
                }
            }
        }

        guard total > 0 else { return 0 }
        return Double(hits) / Double(total)
    }

    private static func regionAverageLuminance(of image: CIImage) -> Double? {
        let extent = image.extent.integral
        guard extent.width > 1, extent.height > 1 else { return nil }

        let context = CIContext(options: nil)
        let width = min(24, Int(extent.width))
        let height = min(24, Int(extent.height))
        var pixels = [UInt8](repeating: 0, count: width * height * 4)

        context.render(
            image,
            toBitmap: &pixels,
            rowBytes: width * 4,
            bounds: extent,
            format: .RGBA8,
            colorSpace: CGColorSpaceCreateDeviceRGB()
        )

        var total = 0.0
        let pixelCount = width * height
        for index in 0..<pixelCount {
            let offset = index * 4
            let r = Double(pixels[offset]) / 255
            let g = Double(pixels[offset + 1]) / 255
            let b = Double(pixels[offset + 2]) / 255
            total += 0.2126 * r + 0.7152 * g + 0.0722 * b
        }

        return total / Double(pixelCount)
    }

    private static func boundingRectFromMask(_ mask: CVPixelBuffer) -> CGRect? {
        CVPixelBufferLockBaseAddress(mask, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(mask, .readOnly) }

        let width = CVPixelBufferGetWidth(mask)
        let height = CVPixelBufferGetHeight(mask)
        guard let base = CVPixelBufferGetBaseAddress(mask) else { return nil }

        let bytesPerRow = CVPixelBufferGetBytesPerRow(mask)
        let buffer = base.assumingMemoryBound(to: UInt8.self)

        var minX = width
        var minY = height
        var maxX = 0
        var maxY = 0
        var found = false

        for y in 0..<height {
            for x in 0..<width {
                if buffer[y * bytesPerRow + x] > 96 {
                    found = true
                    minX = min(minX, x)
                    minY = min(minY, y)
                    maxX = max(maxX, x)
                    maxY = max(maxY, y)
                }
            }
        }

        guard found else { return nil }

        return CGRect(
            x: CGFloat(minX) / CGFloat(width),
            y: CGFloat(minY) / CGFloat(height),
            width: CGFloat(maxX - minX) / CGFloat(width),
            height: CGFloat(maxY - minY) / CGFloat(height)
        )
    }

    // MARK: - Coverage

    private static func coverageLevel(
        pose: VNHumanBodyPoseObservation?,
        personBounds: CGRect?
    ) -> AnalysisCoverage {
        guard let pose else {
            return personBounds == nil ? .partial : .upperBody
        }

        let hasKnees = jointPoint(.leftKnee, in: pose) != nil || jointPoint(.rightKnee, in: pose) != nil
        let hasAnkles = jointPoint(.leftAnkle, in: pose) != nil || jointPoint(.rightAnkle, in: pose) != nil

        if hasKnees && hasAnkles {
            return .fullBody
        }
        if jointPoint(.leftShoulder, in: pose) != nil || jointPoint(.rightShoulder, in: pose) != nil {
            return .upperBody
        }
        return .partial
    }

    // MARK: - Regions

    private static func muscleRegions(
        for side: ProgressPhotoSide,
        pose: VNHumanBodyPoseObservation,
        coverage: AnalysisCoverage,
        personBounds: CGRect?
    ) -> [MuscleGroup: CGRect] {
        switch side {
        case .front:
            return frontRegions(from: pose, coverage: coverage, personBounds: personBounds)
        case .back:
            return backRegions(from: pose, coverage: coverage, personBounds: personBounds)
        }
    }

    private static func frontRegions(
        from pose: VNHumanBodyPoseObservation,
        coverage: AnalysisCoverage,
        personBounds: CGRect?
    ) -> [MuscleGroup: CGRect] {
        var regions: [MuscleGroup: CGRect] = [:]
        let torsoBottom = estimatedTorsoBottom(from: pose, personBounds: personBounds)

        if let chest = upperTorsoBox(from: pose, bottomY: torsoBottom, padX: 0.05, padY: 0.03) {
            regions[.chest] = chest
        }
        if let leftShoulder = box(from: pose, joints: [.leftShoulder, .neck, .leftElbow], padX: 0.06, padY: 0.05) {
            regions[.shoulders] = union(regions[.shoulders], leftShoulder)
        }
        if let rightShoulder = box(from: pose, joints: [.rightShoulder, .neck, .rightElbow], padX: 0.06, padY: 0.05) {
            regions[.shoulders] = union(regions[.shoulders], rightShoulder)
        }
        if let leftBicep = box(from: pose, joints: [.leftShoulder, .leftElbow], padX: 0.06, padY: 0.04) {
            regions[.biceps] = leftBicep
        }
        if let rightBicep = box(from: pose, joints: [.rightShoulder, .rightElbow], padX: 0.06, padY: 0.04) {
            regions[.biceps] = union(regions[.biceps], rightBicep)
        }
        if let leftTricep = box(from: pose, joints: [.leftShoulder, .leftElbow, .leftWrist], padX: 0.05, padY: 0.03) {
            regions[.triceps] = leftTricep
        }
        if let rightTricep = box(from: pose, joints: [.rightShoulder, .rightElbow, .rightWrist], padX: 0.05, padY: 0.03) {
            regions[.triceps] = union(regions[.triceps], rightTricep)
        }
        if let leftForearm = box(from: pose, joints: [.leftElbow, .leftWrist], padX: 0.05, padY: 0.04) {
            regions[.forearms] = leftForearm
        }
        if let rightForearm = box(from: pose, joints: [.rightElbow, .rightWrist], padX: 0.05, padY: 0.04) {
            regions[.forearms] = union(regions[.forearms], rightForearm)
        }
        if let abs = absBox(from: pose, torsoBottom: torsoBottom) {
            regions[.abs] = abs
        }

        guard coverage == .fullBody else { return regions }

        if let leftQuad = box(from: pose, joints: [.leftHip, .leftKnee], padX: 0.06, padY: 0.05) {
            regions[.quads] = leftQuad
        }
        if let rightQuad = box(from: pose, joints: [.rightHip, .rightKnee], padX: 0.06, padY: 0.05) {
            regions[.quads] = union(regions[.quads], rightQuad)
        }
        if let leftCalf = box(from: pose, joints: [.leftKnee, .leftAnkle], padX: 0.05, padY: 0.04) {
            regions[.calves] = leftCalf
        }
        if let rightCalf = box(from: pose, joints: [.rightKnee, .rightAnkle], padX: 0.05, padY: 0.04) {
            regions[.calves] = union(regions[.calves], rightCalf)
        }

        return regions
    }

    private static func backRegions(
        from pose: VNHumanBodyPoseObservation,
        coverage: AnalysisCoverage,
        personBounds: CGRect?
    ) -> [MuscleGroup: CGRect] {
        var regions: [MuscleGroup: CGRect] = [:]
        let torsoBottom = estimatedTorsoBottom(from: pose, personBounds: personBounds)

        if let traps = box(from: pose, joints: [.neck, .leftShoulder, .rightShoulder], padX: 0.04, padY: 0.06) {
            regions[.traps] = traps
        }
        if let back = upperTorsoBox(from: pose, bottomY: torsoBottom, padX: 0.06, padY: 0.04) {
            regions[.back] = back
        }
        if let leftTricep = box(from: pose, joints: [.leftShoulder, .leftElbow], padX: 0.06, padY: 0.04) {
            regions[.triceps] = leftTricep
        }
        if let rightTricep = box(from: pose, joints: [.rightShoulder, .rightElbow], padX: 0.06, padY: 0.04) {
            regions[.triceps] = union(regions[.triceps], rightTricep)
        }
        if let leftForearm = box(from: pose, joints: [.leftElbow, .leftWrist], padX: 0.05, padY: 0.04) {
            regions[.forearms] = leftForearm
        }
        if let rightForearm = box(from: pose, joints: [.rightElbow, .rightWrist], padX: 0.05, padY: 0.04) {
            regions[.forearms] = union(regions[.forearms], rightForearm)
        }

        guard coverage == .fullBody else { return regions }

        if let glutes = box(from: pose, joints: [.root, .leftHip, .rightHip], padX: 0.05, padY: 0.04) {
            regions[.glutes] = glutes
        }
        if let leftHam = box(from: pose, joints: [.leftHip, .leftKnee], padX: 0.06, padY: 0.05) {
            regions[.hamstrings] = leftHam
        }
        if let rightHam = box(from: pose, joints: [.rightHip, .rightKnee], padX: 0.06, padY: 0.05) {
            regions[.hamstrings] = union(regions[.hamstrings], rightHam)
        }
        if let leftCalf = box(from: pose, joints: [.leftKnee, .leftAnkle], padX: 0.05, padY: 0.04) {
            regions[.calves] = leftCalf
        }
        if let rightCalf = box(from: pose, joints: [.rightKnee, .rightAnkle], padX: 0.05, padY: 0.04) {
            regions[.calves] = union(regions[.calves], rightCalf)
        }

        return regions
    }

    private static func fallbackRegions(
        for side: ProgressPhotoSide,
        personBounds: CGRect,
        coverage: AnalysisCoverage
    ) -> [MuscleGroup: CGRect] {
        let x = personBounds.minX
        let y = personBounds.minY
        let w = personBounds.width
        let h = personBounds.height

        switch side {
        case .front:
            var regions: [MuscleGroup: CGRect] = [
                .shoulders: clamp(CGRect(x: x + w * 0.12, y: y + h * 0.12, width: w * 0.76, height: h * 0.12)),
                .chest: clamp(CGRect(x: x + w * 0.22, y: y + h * 0.22, width: w * 0.56, height: h * 0.14)),
                .abs: clamp(CGRect(x: x + w * 0.28, y: y + h * 0.36, width: w * 0.44, height: h * 0.16)),
                .biceps: clamp(CGRect(x: x + w * 0.02, y: y + h * 0.24, width: w * 0.18, height: h * 0.18)),
                .triceps: clamp(CGRect(x: x + w * 0.80, y: y + h * 0.24, width: w * 0.18, height: h * 0.18)),
                .forearms: clamp(CGRect(x: x + w * 0.0, y: y + h * 0.40, width: w * 0.20, height: h * 0.16)),
            ]
            if coverage == .fullBody {
                regions[.quads] = clamp(CGRect(x: x + w * 0.22, y: y + h * 0.52, width: w * 0.56, height: h * 0.24))
                regions[.calves] = clamp(CGRect(x: x + w * 0.24, y: y + h * 0.76, width: w * 0.52, height: h * 0.16))
            }
            return regions
        case .back:
            var regions: [MuscleGroup: CGRect] = [
                .traps: clamp(CGRect(x: x + w * 0.28, y: y + h * 0.10, width: w * 0.44, height: h * 0.10)),
                .back: clamp(CGRect(x: x + w * 0.22, y: y + h * 0.20, width: w * 0.56, height: h * 0.22)),
                .triceps: clamp(CGRect(x: x + w * 0.02, y: y + h * 0.22, width: w * 0.96, height: h * 0.18)),
                .forearms: clamp(CGRect(x: x + w * 0.0, y: y + h * 0.40, width: w * 0.20, height: h * 0.16)),
            ]
            if coverage == .fullBody {
                regions[.glutes] = clamp(CGRect(x: x + w * 0.26, y: y + h * 0.42, width: w * 0.48, height: h * 0.12))
                regions[.hamstrings] = clamp(CGRect(x: x + w * 0.22, y: y + h * 0.54, width: w * 0.56, height: h * 0.22))
                regions[.calves] = clamp(CGRect(x: x + w * 0.24, y: y + h * 0.76, width: w * 0.52, height: h * 0.16))
            }
            return regions
        }
    }

    private static func upperTorsoBox(
        from pose: VNHumanBodyPoseObservation,
        bottomY: CGFloat,
        padX: CGFloat,
        padY: CGFloat
    ) -> CGRect? {
        let points = [
            jointPoint(.leftShoulder, in: pose),
            jointPoint(.rightShoulder, in: pose),
            jointPoint(.neck, in: pose),
        ].compactMap { $0 }

        guard points.count >= 2 else { return nil }

        var rect = boundingRect(for: points)
        rect.size.height = max(rect.size.height, 0.08)
        rect.origin.y = min(rect.origin.y, bottomY - 0.18)
        rect.size.height = max(bottomY - rect.origin.y - 0.04, 0.08)
        rect = rect.insetBy(dx: -padX, dy: -padY)
        return clamp(rect)
    }

    private static func absBox(from pose: VNHumanBodyPoseObservation, torsoBottom: CGFloat) -> CGRect? {
        guard let left = jointPoint(.leftShoulder, in: pose),
              let right = jointPoint(.rightShoulder, in: pose) else { return nil }

        let top = min(left.y, right.y) + 0.12
        let bottom = max(top + 0.08, torsoBottom - 0.02)
        let minX = min(left.x, right.x) + 0.06
        let maxX = max(left.x, right.x) - 0.06

        return clamp(CGRect(x: minX, y: top, width: maxX - minX, height: bottom - top))
    }

    private static func estimatedTorsoBottom(
        from pose: VNHumanBodyPoseObservation,
        personBounds: CGRect?
    ) -> CGFloat {
        if let root = jointPoint(.root, in: pose) { return root.y }
        if let hip = jointPoint(.leftHip, in: pose) ?? jointPoint(.rightHip, in: pose) {
            return hip.y
        }
        if let personBounds {
            return personBounds.maxY - personBounds.height * 0.08
        }
        return 0.88
    }

    private static func box(
        from pose: VNHumanBodyPoseObservation,
        joints: [VNHumanBodyPoseObservation.JointName],
        padX: CGFloat,
        padY: CGFloat
    ) -> CGRect? {
        let points = joints.compactMap { jointPoint($0, in: pose) }
        guard points.count >= 2 else { return nil }

        var rect = boundingRect(for: points)
        rect = rect.insetBy(dx: -padX, dy: -padY)
        return clamp(rect)
    }

    private static func jointPoint(
        _ joint: VNHumanBodyPoseObservation.JointName,
        in pose: VNHumanBodyPoseObservation
    ) -> CGPoint? {
        guard let recognized = try? pose.recognizedPoint(joint),
              recognized.confidence > 0.08 else { return nil }
        return CGPoint(x: recognized.location.x, y: 1 - recognized.location.y)
    }

    private static func boundingRect(for points: [CGPoint]) -> CGRect {
        let xs = points.map(\.x)
        let ys = points.map(\.y)
        let minX = xs.min() ?? 0
        let maxX = xs.max() ?? 0
        let minY = ys.min() ?? 0
        let maxY = ys.max() ?? 0
        return CGRect(x: minX, y: minY, width: max(maxX - minX, 0.04), height: max(maxY - minY, 0.04))
    }

    private static func union(_ lhs: CGRect?, _ rhs: CGRect) -> CGRect {
        guard let lhs else { return rhs }
        return lhs.union(rhs)
    }

    private static func clamp(_ rect: CGRect) -> CGRect {
        CGRect(
            x: max(0, rect.minX),
            y: max(0, rect.minY),
            width: min(1, rect.maxX) - max(0, rect.minX),
            height: min(1, rect.maxY) - max(0, rect.minY)
        )
    }

    // MARK: - Image prep

    private static func prepare(_ image: UIImage) -> (cgImage: CGImage, size: CGSize)? {
        let normalized = fixOrientation(image)
        let resized = resize(normalized, maxWidth: 1080)
        guard let cgImage = resized.cgImage else { return nil }
        return (cgImage, CGSize(width: cgImage.width, height: cgImage.height))
    }

    private static func fixOrientation(_ image: UIImage) -> UIImage {
        guard image.imageOrientation != .up else { return image }

        let format = UIGraphicsImageRendererFormat()
        format.scale = image.scale
        let renderer = UIGraphicsImageRenderer(size: image.size, format: format)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: image.size))
        }
    }

    private static func resize(_ image: UIImage, maxWidth: CGFloat) -> UIImage {
        guard image.size.width > maxWidth else { return image }
        let scale = maxWidth / image.size.width
        let newSize = CGSize(width: maxWidth, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
}
