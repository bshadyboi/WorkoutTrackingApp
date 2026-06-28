import { useState } from "react";
import {
  Home, Dumbbell, Heart, TrendingUp, Sun, Moon,
  Flame, Clock, Droplets, ChevronDown, ChevronUp,
  CheckCircle, Circle, Trophy, Zap, Target, Activity,
  Play, ChevronRight, ArrowUpRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area,
} from "recharts";

// ─── Design tokens ────────────────────────────────────────────────────────────

const ACCENT       = "#4F8EFF";
const ACCENT_DIM   = "#4F8EFF22";
const ACCENT_MID   = "#4F8EFF55";
const GRAD_A       = "#1B3A8A"; // dark navy
const GRAD_B       = "#3B6FE8"; // blue
const GRAD_C       = "#7C5FFF"; // violet
const COLOR_HR     = "#FF4D6A";
const COLOR_SLEEP  = "#A78BFA";
const COLOR_CAL    = "#FB923C";
const COLOR_WATER  = "#38BDF8";
const COLOR_GREEN  = "#34D399";
const COLOR_GOLD   = "#FBBF24";

const DISPLAY = "'Barlow Condensed', sans-serif";

// ─── Data ─────────────────────────────────────────────────────────────────────

const EXERCISES = [
  {
    id: 1,
    name: "Barbell Bench Press",
    muscle: "Chest",
    sets: 4, reps: 8, weight: 185, unit: "lbs",
    instructions: "Lie flat, grip just wider than shoulder-width. Lower bar to mid-chest with a 2-second eccentric. Drive up explosively, full lockout at top. Shoulder blades retracted and depressed throughout.",
    tips: ["Keep wrists straight", "Drive feet into floor", "Retract shoulder blades"],
  },
  {
    id: 2,
    name: "Incline Dumbbell Press",
    muscle: "Upper Chest",
    sets: 3, reps: 10, weight: 55, unit: "lbs",
    instructions: "Set bench to 30–45°. Press dumbbells up and slightly inward, squeezing at lockout. Lower with a controlled 2–3 second eccentric, feeling the full stretch at the bottom.",
    tips: ["Avoid flaring elbows wide", "Touch dumbbells lightly at top", "Control the descent"],
  },
  {
    id: 3,
    name: "Cable Chest Fly",
    muscle: "Chest",
    sets: 3, reps: 12, weight: 40, unit: "lbs",
    instructions: "Pulleys at shoulder height. Split stance. Bring hands together in a wide hugging arc, slight elbow bend throughout. Focus on the peak squeeze at center.",
    tips: ["Slight bend in elbows always", "Think 'hugging a barrel'", "Control the return"],
  },
  {
    id: 4,
    name: "Tricep Pushdown",
    muscle: "Triceps",
    sets: 4, reps: 12, weight: 60, unit: "lbs",
    instructions: "Grip bar overhand. Elbows pinned to sides — they must not drift. Push down until fully extended, hard squeeze at the bottom. Don't lean in.",
    tips: ["Elbows stay fixed at sides", "Full extension each rep", "Don't lean into the weight"],
  },
  {
    id: 5,
    name: "Overhead Press",
    muscle: "Shoulders",
    sets: 3, reps: 8, weight: 95, unit: "lbs",
    instructions: "Barbell at clavicle height, hands just outside shoulder-width. Brace core and glutes hard. Press overhead in a slight arc, lockout fully with bar over ears.",
    tips: ["Brace hard before each rep", "Don't hyperextend lumbar", "Bar over ears at lockout"],
  },
];

const WEEKLY_STEPS = [
  { day: "M", steps: 7200 }, { day: "T", steps: 9800 }, { day: "W", steps: 6100 },
  { day: "T", steps: 11200 }, { day: "F", steps: 8400 }, { day: "S", steps: 8432 }, { day: "S", steps: 0 },
];

const WEIGHT_DATA = [
  { w: "W1", v: 182 }, { w: "W2", v: 181 }, { w: "W3", v: 180 },
  { w: "W4", v: 179.5 }, { w: "W5", v: 179 }, { w: "W6", v: 178.5 },
  { w: "W7", v: 178 }, { w: "W8", v: 177.5 },
];

const HR_SPARK = [68, 72, 71, 74, 73, 70, 72, 75, 73, 71, 72];

