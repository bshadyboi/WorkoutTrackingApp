import Foundation

struct ExerciseCatalogEntry: Identifiable, Hashable {
    let id: String
    let name: String
    let muscle: String
    let equipment: String
    let defaultSets: Int
    let defaultReps: Int
    let defaultWeight: Int
    let instructions: String
    let tips: [String]
    let videoURL: String

    init(
        name: String,
        muscle: String,
        equipment: String,
        defaultSets: Int = 3,
        defaultReps: Int = 10,
        defaultWeight: Int = 0,
        instructions: String,
        tips: [String] = [],
        videoURL: String
    ) {
        self.id = name
        self.name = name
        self.muscle = muscle
        self.equipment = equipment
        self.defaultSets = defaultSets
        self.defaultReps = defaultReps
        self.defaultWeight = defaultWeight
        self.instructions = instructions
        self.tips = tips
        self.videoURL = videoURL
    }

    func makeStoredExercise(sortOrder: Int) -> StoredExercise {
        StoredExercise(
            name: name,
            muscle: muscle,
            defaultSets: defaultSets,
            defaultReps: defaultReps,
            defaultWeight: defaultWeight,
            instructions: instructions,
            tips: tips,
            sortOrder: sortOrder,
            videoURL: videoURL
        )
    }
}

