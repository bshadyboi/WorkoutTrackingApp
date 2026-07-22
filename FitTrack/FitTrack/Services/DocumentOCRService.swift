import Foundation
import UIKit
import Vision
import PDFKit

enum DocumentOCRService {
    static func recognizeText(in image: UIImage) async -> String {
        guard let cgImage = image.cgImage else { return "" }
        return await withCheckedContinuation { continuation in
            let request = VNRecognizeTextRequest { request, _ in
                let lines = (request.results as? [VNRecognizedTextObservation])?
                    .compactMap { $0.topCandidates(1).first?.string }
                    ?? []
                continuation.resume(returning: lines.joined(separator: "\n"))
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            request.recognitionLanguages = ["en-US"]

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            try? handler.perform([request])
        }
    }

    static func extractText(from url: URL) async -> String {
        if url.pathExtension.lowercased() == "pdf" {
            return await extractTextFromPDF(url)
        }
        if let image = UIImage(contentsOfFile: url.path) {
            return await recognizeText(in: image)
        }
        return ""
    }

    static func extractTextFromPDF(_ url: URL) async -> String {
        guard let document = PDFDocument(url: url) else { return "" }
        var combined = ""

        for index in 0..<document.pageCount {
            guard let page = document.page(at: index) else { continue }
            if let pageText = page.string, !pageText.isEmpty {
                combined += pageText + "\n"
            } else {
                let size = page.bounds(for: .mediaBox).size
                let scale: CGFloat = 2.0
                let image = page.thumbnail(of: CGSize(width: size.width * scale, height: size.height * scale), for: .mediaBox)
                combined += await recognizeText(in: image) + "\n"
            }
        }
        return combined
    }

    static func extractText(from image: UIImage) async -> String {
        await recognizeText(in: image)
    }
}

struct ParsedDexaReport {
    var totalWeightLbs: Double?
    var bodyFatPercent: Double?
    var leanMassLbs: Double?
    var fatMassLbs: Double?
    var boneMassLbs: Double?
    var visceralFatScore: Double?

    var isValid: Bool {
        bodyFatPercent != nil || leanMassLbs != nil || fatMassLbs != nil
    }
}

enum DexaReportParser {
    static func parse(_ text: String) -> ParsedDexaReport {
        let normalized = text
            .replacingOccurrences(of: "\u{00A0}", with: " ")
            .replacingOccurrences(of: "％", with: "%")

        var result = ParsedDexaReport()
        result.bodyFatPercent = firstMatch(in: normalized, patterns: [
            #"(?i)(?:percent\s*)?body\s*fat[^0-9]{0,20}(\d{1,2}(?:\.\d+)?)\s*%"#,
            #"(?i)body\s*fat\s*%[^0-9]{0,10}(\d{1,2}(?:\.\d+)?)"#,
            #"(?i)bf[^0-9]{0,10}(\d{1,2}(?:\.\d+)?)\s*%"#,
        ])
        result.leanMassLbs = firstMatch(in: normalized, patterns: [
            #"(?i)lean\s*(?:body\s*)?mass[^0-9]{0,20}(\d{2,3}(?:\.\d+)?)\s*(?:lb|lbs|pounds)"#,
            #"(?i)lean\s*(?:tissue|mass)[^0-9]{0,20}(\d{2,3}(?:\.\d+)?)"#,
        ])
        result.fatMassLbs = firstMatch(in: normalized, patterns: [
            #"(?i)fat\s*mass[^0-9]{0,20}(\d{1,3}(?:\.\d+)?)\s*(?:lb|lbs|pounds)"#,
            #"(?i)total\s*fat[^0-9]{0,20}(\d{1,3}(?:\.\d+)?)\s*(?:lb|lbs)"#,
        ])
        result.totalWeightLbs = firstMatch(in: normalized, patterns: [
            #"(?i)(?:total\s*)?(?:body\s*)?weight[^0-9]{0,20}(\d{2,3}(?:\.\d+)?)\s*(?:lb|lbs|pounds)"#,
            #"(?i)total\s*mass[^0-9]{0,20}(\d{2,3}(?:\.\d+)?)\s*(?:lb|lbs)"#,
        ])
        result.boneMassLbs = firstMatch(in: normalized, patterns: [
            #"(?i)(?:bone\s*(?:mineral\s*)?content|bmc)[^0-9]{0,20}(\d{1,2}(?:\.\d+)?)\s*(?:lb|lbs)"#,
        ])
        result.visceralFatScore = firstMatch(in: normalized, patterns: [
            #"(?i)visceral\s*fat[^0-9]{0,20}(\d{1,2}(?:\.\d+)?)"#,
        ])

        if result.totalWeightLbs == nil, let lean = result.leanMassLbs, let fat = result.fatMassLbs {
            result.totalWeightLbs = lean + fat + (result.boneMassLbs ?? 0)
        }
        return result
    }

    private static func firstMatch(in text: String, patterns: [String]) -> Double? {
        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern),
                  let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
                  match.numberOfRanges > 1,
                  let range = Range(match.range(at: 1), in: text),
                  let value = Double(text[range]), value > 0 else { continue }
            return value
        }
        return nil
    }
}

struct ParsedNutritionLabel {
    var name: String
    var calories: Int?
    var proteinG: Int?
    var carbsG: Int?
    var fatG: Int?
    var servingText: String?

    var isValid: Bool {
        calories != nil || proteinG != nil || carbsG != nil || fatG != nil
    }
}

enum NutritionLabelParser {
    static func parse(_ text: String, fallbackName: String = "Scanned Meal") -> ParsedNutritionLabel {
        let normalized = text.replacingOccurrences(of: "\u{00A0}", with: " ")
        var result = ParsedNutritionLabel(name: fallbackName)

        result.calories = firstInt(in: normalized, patterns: [
            #"(?i)calories[^0-9]{0,10}(\d{2,4})"#,
            #"(?i)energy[^0-9]{0,10}(\d{2,4})\s*kcal"#,
        ])
        result.proteinG = firstInt(in: normalized, patterns: [
            #"(?i)protein[^0-9]{0,10}(\d{1,3})\s*g"#,
        ])
        result.carbsG = firstInt(in: normalized, patterns: [
            #"(?i)(?:total\s*)?carbohydrate[^0-9]{0,10}(\d{1,3})\s*g"#,
            #"(?i)carbs[^0-9]{0,10}(\d{1,3})\s*g"#,
        ])
        result.fatG = firstInt(in: normalized, patterns: [
            #"(?i)total\s*fat[^0-9]{0,10}(\d{1,3})\s*g"#,
        ])
        if let serving = firstString(in: normalized, patterns: [
            #"(?i)serving\s*size[^A-Za-z0-9]{0,5}(.{3,40})"#,
        ]) {
            result.servingText = serving.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        if let best = LocalFoodCatalog.matchFromText(normalized).first {
            result.name = best.name
        }
        return result
    }

    static func foodItems(from text: String) -> [FoodItem] {
        LocalFoodCatalog.matchFromText(text)
    }

    private static func firstInt(in text: String, patterns: [String]) -> Int? {
        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern),
                  let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
                  match.numberOfRanges > 1,
                  let range = Range(match.range(at: 1), in: text),
                  let value = Int(text[range]) else { continue }
            return value
        }
        return nil
    }

    private static func firstString(in text: String, patterns: [String]) -> String? {
        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern),
                  let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
                  match.numberOfRanges > 1,
                  let range = Range(match.range(at: 1), in: text) else { continue }
            return String(text[range])
        }
        return nil
    }
}