const SLEEP_STAGES = [
  { label: "Deep", pct: 0.22, color: ACCENT },
  { label: "REM", pct: 0.28, color: COLOR_SLEEP },
  { label: "Light", pct: 0.38, color: "#94A3B8" },
  { label: "Awake", pct: 0.12, color: COLOR_CAL },
];

const RINGS = [
  { label: "Move", pct: 0.84, color: COLOR_HR },
  { label: "Exercise", pct: 0.92, color: COLOR_GREEN },
  { label: "Stand", pct: 0.75, color: COLOR_WATER },
];

const PRS = [
  { lift: "Bench Press", weight: "225 lbs", date: "Jun 14", delta: "+10 lbs" },
  { lift: "Squat", weight: "315 lbs", date: "Jun 1", delta: "+15 lbs" },
  { lift: "Deadlift", weight: "385 lbs", date: "Jun 7", delta: "+20 lbs" },
  { lift: "Overhead Press", weight: "155 lbs", date: "May 28", delta: "+5 lbs" },
];

const WORKOUT_DAYS  = new Set([1,3,5,8,10,12,15,17,19,22,24,26,28]);
const ACTIVE_DAYS   = new Set([2,6,11,16,20,25]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Card({ children, isDark, className = "", style = {} }: {
  children: React.ReactNode; isDark: boolean; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-3xl border border-border ${className}`}
      style={{ backgroundColor: isDark ? "#161616" : "#FFFFFF", ...style }}
    >
      {children}
    </div>
  );
}

function PillBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-xs px-2.5 py-0.5 rounded-full border border-border text-muted-foreground shrink-0"
      style={{ backgroundColor: color + "18", borderColor: color + "44", color }}
    >
      {label}
    </span>
  );
}

// ─── Step ring ────────────────────────────────────────────────────────────────

function StepRing({ steps, goal }: { steps: number; goal: number }) {
  const pct = Math.min(steps / goal, 1);
  const r = 76, circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      {/* Glow */}
      <div style={{
        position: "absolute", width: 130, height: 130, borderRadius: "50%",
        background: `radial-gradient(circle, ${ACCENT}30 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="90" cy="90" r={r} fill="none" strokeWidth="11" stroke={ACCENT} opacity="0.12" />
        <circle
          cx="90" cy="90" r={r} fill="none" strokeWidth="11" strokeLinecap="round"
          style={{ stroke: ACCENT, strokeDasharray: circ, strokeDashoffset: circ * (1 - pct), transition: "stroke-dashoffset 1.2s ease", filter: `drop-shadow(0 0 8px ${ACCENT}99)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: DISPLAY, fontSize: 42, fontWeight: 900, lineHeight: 1, color: ACCENT }}>
          {steps.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">steps today</span>
        <span className="text-xs mt-1 font-semibold" style={{ color: ACCENT }}>{Math.round(pct * 100)}%</span>
      </div>
    </div>
  );
}

// ─── Activity rings ───────────────────────────────────────────────────────────

function ActivityRingsViz() {
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
        <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
          {RINGS.map((ring, i) => {
            const r = 30 - i * 9, circ = 2 * Math.PI * r;
            return (
              <g key={i}>
                <circle cx="36" cy="36" r={r} fill="none" stroke={ring.color} strokeWidth="6.5" opacity="0.15" />
                <circle cx="36" cy="36" r={r} fill="none" stroke={ring.color} strokeWidth="6.5"
                  strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - ring.pct)}
                  style={{ filter: `drop-shadow(0 0 4px ${ring.color}88)` }}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-col gap-2.5 flex-1">
        {RINGS.map((ring) => (
          <div key={ring.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ring.color }} />
            <span className="text-xs text-muted-foreground w-14">{ring.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${ring.pct * 100}%`, backgroundColor: ring.color }} />
            </div>
            <span className="text-xs font-semibold w-8 text-right">{Math.round(ring.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Exercise card ────────────────────────────────────────────────────────────

function ExerciseCard({ ex, isDark }: { ex: typeof EXERCISES[0]; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [weights, setWeights] = useState(() => Array<number>(ex.sets).fill(ex.weight));
  const [reps, setReps] = useState(() => Array<number>(ex.sets).fill(ex.reps));

  const allDone = done.size === ex.sets;

  const toggle = (i: number) => setDone(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const adj = (arr: number[], set: (v: number[]) => void, i: number, delta: number, min = 0) => {
    const n = [...arr]; n[i] = Math.max(min, n[i] + delta); set(n);
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{
        backgroundColor: isDark ? "#161616" : "#FFFFFF",
        borderColor: allDone ? ACCENT + "55" : "var(--border)",
      }}
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left active:opacity-70 transition-opacity">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
          style={{
            background: allDone ? `linear-gradient(135deg, ${GRAD_B}, ${GRAD_C})` : isDark ? "#222" : "#F0F0F0",
            boxShadow: allDone ? `0 4px 12px ${ACCENT}44` : "none",
          }}
        >
          {allDone
            ? <CheckCircle size={18} style={{ color: "#fff" }} />
            : <Dumbbell size={16} className="text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate" style={{ fontFamily: DISPLAY, fontSize: 17 }}>{ex.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {ex.muscle} · {ex.sets} sets × {ex.reps} reps · {ex.weight} {ex.unit}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {done.size > 0 && !allDone && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: ACCENT_DIM, color: ACCENT }}>
              {done.size}/{ex.sets}
            </span>
          )}
          {allDone && (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: `linear-gradient(135deg, ${GRAD_B}, ${GRAD_C})` }}>
              Done
            </span>
          )}
          {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <div className="px-4 pt-3 pb-3" style={{ backgroundColor: isDark ? "#111" : "#FAFAFA" }}>
            <p className="text-xs text-muted-foreground leading-relaxed">{ex.instructions}</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {ex.tips.map(t => (
                <span key={t} className="text-xs px-2.5 py-0.5 rounded-full border border-border text-muted-foreground"
                  style={{ backgroundColor: isDark ? "#1A1A1A" : "#FFF" }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="px-4 pb-4 pt-3">
            <div className="flex text-xs text-muted-foreground mb-2 px-1">
              <span className="w-6">#</span>
              <span className="flex-1 text-center">Weight</span>
              <span className="flex-1 text-center">Reps</span>
              <span className="w-8" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: ex.sets }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all"
                  style={{
                    backgroundColor: done.has(i) ? ACCENT + "12" : isDark ? "#1C1C1C" : "#F6F6F6",
                    border: done.has(i) ? `1px solid ${ACCENT}44` : "1px solid transparent",
                  }}>
                  <span className="text-xs font-bold w-4 text-muted-foreground">{i + 1}</span>
                  {/* Weight stepper */}
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <button onClick={() => adj(weights, setWeights, i, -5)}
                      className="w-7 h-7 rounded-lg font-bold text-muted-foreground hover:text-foreground transition-colors"
                      style={{ backgroundColor: isDark ? "#252525" : "#EBEBEB" }}>-</button>
                    <span className="text-sm font-semibold w-9 text-center">{weights[i]}</span>
                    <button onClick={() => adj(weights, setWeights, i, 5)}
                      className="w-7 h-7 rounded-lg font-bold text-muted-foreground hover:text-foreground transition-colors"
                      style={{ backgroundColor: isDark ? "#252525" : "#EBEBEB" }}>+</button>
                  </div>
                  {/* Reps stepper */}
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <button onClick={() => adj(reps, setReps, i, -1, 1)}
                      className="w-7 h-7 rounded-lg font-bold text-muted-foreground hover:text-foreground transition-colors"
                      style={{ backgroundColor: isDark ? "#252525" : "#EBEBEB" }}>-</button>
                    <span className="text-sm font-semibold w-7 text-center">{reps[i]}</span>
                    <button onClick={() => adj(reps, setReps, i, 1)}
                      className="w-7 h-7 rounded-lg font-bold text-muted-foreground hover:text-foreground transition-colors"
                      style={{ backgroundColor: isDark ? "#252525" : "#EBEBEB" }}>+</button>
                  </div>
                  <button onClick={() => toggle(i)} className="w-8 flex justify-center">
                    {done.has(i) ? <CheckCircle size={20} style={{ color: ACCENT }} /> : <Circle size={20} className="text-muted-foreground" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

function HomeScreen({ isDark }: { isDark: boolean }) {
  return (
    <div className="pb-8 space-y-4">
      {/* TODAY'S WORKOUT HERO — full bleed, no horizontal padding */}
      <div style={{
        background: `linear-gradient(145deg, ${GRAD_A} 0%, ${GRAD_B} 55%, ${GRAD_C} 100%)`,
        padding: "20px 20px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative orbs */}
        <div style={{
          position: "absolute", top: -30, right: -30, width: 160, height: 160,
          borderRadius: "50%", background: `radial-gradient(circle, ${GRAD_C}55 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -20, left: 40, width: 100, height: 100,
          borderRadius: "50%", background: `radial-gradient(circle, ${ACCENT}33 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        {/* Subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.05,
          backgroundImage: "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 32px)",
          pointerEvents: "none",
        }} />

        {/* Label + date */}
        <div className="flex items-center justify-between mb-3 relative">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>
            Today&apos;s Workout
          </span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Jun 28</span>
        </div>

        {/* Title */}
        <div className="relative">
          <h2 style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 900, lineHeight: 0.95, color: "#FFF", letterSpacing: "-0.01em" }}>
            Push Day A
          </h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 8 }}>
            5 exercises · 45–55 min · Hypertrophy
          </p>
        </div>

        {/* Exercise tags */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-0.5 relative" style={{ scrollbarWidth: "none" }}>
          {["Bench Press", "Inc. Press", "Cable Fly", "Pushdown", "OHP"].map(e => (
            <span key={e} className="text-xs px-2.5 py-1 rounded-full shrink-0"
              style={{ backgroundColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
              {e}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          className="flex items-center gap-2 mt-5 px-6 py-3 rounded-2xl font-bold text-sm relative transition-all active:scale-95 hover:brightness-110"
          style={{ backgroundColor: "#FFF", color: GRAD_B, fontFamily: "'Inter', sans-serif", boxShadow: `0 8px 24px rgba(0,0,0,0.25)` }}
        >
          <Play size={14} fill="currentColor" />
          Start Workout
        </button>
      </div>

      {/* Greeting + steps */}
      <div className="px-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Good morning</p>
            <h1 style={{ fontFamily: DISPLAY, fontSize: 32, fontWeight: 900, lineHeight: 1 }}>Alex Johnson</h1>
            <p className="text-xs text-muted-foreground mt-1">Saturday, June 28, 2026</p>
          </div>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base"
            style={{ background: `linear-gradient(135deg, ${GRAD_B}, ${GRAD_C})`, color: "#FFF", boxShadow: `0 6px 18px ${ACCENT}55` }}>
            A
          </div>
        </div>

        {/* Steps + quick stats */}
        <Card isDark={isDark} style={{ padding: 20 }}>
          <div className="flex flex-col items-center">
            <StepRing steps={8432} goal={10000} />
            <div className="w-full h-px bg-border my-4" />
            <div className="w-full grid grid-cols-3 gap-3">
              {[
                { icon: <Flame size={14} />, label: "Calories", value: "1,847", unit: "kcal", color: COLOR_CAL },
                { icon: <Clock size={14} />, label: "Active", value: "47", unit: "min", color: ACCENT },
                { icon: <Heart size={14} />, label: "Heart Rate", value: "72", unit: "bpm", color: COLOR_HR },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ backgroundColor: isDark ? "#1E1E1E" : "#F5F5F5" }}>
                  <div className="flex justify-center mb-1.5" style={{ color: s.color }}>{s.icon}</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Activity rings */}
        <Card isDark={isDark} style={{ padding: 16 }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">Activity Rings</span>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
          <ActivityRingsViz />
        </Card>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <button className="text-xs flex items-center gap-0.5" style={{ color: ACCENT }}>
              See all <ArrowUpRight size={11} />
            </button>
          </div>
          {[
            { date: "Yesterday", name: "Lower Body B", duration: "52 min", calories: 412 },
            { date: "Thursday", name: "Push Day A", duration: "48 min", calories: 385 },
            { date: "Wednesday", name: "Rest Day", duration: "—", calories: 0 },
          ].map(item => (
            <div key={item.date} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: isDark ? "#1E1E1E" : "#F4F4F4" }}>
                <Dumbbell size={14} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.date} · {item.duration}</div>
              </div>
              {item.calories > 0 && (
                <div className="text-sm font-bold" style={{ color: COLOR_CAL }}>{item.calories} kcal</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── WORKOUTS ─────────────────────────────────────────────────────────────────

function WorkoutsScreen({ isDark }: { isDark: boolean }) {
  const totalSets = EXERCISES.reduce((s, e) => s + e.sets, 0);
  return (
    <div className="px-4 pb-8 space-y-4">
      <div className="pt-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Today</p>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 900, lineHeight: 1 }}>Push Day A</h1>
        <p className="text-xs text-muted-foreground mt-1.5">{EXERCISES.length} exercises · {totalSets} sets · 45–55 min</p>
      </div>

      {/* Program banner */}
      <div
        className="rounded-2xl p-3 flex items-center gap-3 border border-border"
        style={{
          background: isDark
            ? `linear-gradient(135deg, ${GRAD_A}CC, ${GRAD_A}88)`
            : `linear-gradient(135deg, #EEF4FF, #E8EEFF)`,
          borderColor: ACCENT + "44",
        }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${GRAD_B}, ${GRAD_C})` }}>
          <Target size={17} style={{ color: "#FFF" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Hypertrophy Block A</div>
          <div className="text-xs text-muted-foreground">Week 3 of 8 · Day 1 of 4</div>
        </div>
        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      </div>

      <div className="space-y-3">
        {EXERCISES.map(ex => <ExerciseCard key={ex.id} ex={ex} isDark={isDark} />)}
      </div>

      <button
        className="w-full py-4 rounded-2xl font-black transition-all active:scale-[0.98] hover:brightness-110"
        style={{
          background: `linear-gradient(135deg, ${GRAD_B}, ${GRAD_C})`,
          color: "#FFF",
          fontFamily: DISPLAY,
          fontSize: 20,
          letterSpacing: "0.06em",
          boxShadow: `0 8px 24px ${ACCENT}44`,
        }}
      >
        FINISH WORKOUT
      </button>
    </div>
  );
}

// ─── HEALTH ───────────────────────────────────────────────────────────────────

function HealthScreen({ isDark }: { isDark: boolean }) {
  const maxHR = Math.max(...HR_SPARK), minHR = Math.min(...HR_SPARK);
  return (
    <div className="px-4 pb-8 space-y-4">
      <div className="pt-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Overview</p>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 900, lineHeight: 1 }}>Health</h1>
      </div>

      {/* HR */}
      <Card isDark={isDark} style={{ padding: 16 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart size={15} style={{ color: COLOR_HR }} />
            <span className="text-sm font-semibold">Heart Rate</span>
          </div>
          <PillBadge label="Resting" color={COLOR_HR} />
        </div>
        <div className="flex items-end gap-4">
          <div>
            <span style={{ fontFamily: DISPLAY, fontSize: 52, fontWeight: 900, lineHeight: 1, color: COLOR_HR }}>72</span>
            <span className="text-sm text-muted-foreground ml-1">bpm</span>
          </div>
          <div className="flex-1 flex items-end gap-0.5" style={{ height: 52 }}>
            {HR_SPARK.map((v, i) => (
              <div key={i} className="flex-1 rounded-sm"
                style={{
                  height: `${((v - minHR) / (maxHR - minHR + 1)) * 68 + 32}%`,
                  backgroundColor: COLOR_HR,
                  opacity: 0.3 + (i / HR_SPARK.length) * 0.7,
                }} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[{ l: "Min", v: `${minHR} bpm` }, { l: "Max", v: `${maxHR} bpm` }, { l: "HRV", v: "58 ms" }].map(m => (
            <div key={m.l} className="rounded-xl p-2.5" style={{ backgroundColor: isDark ? "#1E1E1E" : "#F5F5F5" }}>
              <div className="text-xs text-muted-foreground">{m.l}</div>
              <div className="font-bold text-sm mt-0.5">{m.v}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Sleep */}
      <Card isDark={isDark} style={{ padding: 16 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Moon size={15} style={{ color: COLOR_SLEEP }} />
            <span className="text-sm font-semibold">Sleep</span>
          </div>
          <PillBadge label="Good" color={COLOR_GREEN} />
        </div>
        <div className="flex items-baseline gap-1 mb-4">
          <span style={{ fontFamily: DISPLAY, fontSize: 52, fontWeight: 900, lineHeight: 1, color: COLOR_SLEEP }}>7</span>
          <span className="text-sm text-muted-foreground">h</span>
          <span style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 900, lineHeight: 1, color: COLOR_SLEEP }}>23</span>
          <span className="text-sm text-muted-foreground">m</span>
        </div>
        <div className="space-y-2.5">
          {SLEEP_STAGES.map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-muted-foreground w-12">{s.label}</span>
              <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: isDark ? "#222" : "#EBEBEB" }}>
                <div className="h-full rounded-full" style={{ width: `${s.pct * 100}%`, backgroundColor: s.color }} />
              </div>
              <span className="text-xs font-semibold w-8 text-right">{Math.round(s.pct * 100)}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Nutrition */}
      <Card isDark={isDark} style={{ padding: 16 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame size={15} style={{ color: COLOR_CAL }} />
            <span className="text-sm font-semibold">Nutrition</span>
          </div>
          <PillBadge label="Today" color={COLOR_CAL} />
        </div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span style={{ fontFamily: DISPLAY, fontSize: 52, fontWeight: 900, lineHeight: 1 }}>1,847</span>
          <span className="text-sm text-muted-foreground">/ 2,200 kcal</span>
        </div>
        <div className="w-full h-2.5 rounded-full mb-4 overflow-hidden" style={{ backgroundColor: isDark ? "#222" : "#EBEBEB" }}>
          <div className="h-full rounded-full" style={{ width: "84%", background: `linear-gradient(90deg, ${COLOR_CAL}, #FBBF24)` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Protein", v: "182g", g: "200g", pct: 0.91, c: ACCENT },
            { l: "Carbs", v: "195g", g: "250g", pct: 0.78, c: COLOR_CAL },
            { l: "Fat", v: "68g", g: "80g", pct: 0.85, c: COLOR_SLEEP },
          ].map(m => (
            <div key={m.l} className="rounded-2xl p-3" style={{ backgroundColor: isDark ? "#1E1E1E" : "#F5F5F5" }}>
              <div className="text-xs text-muted-foreground">{m.l}</div>
              <div className="font-bold text-sm mt-0.5">{m.v}</div>
              <div className="w-full h-1.5 rounded-full mt-2" style={{ backgroundColor: isDark ? "#2A2A2A" : "#E0E0E0" }}>
                <div className="h-full rounded-full" style={{ width: `${m.pct * 100}%`, backgroundColor: m.c }} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">/ {m.g}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Hydration */}
      <Card isDark={isDark} style={{ padding: 16 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets size={15} style={{ color: COLOR_WATER }} />
            <span className="text-sm font-semibold">Hydration</span>
          </div>
          <span className="text-xs font-semibold" style={{ color: COLOR_WATER }}>6 / 8 glasses</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-1 h-9 rounded-lg transition-all"
              style={{
                background: i < 6 ? `linear-gradient(180deg, ${COLOR_WATER}CC, ${COLOR_WATER}88)` : isDark ? "#1E1E1E" : "#EBEBEB",
                opacity: i < 6 ? 0.6 + i * 0.07 : 1,
              }} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2.5">1.5 L consumed · 0.5 L to goal</p>
      </Card>

      {/* Body metrics */}
      <Card isDark={isDark} style={{ padding: 16 }}>
        <div className="text-sm font-semibold mb-3">Body Metrics</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { l: "Weight", v: "178 lbs", sub: "↓ 0.5 this week", c: ACCENT },
            { l: "BMI", v: "22.4", sub: "Normal range", c: COLOR_GREEN },
            { l: "Body Fat", v: "15.2%", sub: "Athletic", c: COLOR_CAL },
            { l: "Lean Mass", v: "148 lbs", sub: "+1.2 this month", c: COLOR_SLEEP },
          ].map(m => (
            <div key={m.l} className="rounded-2xl p-3" style={{ backgroundColor: isDark ? "#1E1E1E" : "#F5F5F5" }}>
              <div className="text-xs text-muted-foreground">{m.l}</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, lineHeight: 1.1, marginTop: 2, color: m.c }}>{m.v}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── PROGRESS ─────────────────────────────────────────────────────────────────

function ProgressScreen({ isDark }: { isDark: boolean }) {
  const tip = { background: isDark ? "#1E1E1E" : "#FFF", border: "none", borderRadius: 12, fontSize: 11, color: isDark ? "#F2F2EE" : "#0D0D0D" };

  return (
    <div className="px-4 pb-8 space-y-4">
      <div className="pt-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Stats</p>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 900, lineHeight: 1 }}>Progress</h1>
      </div>

      {/* Streak / total */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-3xl p-4 flex items-center gap-3"
          style={{ background: `linear-gradient(135deg, ${GRAD_A}, ${GRAD_B})`, boxShadow: `0 8px 24px ${ACCENT}44` }}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <Flame size={20} style={{ color: "#FFF" }} />
          </div>
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 900, lineHeight: 1, color: "#FFF" }}>12</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>Day Streak</div>
          </div>
        </div>
        <Card isDark={isDark} className="flex-1" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: isDark ? "#1E1E1E" : "#F4F4F4" }}>
            <Trophy size={20} style={{ color: COLOR_GOLD }} />
          </div>
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 900, lineHeight: 1 }}>47</div>
            <div className="text-xs text-muted-foreground">Workouts</div>
          </div>
        </Card>
      </div>

      {/* Steps chart */}
      <Card isDark={isDark} style={{ padding: 16 }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold">Weekly Steps</span>
          <span className="text-xs text-muted-foreground">Avg: 8,476</span>
        </div>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={WEEKLY_STEPS} barSize={22} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? "#666" : "#999" }} />
            <YAxis hide />
            <Tooltip contentStyle={tip} cursor={{ fill: "transparent" }} formatter={(v: number) => [`${v.toLocaleString()} steps`, ""]} />
            <Bar dataKey="steps" radius={[6, 6, 2, 2]}>
              {WEEKLY_STEPS.map((_, i) => (
                <rect key={i} fill={i === 5 ? ACCENT : ACCENT + "55"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Weight trend */}
      <Card isDark={isDark} style={{ padding: 16 }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold">Weight Trend</span>
          <span className="text-xs font-semibold" style={{ color: COLOR_GREEN }}>↓ 4.5 lbs</span>
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={WEIGHT_DATA} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="w" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDark ? "#666" : "#999" }} />
            <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
            <Tooltip contentStyle={tip} formatter={(v: number) => [`${v} lbs`, "Weight"]} />
            <Area type="monotone" dataKey="v" stroke={ACCENT} strokeWidth={2.5} fill="url(#wg)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* PRs */}
      <Card isDark={isDark} style={{ padding: 16 }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold">Personal Records</span>
          <Trophy size={14} style={{ color: COLOR_GOLD }} />
        </div>
        <div className="space-y-3">
          {PRS.map(pr => (
            <div key={pr.lift} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: isDark ? "#1E1E1E" : "#F5F5F5" }}>
                <Zap size={13} style={{ color: COLOR_GOLD }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{pr.lift}</div>
                <div className="text-xs text-muted-foreground">{pr.date}</div>
              </div>
              <div className="text-right shrink-0">
                <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{pr.weight}</div>
                <div className="text-xs font-semibold" style={{ color: COLOR_GREEN }}>{pr.delta}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Calendar heatmap */}
      <Card isDark={isDark} style={{ padding: 16 }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold">June 2026</span>
          <Activity size={14} className="text-muted-foreground" />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {["M","T","W","T","F","S","S"].map((d, i) => (
            <div key={i} className="text-center text-muted-foreground pb-1" style={{ fontSize: 10 }}>{d}</div>
          ))}
          {Array.from({ length: 30 }).map((_, i) => {
            const day = i + 1;
            const isW = WORKOUT_DAYS.has(day), isA = ACTIVE_DAYS.has(day), isT = day === 28;
            return (
              <div key={day}
                className="aspect-square rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: isW
                    ? `linear-gradient(135deg, ${GRAD_B}CC, ${GRAD_C}CC)`
                    : isA ? ACCENT + "44" : isDark ? "#1A1A1A" : "#EFEFEF",
                  outline: isT ? `2px solid ${ACCENT}` : "none",
                  outlineOffset: -1,
                  fontSize: 10,
                  fontWeight: isT ? 700 : 400,
                  color: isW ? "#fff" : isA ? ACCENT : isDark ? "#333" : "#CCC",
                  boxShadow: isW ? `0 2px 8px ${ACCENT}44` : "none",
                }}>
                {day}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: `linear-gradient(135deg, ${GRAD_B}, ${GRAD_C})` }} />
            <span className="text-xs text-muted-foreground">Workout</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ACCENT + "44" }} />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────

type TabId = "home" | "workouts" | "health" | "progress";
const TABS: { id: TabId; Icon: React.ElementType; label: string }[] = [
  { id: "home", Icon: Home, label: "Home" },
  { id: "workouts", Icon: Dumbbell, label: "Workouts" },
  { id: "health", Icon: Heart, label: "Health" },
  { id: "progress", Icon: TrendingUp, label: "Progress" },
];

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [tab, setTab] = useState<TabId>("home");

  return (
    <div
      className={isDark ? "dark" : ""}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isDark ? "#070710" : "#D4D8E4",
        padding: "24px 16px",
        fontFamily: "'Inter', sans-serif",
        background: isDark
          ? `radial-gradient(ellipse at 30% 20%, ${GRAD_A}66 0%, #070710 60%)`
          : `radial-gradient(ellipse at 30% 20%, #C8D8FF 0%, #D4D8E4 60%)`,
      }}
    >
      {/* Phone frame */}
      <div style={{
        width: 390,
        maxHeight: "92vh",
        borderRadius: 52,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backgroundColor: isDark ? "#0C0C0E" : "#F6F6F9",
        boxShadow: isDark
          ? `0 48px 96px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px ${ACCENT}22`
          : `0 32px 80px rgba(60,80,160,0.2), 0 0 0 1px rgba(0,0,0,0.07)`,
        position: "relative",
      }}>
        {/* Dynamic island + status */}
        <div style={{ height: 54, display: "flex", alignItems: "center", flexShrink: 0, position: "relative" }}>
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 120, height: 32, borderRadius: 18, backgroundColor: "#000" }} />
          <span style={{ position: "absolute", left: 28, fontSize: 14, fontWeight: 600, color: isDark ? "#F2F2EE" : "#0D0D0D" }}>9:41</span>
          <div style={{ position: "absolute", right: 28, display: "flex", alignItems: "flex-end", gap: 3 }}>
            {[4, 6, 8, 10].map((h, i) => (
              <div key={i} style={{ width: 3, height: h, borderRadius: 1.5, backgroundColor: isDark ? "#F2F2EE" : "#0D0D0D", opacity: i < 3 ? 1 : 0.25 }} />
            ))}
          </div>
        </div>

        {/* App header */}
        <div className="border-b border-border flex items-center justify-between px-5 py-2.5" style={{ flexShrink: 0 }}>
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm"
            style={{ background: `linear-gradient(135deg, ${GRAD_B}, ${GRAD_C})`, color: "#FFF", boxShadow: `0 4px 14px ${ACCENT}55` }}>
            A
          </div>
          <span style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 900, letterSpacing: "0.08em" }}>FITTRACK</span>
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: isDark ? "#1A1A1F" : "#E8E8F0" }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ overflowX: "hidden" }}>
          {tab === "home"      && <HomeScreen isDark={isDark} />}
          {tab === "workouts"  && <WorkoutsScreen isDark={isDark} />}
          {tab === "health"    && <HealthScreen isDark={isDark} />}
          {tab === "progress"  && <ProgressScreen isDark={isDark} />}
        </div>

        {/* Tab bar */}
        <div
          className="border-t border-border flex items-center px-2 pt-2 pb-7 shrink-0"
          style={{ backgroundColor: isDark ? "rgba(12,12,14,0.97)" : "rgba(246,246,249,0.97)", backdropFilter: "blur(24px)" }}
        >
          {TABS.map(({ id, Icon, label }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} className="flex-1 flex flex-col items-center gap-1 transition-all">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all"
                  style={{
                    background: active ? `linear-gradient(135deg, ${GRAD_B}, ${GRAD_C})` : "transparent",
                    transform: active ? "scale(1.05)" : "scale(1)",
                    boxShadow: active ? `0 4px 14px ${ACCENT}55` : "none",
                  }}
                >
                  <Icon size={20} style={{ color: active ? "#FFF" : isDark ? "#555" : "#AAA" }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? (isDark ? "#F2F2EE" : "#0D0D0D") : isDark ? "#555" : "#AAA", letterSpacing: "0.02em", lineHeight: 1 }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
