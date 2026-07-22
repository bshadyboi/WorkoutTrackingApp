import SwiftUI
import SwiftData

struct DexaScanView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \DexaScanLog.scannedAt, order: .reverse) private var scans: [DexaScanLog]

    let health: HealthKitManager

    @State private var showAdd = false
    @State private var showImport = false
    @State private var weight = ""
    @State private var bodyFat = ""
    @State private var leanMass = ""
    @State private var fatMass = ""
    @State private var boneMass = ""
    @State private var visceral = ""
    @State private var notes = ""
    @State private var isImporting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                PremiumLabel(text: "DEXA & Body Comp")
                Spacer()
                Menu {
                    Button("Import PDF / Photo") { showImport = true }
                    Button("Enter Manually") { showAdd = true }
                } label: {
                    Text("Add Scan")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(AppTheme.gold)
                }
            }

            DashboardCard {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Import your DEXA report PDF or a photo of the printout — FitTrack reads body fat, lean mass, and fat mass automatically.")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                        .lineSpacing(3)

                    PremiumButton(title: "Import DEXA Report", icon: "doc.viewfinder") {
                        showImport = true
                    }

                    PremiumButton(title: "Import from Apple Health", icon: "heart.text.square", style: .outline) {
                        importFromHealth()
                    }
                    .disabled(!health.isAuthorized || isImporting)
                    .opacity(health.isAuthorized ? 1 : 0.5)
                }
            }

            if let latest = scans.first {
                DashboardCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Latest Scan")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(AppTheme.textPrimary)
                        Text(latest.scannedAt.formatted(.dateTime.month(.abbreviated).day().year()))
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        HStack(spacing: 16) {
                            compStat("Body Fat", value: String(format: "%.1f%%", latest.bodyFatPercent))
                            compStat("Lean", value: String(format: "%.0f lb", latest.leanMassLbs))
                            compStat("Fat", value: String(format: "%.0f lb", latest.fatMassLbs))
                        }
                        Text("Source: \(sourceLabel(latest.source))")
                            .font(.caption2)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
        }
        .sheet(isPresented: $showAdd) { addScanSheet }
        .sheet(isPresented: $showImport) {
            DexaDocumentImportView { parsed, rawText in
                applyParsedScan(parsed, rawText: rawText, source: "dexa_import")
            }
        }
    }

    private func sourceLabel(_ source: String) -> String {
        switch source {
        case "dexa_import": return "Imported report"
        case "healthkit": return "Apple Health"
        case "dexa_manual": return "Manual entry"
        default: return source.capitalized
        }
    }

    private func compStat(_ label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(.system(size: 8, weight: .medium))
                .tracking(1)
                .foregroundStyle(AppTheme.textSecondary)
            Text(value)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.gold)
        }
    }

    private var addScanSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    dexaField("Total weight (lb)", text: $weight)
                    dexaField("Body fat (%)", text: $bodyFat)
                    dexaField("Lean mass (lb)", text: $leanMass)
                    dexaField("Fat mass (lb)", text: $fatMass)
                    dexaField("Bone mass (lb)", text: $boneMass)
                    dexaField("Visceral fat score", text: $visceral)
                    dexaField("Notes", text: $notes)
                    PremiumButton(title: "Save DEXA Scan", icon: "checkmark") { saveManualScan() }
                }
                .padding(24)
            }
            .background(AppTheme.background)
            .navigationTitle("DEXA Scan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { showAdd = false }.foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func dexaField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            PremiumLabel(text: label)
            TextField(label, text: text)
                .keyboardType(.decimalPad)
                .padding(14)
                .background(AppTheme.inputBackground)
                .foregroundStyle(AppTheme.textPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private func applyParsedScan(_ parsed: ParsedDexaReport, rawText: String, source: String) {
        let scan = DexaScanLog(
            totalWeightLbs: parsed.totalWeightLbs ?? 0,
            bodyFatPercent: parsed.bodyFatPercent ?? 0,
            leanMassLbs: parsed.leanMassLbs ?? 0,
            fatMassLbs: parsed.fatMassLbs ?? 0,
            boneMassLbs: parsed.boneMassLbs ?? 0,
            visceralFatScore: parsed.visceralFatScore ?? 0,
            source: source,
            notes: String(rawText.prefix(500))
        )
        modelContext.insert(scan)
        try? modelContext.save()
    }

    private func saveManualScan() {
        let scan = DexaScanLog(
            totalWeightLbs: Double(weight) ?? 0,
            bodyFatPercent: Double(bodyFat) ?? 0,
            leanMassLbs: Double(leanMass) ?? 0,
            fatMassLbs: Double(fatMass) ?? 0,
            boneMassLbs: Double(boneMass) ?? 0,
            visceralFatScore: Double(visceral) ?? 0,
            source: "dexa_manual",
            notes: notes
        )
        modelContext.insert(scan)
        try? modelContext.save()
        clearForm()
        showAdd = false
    }

    private func importFromHealth() {
        isImporting = true
        Task {
            await health.refreshBodyComposition()
            if health.bodyFatPercent > 0 || health.leanMassLbs > 0 {
                let scan = DexaScanLog(
                    totalWeightLbs: health.bodyMassLbs,
                    bodyFatPercent: health.bodyFatPercent,
                    leanMassLbs: health.leanMassLbs,
                    fatMassLbs: max(health.bodyMassLbs - health.leanMassLbs, 0),
                    source: "healthkit",
                    notes: "Imported from Apple Health"
                )
                modelContext.insert(scan)
                try? modelContext.save()
            }
            isImporting = false
        }
    }

    private func clearForm() {
        weight = ""
        bodyFat = ""
        leanMass = ""
        fatMass = ""
        boneMass = ""
        visceral = ""
        notes = ""
    }
}
