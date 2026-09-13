/** Plain-language explanations for the training terms the app uses. */
export const GLOSSARY = {
  rir: {
    title: "RIR — reps in reserve",
    body: "How many more reps you could have done before form broke down. 3 RIR means you stopped with about three left in the tank. It's how the plan controls effort without you guessing.",
  },
  failure: {
    title: "To failure",
    body: "Keep going until you can't complete another clean rep. Used on isolation work — laterals, arms, rear delts — where the risk is low and the extra effort pays off.",
  },
  warmup: {
    title: "Warm-up sets",
    body: "Light sets that rehearse the movement before the working sets. They're logged, but they don't count toward volume or progress.",
  },
  prehab: {
    title: "Shoulder prehab",
    body: "Band pull-aparts, face pulls, prone Y/T, external rotations and wall slides — 8 to 12 minutes before every upper day. It's what keeps the injured shoulder stable while you train around it.",
  },
  deload: {
    title: "Deload week",
    body: "A deliberately easier week: same exercises, cut your sets by about 40% and keep loads moderate. It lets fatigue clear so the final weeks land harder. It is not slacking.",
  },
  progression: {
    title: "How the next-set target works",
    body: "Add reps at the same weight until you hit the top of the range, then add the smallest plate and drop back to the bottom. If you tap RIR after a set, it uses that too: 0 left means hold, 3+ left means push.",
  },
  phase: {
    title: "Week phases",
    body: "Weeks 1–2 learn the positions at 3 RIR. Weeks 3–5 build by adding reps. Week 6 is a deload. Weeks 7–8 push closer to 1–2 RIR on pain-free lifts only.",
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
