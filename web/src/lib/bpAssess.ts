/** AHA-style adult BP bands (educational — not a medical diagnosis). */

export type BpCategory =
  | "normal"
  | "elevated"
  | "stage1"
  | "stage2"
  | "crisis"
  | "incomplete";

export type BpAssessment = {
  category: BpCategory;
  label: string;
  /** Short verdict for banner title */
  title: string;
  detail: string;
  tips: string[];
  /** avg of valid readings */
  avgSys: number;
  avgDia: number;
  tone: "green" | "blue" | "yellow" | "orange" | "red";
};

function classify(sys: number, dia: number): Exclude<BpCategory, "incomplete"> {
  if (sys > 180 || dia > 120) return "crisis";
  if (sys >= 140 || dia >= 90) return "stage2";
  if (sys >= 130 || dia >= 80) return "stage1";
  if (sys >= 120 && dia < 80) return "elevated";
  return "normal";
}

const META: Record<
  Exclude<BpCategory, "incomplete">,
  Pick<BpAssessment, "label" | "title" | "detail" | "tips" | "tone">
> = {
  normal: {
    label: "Normal",
    title: "Looking good",
    detail: "Both numbers sit in a healthy fasted range.",
    tips: [
      "Keep doing what you’re doing — sleep, sodium awareness, and training.",
      "Retest the same way each morning for a clean trend.",
    ],
    tone: "green",
  },
  elevated: {
    label: "Elevated",
    title: "Slightly elevated",
    detail: "Systolic is a bit high while diastolic is still under 80.",
    tips: [
      "Sit 5 minutes quiet before the cuff next time.",
      "Watch salt / caffeine before the reading if you can.",
      "Track a few more mornings — one elevated day isn’t a crisis.",
    ],
    tone: "blue",
  },
  stage1: {
    label: "Stage 1 range",
    title: "Higher than ideal",
    detail: "This sits in the Stage 1 hypertension range on average.",
    tips: [
      "Confirm with a third reading after another quiet minute.",
      "Prioritize sleep, hydration, and walking today.",
      "If this stays elevated over days, talk with your doctor.",
    ],
    tone: "yellow",
  },
  stage2: {
    label: "Stage 2 range",
    title: "Notably high",
    detail: "Average is in the Stage 2 range — worth paying attention to.",
    tips: [
      "Rest, recheck in 5–10 minutes, and log both.",
      "Avoid hard stimulants until it settles.",
      "If it stays this high across days, contact your clinician.",
    ],
    tone: "orange",
  },
  crisis: {
    label: "Very high",
    title: "Very high reading",
    detail: "This is in a hypertensive crisis range on the numbers entered.",
    tips: [
      "Sit, relax, and recheck with a known-good cuff.",
      "If you have chest pain, shortness of breath, or neurological symptoms — seek urgent care.",
      "Otherwise call your doctor promptly if it stays this high.",
    ],
    tone: "red",
  },
};

export function assessBloodPressure(input: {
  bp1_systolic: number;
  bp1_diastolic: number;
  bp2_systolic: number;
  bp2_diastolic: number;
}): BpAssessment {
  const readings: { sys: number; dia: number }[] = [];
  if (input.bp1_systolic > 0 && input.bp1_diastolic > 0) {
    readings.push({ sys: input.bp1_systolic, dia: input.bp1_diastolic });
  }
  if (input.bp2_systolic > 0 && input.bp2_diastolic > 0) {
    readings.push({ sys: input.bp2_systolic, dia: input.bp2_diastolic });
  }

  if (!readings.length) {
    return {
      category: "incomplete",
      label: "Incomplete",
      title: "Need full readings",
      detail: "Enter systolic/diastolic for at least one reading (e.g. 120/80).",
      tips: ["Both numbers matter — sys and dia."],
      avgSys: 0,
      avgDia: 0,
      tone: "yellow",
    };
  }

  const avgSys = Math.round(
    readings.reduce((s, r) => s + r.sys, 0) / readings.length
  );
  const avgDia = Math.round(
    readings.reduce((s, r) => s + r.dia, 0) / readings.length
  );
  const category = classify(avgSys, avgDia);
  const meta = META[category];

  const spreadNote =
    readings.length === 2
      ? ` Avg of 2: ${avgSys}/${avgDia}.`
      : ` Reading: ${avgSys}/${avgDia}.`;

  return {
    category,
    ...meta,
    detail: meta.detail + spreadNote,
    avgSys,
    avgDia,
  };
}
