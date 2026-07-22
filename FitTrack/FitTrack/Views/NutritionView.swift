import SwiftUI
import SwiftData
import UIKit

struct NutritionView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var settings: AppSettings
    var health: HealthKitManager

    @Query(sort: \NutritionEntry.loggedAt, order: .reverse) private var entries: [NutritionEntry]

    @State private var selectedDay: Date = Calendar.current.startOfDay(for: .now)
    @State private var dayWindowStart: Date = Calendar.current.date(
        byAdding: .day, value: -3, to: Calendar.current.startOfDay(for: .now)
    ) ?? .now
    @State private var waterUnit = 0 // 0 oz, 1 mL, 2 L
    @State private var showManualLog = false
    @State private var showFoodSearch = false
    @State private var showBarcodeScanner = false
    @State private var showMealPhotoScan = false
    @State private var showGoals = false
    @State private var showCopyDay = false
    @State private var searchQuery = ""
    @State private var searchResults: [FoodItem] = []
    @State private var isSearching = false
    @State private var searchError = ""
    @State private var selectedFood: FoodItem?
    @State private var servingGrams = ""
    @State private var relogFlash: String?

    private var dayTotals: (calories: Int, protein: Int, carbs: Int, fat: Int) {
        let dayEntries = entriesForDay(selectedDay)
        return (
            dayEntries.reduce(0) { $0 + $1.calories },
            dayEntries.reduce(0) { $0 + $1.proteinG },
            dayEntries.reduce(0) { $0 + $1.carbsG },
            dayEntries.reduce(0) { $0 + $1.fatG }
        )
    }

    private var dayEntries: [NutritionEntry] {
        entriesForDay(selectedDay).sorted { $0.loggedAt < $1.loggedAt }
    }

    private var waterLog: DailyWaterLog {
        DailyTracker.waterLog(context: modelContext, goalOz: settings.waterGoalOz, for: selectedDay)
    }

    private var caloriesLeft: Int {
        max(0, settings.calorieGoal - dayTotals.calories)
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 16) {
                headerRow
                dayStrip
                macrosCard
                waterAndStepsRow
                actionButtons
                quickLogSection
                mealSections
            }
            .padding(.horizontal, 16)
            .padding(.top, 4)
            .padding(.bottom, 28)
        }
        .background(Color.black)
        .sheet(isPresented: $showManualLog) { ManualMealLogView(targetDay: selectedDay) }
        .sheet(isPresented: $showGoals) { nutritionGoalsSheet }
        .sheet(isPresented: $showCopyDay) { copyDaySheet }
        .sheet(isPresented: $showBarcodeScanner) {
            BarcodeScannerView { code in
                Task { await lookupBarcode(code) }
            }
        }
        .sheet(isPresented: $showMealPhotoScan) {
            MealPhotoScanView { food in
                selectedFood = food
                servingGrams = String(Int(food.defaultServingGrams))
            }
        }
        .sheet(isPresented: $showFoodSearch) { foodSearchSheet }
        .sheet(item: $selectedFood) { food in
            foodServingSheet(food)
        }
    }

    // MARK: - Header / day strip

    private var headerRow: some View {
        HStack {
            Text(Calendar.current.isDateInToday(selectedDay) ? "Today" : selectedDay.formatted(.dateTime.month(.abbreviated).day()))
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(.white)
            Spacer()
            Button { showGoals = true } label: {
                Text("📅")
                    .font(.system(size: 16))
                    .frame(width: 36, height: 36)
                    .background(Color(white: 0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            .buttonStyle(.plain)
        }
    }

    private var dayStrip: some View {
        let cal = Calendar.current
        let days = (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: dayWindowStart) }

        return HStack(spacing: 6) {
            Button {
                dayWindowStart = cal.date(byAdding: .day, value: -7, to: dayWindowStart) ?? dayWindowStart
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(Color(white: 0.16))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            ForEach(days, id: \.self) { day in
                let selected = cal.isDate(day, inSameDayAs: selectedDay)
                let hasLog = !entriesForDay(day).isEmpty
                Button {
                    selectedDay = cal.startOfDay(for: day)
                } label: {
                    VStack(spacing: 4) {
                        Text(day.formatted(.dateTime.weekday(.narrow)))
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(Color(white: 0.45))
                        Text("\(cal.component(.day, from: day))")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                        if hasLog {
                            Image(systemName: "checkmark")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(EAColor.green)
                        } else {
                            Spacer().frame(height: 9)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color(white: 0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(selected ? EAColor.blue : Color.clear, lineWidth: 1.5)
                    )
                }
                .buttonStyle(.plain)
            }

            Button {
                dayWindowStart = cal.date(byAdding: .day, value: 7, to: dayWindowStart) ?? dayWindowStart
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(Color(white: 0.16))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Macros

    private var macrosCard: some View {
        VStack(spacing: 14) {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                macroBlock(label: "Calories", value: dayTotals.calories, goal: settings.calorieGoal, unit: "")
                macroBlock(label: "Protein", value: dayTotals.protein, goal: settings.proteinGoalG, unit: "g")
                macroBlock(label: "Carbs", value: dayTotals.carbs, goal: settings.carbsGoalG, unit: "g")
                macroBlock(label: "Fat", value: dayTotals.fat, goal: settings.fatGoalG, unit: "g")
            }

            Button { showGoals = true } label: {
                Text("\(caloriesLeft) cal left today · full breakdown ›")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(EAColor.blue)
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func macroBlock(label: String, value: Int, goal: Int, unit: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("\(value) / \(goal)\(unit)")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(Color(white: 0.5))
            PremiumProgressBar(value: progress(value, goal: goal), height: 5, tint: EAColor.green)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Water / Steps

    private var waterAndStepsRow: some View {
        HStack(alignment: .top, spacing: 10) {
            waterCard
            stepsCard
        }
    }

    private var waterCard: some View {
        let displayAmount: String = {
            switch waterUnit {
            case 1: return "\(Int(Double(waterLog.ounces) * 29.5735)) / \(Int(Double(waterLog.goalOz) * 29.5735)) mL"
            case 2: return String(format: "%.1f / %.1f L", Double(waterLog.ounces) * 0.0295735, Double(waterLog.goalOz) * 0.0295735)
            default: return "\(waterLog.ounces) / \(waterLog.goalOz) oz"
            }
        }()

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("💧 Water")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                HStack(spacing: 2) {
                    ForEach([("oz", 0), ("mL", 1), ("L", 2)], id: \.1) { label, idx in
                        Button(label) { waterUnit = idx }
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(waterUnit == idx ? EAColor.blue : Color(white: 0.5))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 4)
                            .background(waterUnit == idx ? Color(white: 0.18) : Color.clear)
                            .clipShape(Capsule())
                    }
                }
            }

            Text("\(displayAmount) · \(Int(waterLog.progress * 100))%")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.white)

            PremiumProgressBar(value: waterLog.progress, height: 7, tint: EAColor.green)

            HStack(spacing: 6) {
                waterChip("+8") { adjustWater(by: 8) }
                waterChip("+16") { adjustWater(by: 16) }
                waterChip("reset") { resetWater() }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var stepsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("🚶 Steps")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                Button {
                    Task { await health.refresh() }
                } label: {
                    Text("+ log")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(EAColor.blue)
                }
                .buttonStyle(.plain)
            }

            Text(health.stepsToday > 0 ? health.stepsToday.formatted() : "—")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func waterChip(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(title == "reset" ? EAColor.blue : .white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(Color(white: 0.14))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Actions / meals

    private var actionButtons: some View {
        HStack(spacing: 10) {
            Button { showMealPhotoScan = true } label: {
                Label("Snap a meal", systemImage: "camera.fill")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(EAColor.blue)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)

            Button { showBarcodeScanner = true } label: {
                Label("Scan", systemImage: "barcode.viewfinder")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(EAColor.blue)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
        }
    }

    private var quickLogSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Quick log")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                if let flash = relogFlash {
                    Text(flash)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(EAColor.green)
                        .transition(.opacity)
                }
                Button {
                    showCopyDay = true
                } label: {
                    Text("Copy day")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(EAColor.blue)
                }
                .buttonStyle(.plain)
            }

            if let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: selectedDay),
               !entriesForDay(yesterday).isEmpty {
                Button {
                    copyMeals(from: yesterday, to: selectedDay)
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "doc.on.doc")
                            .font(.system(size: 12, weight: .semibold))
                        Text("Copy \(dayLabel(yesterday)) · \(entriesForDay(yesterday).count) meals")
                            .font(.system(size: 13, weight: .semibold))
                        Spacer()
                        Text("+\(entriesForDay(yesterday).reduce(0) { $0 + $1.calories }) cal")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Color(white: 0.55))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(EAColor.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            if !settings.favoriteMeals.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(settings.favoriteMeals) { meal in
                            Button {
                                logFavorite(meal)
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "star.fill")
                                            .font(.system(size: 10))
                                            .foregroundStyle(EAColor.green)
                                        Text(meal.name)
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundStyle(.white)
                                            .lineLimit(1)
                                    }
                                    Text("\(meal.calories) cal · \(meal.proteinG)P")
                                        .font(.system(size: 11))
                                        .foregroundStyle(Color(white: 0.5))
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .frame(minWidth: 120, alignment: .leading)
                                .background(Color(white: 0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .stroke(EAColor.green.opacity(0.35), lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                            .contextMenu {
                                Button(role: .destructive) {
                                    settings.removeFavoriteMeal(named: meal.name)
                                    try? modelContext.save()
                                } label: {
                                    Label("Remove favorite", systemImage: "star.slash")
                                }
                            }
                        }
                    }
                }
            }

            if recentMeals.isEmpty && settings.favoriteMeals.isEmpty {
                Text("Log a meal once — it’ll show up here for one-tap re-log. Star meals to pin favorites.")
                    .font(.caption)
                    .foregroundStyle(Color(white: 0.45))
            } else if !recentMeals.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(recentMeals, id: \.id) { meal in
                            Button {
                                relogMeal(meal)
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(meal.mealName)
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .lineLimit(1)
                                    Text("\(meal.calories) cal · \(meal.proteinG)P")
                                        .font(.system(size: 11))
                                        .foregroundStyle(Color(white: 0.5))
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .frame(minWidth: 120, alignment: .leading)
                                .background(Color(white: 0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                            .contextMenu {
                                Button {
                                    settings.addFavoriteMeal(FavoriteMeal(
                                        name: meal.mealName,
                                        calories: meal.calories,
                                        proteinG: meal.proteinG,
                                        carbsG: meal.carbsG,
                                        fatG: meal.fatG,
                                        serving: meal.servingDescription
                                    ))
                                    try? modelContext.save()
                                    withAnimation { relogFlash = "★ \(meal.mealName)" }
                                    Task {
                                        try? await Task.sleep(for: .seconds(1.2))
                                        withAnimation { relogFlash = nil }
                                    }
                                } label: {
                                    Label("Add favorite", systemImage: "star")
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private var mealSections: some View {
        let grouped = Dictionary(grouping: dayEntries) { MealSlot.slot(for: $0.loggedAt) }
        let order: [MealSlot] = [.breakfast, .lunch, .dinner, .snacks]

        return VStack(alignment: .leading, spacing: 16) {
            HStack {
                Button("Search foods") { showFoodSearch = true }
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(EAColor.blue)
                Spacer()
                Button("Manual entry") { showManualLog = true }
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color(white: 0.55))
            }

            if dayEntries.isEmpty {
                Text("No meals logged for this day yet.")
                    .font(.caption)
                    .foregroundStyle(Color(white: 0.45))
                    .padding(.vertical, 8)
            } else {
                ForEach(order, id: \.self) { slot in
                    if let items = grouped[slot], !items.isEmpty {
                        let cals = items.reduce(0) { $0 + $1.calories }
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(slot.title)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(.white)
                                Spacer()
                                Text("\(cals) cal")
                                    .font(.system(size: 13))
                                    .foregroundStyle(Color(white: 0.5))
                            }
                            ForEach(items) { entry in
                                mealRow(entry)
                            }
                        }
                    }
                }
            }
        }
    }

    private func mealRow(_ entry: NutritionEntry) -> some View {
        let isFavorite = settings.isFavoriteMeal(named: entry.mealName)
        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.mealName)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                Text("\(entry.calories) cal · \(entry.proteinG)P \(entry.carbsG)C \(entry.fatG)F")
                    .font(.system(size: 12))
                    .foregroundStyle(Color(white: 0.5))
            }
            Spacer(minLength: 0)
            Button {
                if isFavorite {
                    settings.removeFavoriteMeal(named: entry.mealName)
                } else {
                    settings.addFavoriteMeal(FavoriteMeal(from: entry))
                }
                try? modelContext.save()
            } label: {
                Image(systemName: isFavorite ? "star.fill" : "star")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(isFavorite ? EAColor.green : Color(white: 0.45))
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
            Button {
                modelContext.delete(entry)
                try? modelContext.save()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(Color(red: 0.75, green: 0.2, blue: 0.2))
                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .background(EAColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    // MARK: - Helpers

    private struct RecentMeal: Identifiable {
        let id: String
        let mealName: String
        let calories: Int
        let proteinG: Int
        let carbsG: Int
        let fatG: Int
        let servingDescription: String
        let barcode: String
        let notes: String
        let originalHour: Int
        let originalMinute: Int
    }

    private var recentMeals: [RecentMeal] {
        var seen = Set<String>()
        var result: [RecentMeal] = []
        let cal = Calendar.current
        for entry in entries {
            let key = "\(entry.mealName.lowercased())|\(entry.calories)|\(entry.proteinG)|\(entry.carbsG)|\(entry.fatG)|\(entry.servingDescription)"
            guard seen.insert(key).inserted else { continue }
            result.append(RecentMeal(
                id: key,
                mealName: entry.mealName,
                calories: entry.calories,
                proteinG: entry.proteinG,
                carbsG: entry.carbsG,
                fatG: entry.fatG,
                servingDescription: entry.servingDescription,
                barcode: entry.barcode,
                notes: entry.notes,
                originalHour: cal.component(.hour, from: entry.loggedAt),
                originalMinute: cal.component(.minute, from: entry.loggedAt)
            ))
            if result.count >= 16 { break }
        }
        return result
    }

    private var daysAvailableToCopy: [Date] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: .now)
        var days: [Date] = []
        for offset in 1...21 {
            guard let day = cal.date(byAdding: .day, value: -offset, to: today) else { continue }
            if cal.isDate(day, inSameDayAs: selectedDay) { continue }
            if !entriesForDay(day).isEmpty {
                days.append(day)
            }
        }
        return days
    }

    private enum MealSlot: Hashable {
        case breakfast, lunch, dinner, snacks

        var title: String {
            switch self {
            case .breakfast: return "🍳 Breakfast"
            case .lunch: return "🥗 Lunch"
            case .dinner: return "🍽️ Dinner"
            case .snacks: return "🍎 Snacks"
            }
        }

        static func slot(for date: Date) -> MealSlot {
            switch Calendar.current.component(.hour, from: date) {
            case 5..<11: return .breakfast
            case 11..<15: return .lunch
            case 15..<21: return .dinner
            default: return .snacks
            }
        }
    }

    private func entriesForDay(_ date: Date) -> [NutritionEntry] {
        entries.filter { Calendar.current.isDate($0.loggedAt, inSameDayAs: date) }
    }

    private func dayLabel(_ date: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInYesterday(date) { return "yesterday" }
        if cal.isDateInToday(date) { return "today" }
        return date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
    }

    private func timestamp(on day: Date, hour: Int, minute: Int) -> Date {
        let cal = Calendar.current
        let start = cal.startOfDay(for: day)
        return cal.date(bySettingHour: hour, minute: minute, second: 0, of: start) ?? start.addingTimeInterval(12 * 3600)
    }

    private func logFavorite(_ meal: FavoriteMeal) {
        let cal = Calendar.current
        let loggedAt = cal.isDateInToday(selectedDay)
            ? Date.now
            : timestamp(on: selectedDay, hour: 12, minute: 0)
        modelContext.insert(NutritionEntry(
            loggedAt: loggedAt,
            mealName: meal.name,
            calories: meal.calories,
            proteinG: meal.proteinG,
            carbsG: meal.carbsG,
            fatG: meal.fatG,
            servingDescription: meal.serving
        ))
        try? modelContext.save()
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        withAnimation { relogFlash = "+\(meal.name)" }
        Task {
            try? await Task.sleep(for: .seconds(1.4))
            withAnimation { relogFlash = nil }
        }
    }

    private func relogMeal(_ meal: RecentMeal) {
        let cal = Calendar.current
        let isToday = cal.isDateInToday(selectedDay)
        let loggedAt: Date
        if isToday {
            loggedAt = .now
        } else {
            loggedAt = timestamp(on: selectedDay, hour: meal.originalHour, minute: meal.originalMinute)
        }
        modelContext.insert(NutritionEntry(
            loggedAt: loggedAt,
            mealName: meal.mealName,
            calories: meal.calories,
            proteinG: meal.proteinG,
            carbsG: meal.carbsG,
            fatG: meal.fatG,
            notes: meal.notes,
            barcode: meal.barcode,
            servingDescription: meal.servingDescription
        ))
        try? modelContext.save()
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        withAnimation {
            relogFlash = "+\(meal.mealName)"
        }
        Task {
            try? await Task.sleep(for: .seconds(1.4))
            withAnimation { relogFlash = nil }
        }
    }

    private func copyMeals(from source: Date, to target: Date) {
        let sourceEntries = entriesForDay(source)
        guard !sourceEntries.isEmpty else { return }
        let cal = Calendar.current
        for entry in sourceEntries {
            let hour = cal.component(.hour, from: entry.loggedAt)
            let minute = cal.component(.minute, from: entry.loggedAt)
            modelContext.insert(NutritionEntry(
                loggedAt: timestamp(on: target, hour: hour, minute: minute),
                mealName: entry.mealName,
                calories: entry.calories,
                proteinG: entry.proteinG,
                carbsG: entry.carbsG,
                fatG: entry.fatG,
                notes: entry.notes,
                barcode: entry.barcode,
                servingDescription: entry.servingDescription
            ))
        }
        try? modelContext.save()
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        withAnimation {
            relogFlash = "Copied \(sourceEntries.count)"
        }
        Task {
            try? await Task.sleep(for: .seconds(1.6))
            withAnimation { relogFlash = nil }
        }
    }

    private var copyDaySheet: some View {
        NavigationStack {
            Group {
                if daysAvailableToCopy.isEmpty {
                    ContentUnavailableView(
                        "No past days",
                        systemImage: "calendar",
                        description: Text("Log meals on another day first, then copy them here.")
                    )
                } else {
                    List {
                        Section {
                            ForEach(daysAvailableToCopy, id: \.self) { day in
                                let meals = entriesForDay(day)
                                let cals = meals.reduce(0) { $0 + $1.calories }
                                Button {
                                    copyMeals(from: day, to: selectedDay)
                                    showCopyDay = false
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(day.formatted(.dateTime.weekday(.wide).month(.abbreviated).day()))
                                                .font(.system(size: 16, weight: .semibold))
                                                .foregroundStyle(.white)
                                            Text("\(meals.count) meals · \(cals) cal")
                                                .font(.caption)
                                                .foregroundStyle(Color(white: 0.5))
                                        }
                                        Spacer()
                                        Image(systemName: "plus.circle.fill")
                                            .foregroundStyle(EAColor.blue)
                                    }
                                }
                                .listRowBackground(EAColor.card)
                            }
                        } header: {
                            Text("Copy into \(dayLabel(selectedDay))")
                        } footer: {
                            Text("Duplicates the full day’s meals onto the day you’re viewing. Meal times are preserved.")
                                .font(.caption2)
                        }
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .background(Color.black)
            .navigationTitle("Copy Day")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { showCopyDay = false }
                        .foregroundStyle(Color(white: 0.55))
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func progress(_ current: Int, goal: Int) -> Double {
        guard goal > 0 else { return 0 }
        return min(Double(current) / Double(goal), 1.0)
    }

    private func adjustWater(by amount: Int) {
        waterLog.ounces = max(0, waterLog.ounces + amount)
        try? modelContext.save()
    }

    private func resetWater() {
        waterLog.ounces = 0
        try? modelContext.save()
    }

    // MARK: - Sheets (unchanged flow)

    private var foodSearchSheet: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(AppTheme.textSecondary)
                    TextField("Search foods...", text: $searchQuery)
                        .foregroundStyle(AppTheme.textPrimary)
                        .submitLabel(.search)
                        .onSubmit { Task { await runSearch() } }
                }
                .padding(14)
                .background(AppTheme.inputBackground)
                .padding(16)

                if isSearching {
                    ProgressView().tint(AppTheme.gold).padding()
                } else if !searchError.isEmpty {
                    Text(searchError).font(.caption).foregroundStyle(AppTheme.textSecondary).padding()
                }

                List(searchResults) { food in
                    Button {
                        selectedFood = food
                        servingGrams = String(Int(food.defaultServingGrams))
                        showFoodSearch = false
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(food.name)
                                .foregroundStyle(AppTheme.textPrimary)
                            if food.isSingleServing {
                                Text("\(food.brand) · \(food.servingLabel) · \(food.caloriesPer100g) kcal")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            } else {
                                Text("\(food.brand) · \(food.caloriesPer100g) kcal/100g")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                    }
                    .listRowBackground(AppTheme.card)
                }
                .scrollContentBackground(.hidden)
            }
            .background(AppTheme.background)
            .navigationTitle("Food Database")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Search") { Task { await runSearch() } }
                        .foregroundStyle(AppTheme.gold)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { showFoodSearch = false }
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func foodServingSheet(_ food: FoodItem) -> some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                Text(food.name)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text(food.brand)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)

                if food.isSingleServing {
                    DashboardCard {
                        Text("\(food.servingLabel) · \(food.macros(forGrams: 100).calories) kcal · P \(food.macros(forGrams: 100).protein)g · C \(food.macros(forGrams: 100).carbs)g · F \(food.macros(forGrams: 100).fat)g")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                    PremiumButton(title: "Log Food", icon: "plus") {
                        let macros = food.macros(forGrams: 100)
                        logFood(food, serving: food.servingLabel, macros: macros)
                        selectedFood = nil
                    }
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        PremiumLabel(text: "Serving size (grams)")
                        TextField("100", text: $servingGrams)
                            .keyboardType(.numberPad)
                            .padding(14)
                            .background(AppTheme.inputBackground)
                            .foregroundStyle(AppTheme.textPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }

                    let grams = Double(servingGrams) ?? food.servingSizeG
                    let macros = food.macros(forGrams: grams)
                    DashboardCard {
                        Text("\(macros.calories) kcal · P \(macros.protein)g · C \(macros.carbs)g · F \(macros.fat)g")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textPrimary)
                    }

                    PremiumButton(title: "Log Food", icon: "plus") {
                        logFood(food, serving: "\(Int(grams))g", macros: macros)
                        selectedFood = nil
                    }
                }
                Spacer()
            }
            .padding(24)
            .background(AppTheme.background)
            .navigationTitle("Add Serving")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { selectedFood = nil }
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var nutritionGoalsSheet: some View {
        NavigationStack {
            Form {
                Section("Quick Presets") {
                    ForEach(NutritionGoalPreset.allCases) { preset in
                        Button {
                            preset.apply(to: settings)
                            try? modelContext.save()
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(preset.rawValue)
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text("\(preset.subtitle) · \(preset.calories) kcal · P \(preset.proteinG)g")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                    }
                }

                Section("Daily Targets") {
                    Stepper("Calories: \(settings.calorieGoal)", value: $settings.calorieGoal, in: 1200...5000, step: 50)
                    Stepper("Protein: \(settings.proteinGoalG)g", value: $settings.proteinGoalG, in: 50...400, step: 5)
                    Stepper("Carbs: \(settings.carbsGoalG)g", value: $settings.carbsGoalG, in: 50...600, step: 5)
                    Stepper("Fat: \(settings.fatGoalG)g", value: $settings.fatGoalG, in: 20...200, step: 5)
                }
            }
            .scrollContentBackground(.hidden)
            .background(AppTheme.background)
            .navigationTitle("Nutrition Goals")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        try? modelContext.save()
                        showGoals = false
                    }
                    .foregroundStyle(AppTheme.gold)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func runSearch() async {
        isSearching = true
        searchError = ""
        defer { isSearching = false }
        do {
            searchResults = try await FoodDatabaseService.search(query: searchQuery)
            if searchResults.isEmpty { searchError = "No foods found. Try a different search." }
        } catch {
            searchError = "Could not search database. Check your connection."
        }
    }

    private func lookupBarcode(_ code: String) async {
        isSearching = true
        defer { isSearching = false }
        do {
            if let food = try await FoodDatabaseService.lookupBarcode(code) {
                selectedFood = food
                servingGrams = String(Int(food.defaultServingGrams))
            } else {
                searchError = "Product not found in database."
                showFoodSearch = true
            }
        } catch {
            searchError = "Barcode lookup failed."
            showFoodSearch = true
        }
    }

    private func logFood(_ food: FoodItem, serving: String, macros: (calories: Int, protein: Int, carbs: Int, fat: Int)) {
        let entry = NutritionEntry(
            loggedAt: selectedDay == Calendar.current.startOfDay(for: .now) ? .now : selectedDay.addingTimeInterval(12 * 3600),
            mealName: food.name,
            calories: macros.calories,
            proteinG: macros.protein,
            carbsG: macros.carbs,
            fatG: macros.fat,
            barcode: food.barcode ?? "",
            servingDescription: serving
        )
        modelContext.insert(entry)
        try? modelContext.save()
    }
}

struct ManualMealLogView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    var targetDay: Date = Calendar.current.startOfDay(for: .now)

    @State private var mealName = ""
    @State private var calories = ""
    @State private var protein = ""
    @State private var carbs = ""
    @State private var fat = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    field("Meal name", text: $mealName)
                    field("Calories", text: $calories, numeric: true)
                    field("Protein (g)", text: $protein, numeric: true)
                    field("Carbs (g)", text: $carbs, numeric: true)
                    field("Fat (g)", text: $fat, numeric: true)
                    PremiumButton(title: "Save Meal", icon: "checkmark") { save() }
                        .disabled(mealName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(24)
            }
            .background(AppTheme.background)
            .navigationTitle("Manual Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }.foregroundStyle(AppTheme.textSecondary)
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                    .fontWeight(.semibold)
                    .foregroundStyle(EAColor.blue)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func field(_ label: String, text: Binding<String>, numeric: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            PremiumLabel(text: label)
            TextField(label, text: text)
                .keyboardType(numeric ? .numberPad : .default)
                .padding(14)
                .background(AppTheme.inputBackground)
                .foregroundStyle(AppTheme.textPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private func save() {
        let trimmed = mealName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let cal = Calendar.current
        let loggedAt = cal.isDateInToday(targetDay)
            ? Date.now
            : (cal.date(bySettingHour: 12, minute: 0, second: 0, of: cal.startOfDay(for: targetDay)) ?? targetDay)
        modelContext.insert(NutritionEntry(
            loggedAt: loggedAt,
            mealName: trimmed,
            calories: Int(calories) ?? 0,
            proteinG: Int(protein) ?? 0,
            carbsG: Int(carbs) ?? 0,
            fatG: Int(fat) ?? 0
        ))
        try? modelContext.save()
        dismiss()
    }
}