enum ExerciseCatalogData {
    static let all: [ExerciseCatalogEntry] = [
        // Chest
        ExerciseCatalogEntry(
            name: "Barbell Bench Press",
            muscle: "Chest",
            equipment: "Barbell",
            defaultSets: 4, defaultReps: 8, defaultWeight: 185,
            instructions: "Lie flat, grip just wider than shoulder-width. Lower bar to mid-chest, drive up explosively.",
            tips: ["Keep wrists straight", "Drive feet into floor"],
            videoURL: "https://www.youtube.com/watch?v=SCVCLChPQFY"
        ),
        ExerciseCatalogEntry(
            name: "Incline Dumbbell Press",
            muscle: "Upper Chest",
            equipment: "Dumbbells",
            defaultSets: 3, defaultReps: 10, defaultWeight: 55,
            instructions: "Set bench to 30–45°. Press dumbbells up and slightly inward.",
            tips: ["Avoid flaring elbows wide", "Control the descent"],
            videoURL: "https://www.youtube.com/watch?v=8iPEnn-ltC8"
        ),
        ExerciseCatalogEntry(
            name: "Incline Bench Press",
            muscle: "Upper Chest",
            equipment: "Barbell",
            defaultSets: 3, defaultReps: 8, defaultWeight: 155,
            instructions: "30° incline. Lower to upper chest, press up with control.",
            tips: ["Retract shoulder blades", "Controlled tempo"],
            videoURL: "https://www.youtube.com/watch?v=SrqOu55lrXI"
        ),
        ExerciseCatalogEntry(
            name: "Cable Chest Fly",
            muscle: "Chest",
            equipment: "Cable",
            defaultSets: 3, defaultReps: 12, defaultWeight: 40,
            instructions: "Pulleys at shoulder height. Bring hands together in a wide hugging arc.",
            tips: ["Slight bend in elbows", "Control the return"],
            videoURL: "https://www.youtube.com/watch?v=Iwe6AmxVf7o"
        ),
        ExerciseCatalogEntry(
            name: "Dumbbell Fly",
            muscle: "Chest",
            equipment: "Dumbbells",
            defaultSets: 3, defaultReps: 12, defaultWeight: 35,
            instructions: "Arms slightly bent. Open wide, squeeze chest to bring dumbbells together.",
            tips: ["Don't drop below shoulder line", "Feel the stretch"],
            videoURL: "https://www.youtube.com/watch?v=eozdVDA78Kc"
        ),
        ExerciseCatalogEntry(
            name: "Push-Ups",
            muscle: "Chest",
            equipment: "Bodyweight",
            defaultSets: 3, defaultReps: 15, defaultWeight: 0,
            instructions: "Hands shoulder-width, body in a straight line. Lower chest to floor, press up.",
            tips: ["Brace core", "Full range of motion"],
            videoURL: "https://www.youtube.com/watch?v=IODxDxX7oi4"
        ),

        // Back
        ExerciseCatalogEntry(
            name: "Deadlift",
            muscle: "Back",
            equipment: "Barbell",
            defaultSets: 4, defaultReps: 5, defaultWeight: 275,
            instructions: "Hinge, flat back, drive through the floor. Lock out hips and knees together.",
            tips: ["Bar over mid-foot", "Lats engaged"],
            videoURL: "https://www.youtube.com/watch?v=op9kKg9AfHo"
        ),
        ExerciseCatalogEntry(
            name: "Pull-Ups",
            muscle: "Lats",
            equipment: "Bodyweight",
            defaultSets: 4, defaultReps: 8, defaultWeight: 0,
            instructions: "Full hang to chin over bar. Control the negative.",
            tips: ["Depress shoulder blades", "Avoid swinging"],
            videoURL: "https://www.youtube.com/watch?v=eGo4IYlbE5g"
        ),
        ExerciseCatalogEntry(
            name: "Barbell Row",
            muscle: "Back",
            equipment: "Barbell",
            defaultSets: 3, defaultReps: 10, defaultWeight: 135,
            instructions: "Torso roughly 45°. Pull to lower chest, squeeze shoulder blades.",
            tips: ["No jerking", "Elbows drive back"],
            videoURL: "https://www.youtube.com/watch?v=FWJR5Ve8bnQ"
        ),
        ExerciseCatalogEntry(
            name: "Lat Pulldown",
            muscle: "Lats",
            equipment: "Cable",
            defaultSets: 3, defaultReps: 12, defaultWeight: 120,
            instructions: "Pull bar to upper chest. Lean back slightly, squeeze lats at bottom.",
            tips: ["Don't pull behind neck", "Control the return"],
            videoURL: "https://www.youtube.com/watch?v=CAwf7n6Luuc"
        ),
        ExerciseCatalogEntry(
            name: "Seated Cable Row",
            muscle: "Back",
            equipment: "Cable",
            defaultSets: 3, defaultReps: 12, defaultWeight: 130,
            instructions: "Sit tall, pull handle to lower ribs. Squeeze shoulder blades together.",
            tips: ["Don't round lower back", "Full stretch forward"],
            videoURL: "https://www.youtube.com/watch?v=GZbfZ1fRQNU"
        ),
        ExerciseCatalogEntry(
            name: "Face Pulls",
            muscle: "Rear Delts",
            equipment: "Cable",
            defaultSets: 3, defaultReps: 15, defaultWeight: 40,
            instructions: "Rope to face, external rotation at end.",
            tips: ["High elbows", "Slow and controlled"],
            videoURL: "https://www.youtube.com/watch?v=rep-qVOkfxo"
        ),

        // Shoulders
        ExerciseCatalogEntry(
            name: "Overhead Press",
            muscle: "Shoulders",
            equipment: "Barbell",
            defaultSets: 4, defaultReps: 6, defaultWeight: 115,
            instructions: "Bar at clavicle. Brace and press straight up.",
            tips: ["Glutes tight", "Head through at lockout"],
            videoURL: "https://www.youtube.com/watch?v=2yjwXTZQ2BE"
        ),
        ExerciseCatalogEntry(
            name: "Dumbbell Shoulder Press",
            muscle: "Shoulders",
            equipment: "Dumbbells",
            defaultSets: 3, defaultReps: 10, defaultWeight: 50,
            instructions: "Neutral or pronated grip. Full range without excessive arch.",
            tips: ["Core braced", "Don't flare elbows"],
            videoURL: "https://www.youtube.com/watch?v=qEwKCR5JCog"
        ),
        ExerciseCatalogEntry(
            name: "Lateral Raises",
            muscle: "Side Delts",
            equipment: "Dumbbells",
            defaultSets: 3, defaultReps: 15, defaultWeight: 20,
            instructions: "Slight bend in elbows. Raise to shoulder height.",
            tips: ["Lead with elbows", "No momentum"],
            videoURL: "https://www.youtube.com/watch?v=3VcKaXpzqRo"
        ),
        ExerciseCatalogEntry(
            name: "Front Raises",
            muscle: "Front Delts",
            equipment: "Dumbbells",
            defaultSets: 3, defaultReps: 12, defaultWeight: 25,
            instructions: "Raise dumbbells to eye level with arms straight or slightly bent.",
            tips: ["Control the descent", "Don't swing"],
            videoURL: "https://www.youtube.com/watch?v=qTkFikM0XnY"
        ),

        // Arms
        ExerciseCatalogEntry(
            name: "Barbell Curl",
            muscle: "Biceps",
            equipment: "Barbell",
            defaultSets: 3, defaultReps: 12, defaultWeight: 65,
            instructions: "Elbows fixed at sides. Full extension without swinging.",
            tips: ["Squeeze at top", "Control the negative"],
            videoURL: "https://www.youtube.com/watch?v=kwG2ipFRgfo"
        ),
        ExerciseCatalogEntry(
            name: "Hammer Curl",
            muscle: "Biceps",
            equipment: "Dumbbells",
            defaultSets: 3, defaultReps: 12, defaultWeight: 30,
            instructions: "Neutral grip throughout. Curl without swinging.",
            tips: ["Elbows stay pinned", "Full range"],
            videoURL: "https://www.youtube.com/watch?v=zCj3WvQH4Sc"
        ),
        ExerciseCatalogEntry(
            name: "Tricep Pushdown",
            muscle: "Triceps",
            equipment: "Cable",
            defaultSets: 4, defaultReps: 12, defaultWeight: 60,
            instructions: "Elbows pinned to sides. Push down until fully extended.",
            tips: ["Elbows stay fixed", "Full extension each rep"],
            videoURL: "https://www.youtube.com/watch?v=2-LAMcpzODU"
        ),
        ExerciseCatalogEntry(
            name: "Skull Crushers",
            muscle: "Triceps",
            equipment: "Barbell",
            defaultSets: 3, defaultReps: 12, defaultWeight: 75,
            instructions: "Lower bar to forehead area. Elbows stay pointed up.",
            tips: ["Control the weight", "Full extension"],
            videoURL: "https://www.youtube.com/watch?v=d_KZxkY_0cM"
        ),
        ExerciseCatalogEntry(
            name: "Dips",
            muscle: "Triceps",
            equipment: "Bodyweight",
            defaultSets: 3, defaultReps: 10, defaultWeight: 0,
            instructions: "Lean slightly forward for chest or upright for triceps. Lower until 90° at elbows.",
            tips: ["Control depth", "Don't shrug shoulders"],
            videoURL: "https://www.youtube.com/watch?v=2z8JmcrW6tY"
        ),

        // Legs
        ExerciseCatalogEntry(
            name: "Barbell Back Squat",
            muscle: "Quads",
            equipment: "Barbell",
            defaultSets: 4, defaultReps: 6, defaultWeight: 225,
            instructions: "Bar on upper back. Sit back and down, chest up, drive through mid-foot.",
            tips: ["Brace before each rep", "Knees track over toes"],
            videoURL: "https://www.youtube.com/watch?v=ultWZbUMPL8"
        ),
        ExerciseCatalogEntry(
            name: "Romanian Deadlift",
            muscle: "Hamstrings",
            equipment: "Barbell",
            defaultSets: 3, defaultReps: 10, defaultWeight: 185,
            instructions: "Slight knee bend. Hinge at hips, bar stays close to legs.",
            tips: ["Flat back", "Feel the hamstring stretch"],
            videoURL: "https://www.youtube.com/watch?v=2SHsk0SaPFk"
        ),
        ExerciseCatalogEntry(
            name: "Leg Press",
            muscle: "Quads",
            equipment: "Machine",
            defaultSets: 3, defaultReps: 12, defaultWeight: 360,
            instructions: "Feet shoulder-width on platform. Lower with control, don't lock knees hard.",
            tips: ["Full range of motion", "Don't let lower back round"],
            videoURL: "https://www.youtube.com/watch?v=IZxyjW7MPJQ"
        ),
        ExerciseCatalogEntry(
            name: "Walking Lunges",
            muscle: "Glutes",
            equipment: "Dumbbells",
            defaultSets: 3, defaultReps: 12, defaultWeight: 50,
            instructions: "Long stride, torso upright. Drive through front heel.",
            tips: ["Control the descent", "Keep balance"],
            videoURL: "https://www.youtube.com/watch?v=3XDriUn0udo"
        ),
        ExerciseCatalogEntry(
            name: "Leg Curl",
            muscle: "Hamstrings",
            equipment: "Machine",
            defaultSets: 3, defaultReps: 12, defaultWeight: 80,
            instructions: "Curl heels toward glutes. Squeeze hamstrings at peak.",
            tips: ["Hips stay down", "Slow negative"],
            videoURL: "https://www.youtube.com/watch?v=1Tq3QdYUuLs"
        ),
        ExerciseCatalogEntry(
            name: "Leg Extension",
            muscle: "Quads",
            equipment: "Machine",
            defaultSets: 3, defaultReps: 12, defaultWeight: 90,
            instructions: "Extend legs fully, pause at top. Control the return.",
            tips: ["Don't lock out aggressively", "Toes pointed up slightly"],
            videoURL: "https://www.youtube.com/watch?v=YyvSfVjQeL0"
        ),
        ExerciseCatalogEntry(
            name: "Standing Calf Raise",
            muscle: "Calves",
            equipment: "Machine",
            defaultSets: 4, defaultReps: 15, defaultWeight: 135,
            instructions: "Pause at the top. Full stretch at the bottom.",
            tips: ["Slow eccentric", "Squeeze at peak"],
            videoURL: "https://www.youtube.com/watch?v=-M4-Gabpvyc"
        ),
        ExerciseCatalogEntry(
            name: "Hip Thrust",
            muscle: "Glutes",
            equipment: "Barbell",
            defaultSets: 3, defaultReps: 10, defaultWeight: 185,
            instructions: "Upper back on bench, drive hips up until torso is parallel to floor.",
            tips: ["Chin tucked", "Squeeze glutes at top"],
            videoURL: "https://www.youtube.com/watch?v=SEd7XMKfhp0"
        ),

        // Core
        ExerciseCatalogEntry(
            name: "Plank",
            muscle: "Core",
            equipment: "Bodyweight",
            defaultSets: 3, defaultReps: 60, defaultWeight: 0,
            instructions: "Forearms on floor, body straight. Hold position, breathe steadily.",
            tips: ["Don't sag hips", "Squeeze glutes"],
            videoURL: "https://www.youtube.com/watch?v=ASdvN_XEl_c"
        ),
        ExerciseCatalogEntry(
            name: "Cable Crunch",
            muscle: "Core",
            equipment: "Cable",
            defaultSets: 3, defaultReps: 15, defaultWeight: 60,
            instructions: "Kneel facing cable, crunch down using abs not hips.",
            tips: ["Round upper back", "Full contraction"],
            videoURL: "https://www.youtube.com/watch?v=ToJeyHyd6Mk"
        ),
    ]

    static var muscleGroups: [String] {
        Array(Set(all.map(\.muscle))).sorted()
    }

    static func entry(named name: String) -> ExerciseCatalogEntry? {
        all.first { $0.name == name }
    }

    static func groupedByMuscle(filter: String = "") -> [(muscle: String, exercises: [ExerciseCatalogEntry])] {
        let query = filter.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let filtered = query.isEmpty ? all : all.filter {
            $0.name.lowercased().contains(query)
                || $0.muscle.lowercased().contains(query)
                || $0.equipment.lowercased().contains(query)
        }
        let grouped = Dictionary(grouping: filtered, by: \.muscle)
        return grouped.keys.sorted().map { ($0, grouped[$0]!.sorted { $0.name < $1.name }) }
    }
}
