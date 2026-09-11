/** Brandon's current stack (compounds + supplements). */
export const DEFAULT_PROTOCOL = [
  // Compounds
  {
    name: "Retatrutide",
    dosage: "4mg · SubQ",
    schedule_label: "SubQ",
    frequency_label: "Sun",
  },
  {
    name: "MOTS-c",
    dosage: "4mg · SubQ",
    schedule_label: "SubQ",
    frequency_label: "Mon Thu",
  },
  {
    name: "Glutathione",
    dosage: "200mg",
    schedule_label: "SubQ",
    frequency_label: "Mon Wed Fri",
  },
  {
    name: "5-Amino",
    dosage: "50mg · capsule",
    schedule_label: "Oral",
    frequency_label: "Daily",
  },
  {
    name: "CJC / IPA (no DAC)",
    dosage: "1mg · SubQ · 5 on / 2 off (sometimes 6 on)",
    schedule_label: "SubQ",
    frequency_label: "M-F",
  },
  {
    name: "Test C",
    dosage: "125mg · SubQ (250mg/wk split)",
    schedule_label: "SubQ",
    frequency_label: "Tue Thu",
  },
  // AM supplements
  {
    name: "Citrus Bergamot",
    dosage: "1200mg · AM",
    schedule_label: "AM",
    frequency_label: "Daily",
  },
  {
    name: "Omega-3",
    dosage: "2500mg · AM",
    schedule_label: "AM",
    frequency_label: "Daily",
  },
  {
    name: "Psyllium Husk",
    dosage: "3000mg · AM",
    schedule_label: "AM",
    frequency_label: "Daily",
  },
  {
    name: "Multivitamin",
    dosage: "AM",
    schedule_label: "AM",
    frequency_label: "Daily",
  },
  // PM supplements
  {
    name: "Magnesium Glycinate",
    dosage: "420mg · PM",
    schedule_label: "PM",
    frequency_label: "Daily",
  },
  {
    name: "TUDCA",
    dosage: "500mg · PM",
    schedule_label: "PM",
    frequency_label: "Daily",
  },
] as const;

const DAY_MAP: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

/** JS getDay(): 0=Sun … 6=Sat */
export function isDueOnWeekday(frequencyLabel: string, weekday: number): boolean {
  const f = frequencyLabel.toLowerCase().replace(/–|—/g, "-").trim();
  if (!f || f === "daily" || f === "every day") return true;
  if (f === "m-f" || f === "mf" || f === "weekdays") {
    return weekday >= 1 && weekday <= 5;
  }
  if (f === "m-sat" || f === "msat") {
    return weekday >= 1 && weekday <= 6;
  }
  const tokens = f.split(/[\s,/]+/).filter(Boolean);
  const days = new Set<number>();
  for (const t of tokens) {
    const d = DAY_MAP[t];
    if (d != null) days.add(d);
  }
  if (days.size === 0) return true;
  return days.has(weekday);
}

export function dateKey(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseTakenDates(csv: string): Set<string> {
  return new Set(csv.split("|").map((s) => s.trim()).filter(Boolean));
}

export function serializeTakenDates(keys: Set<string>) {
  return [...keys].sort().join("|");
}

export function calendarInitials(name: string) {
  const n = name.toLowerCase();
  if (n.includes("reta")) return "Re";
  if (n.includes("mots")) return "MC";
  if (n.includes("gluta")) return "G";
  if (n.includes("5-amino") || n.includes("5 amino")) return "5A";
  if (n.includes("cjc") || n.includes("ipa")) return "CI";
  if (n.includes("test")) return "Te";
  if (n.includes("bergamot")) return "CB";
  if (n.includes("omega")) return "Ω3";
  if (n.includes("psyllium")) return "PH";
  if (n.includes("multi")) return "Mv";
  if (n.includes("magnesium") || n.includes("mag")) return "Mg";
  if (n.includes("tudca")) return "Tu";
  const parts = name.split(/\W+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * PPL → Rest → UL → Rest
 * Anchored so Jul 23, 2026 (Thu) = Upper (coach day).
 * Cycle: Upper, Lower, Rest, Push, Pull, Legs, Rest
 */
export const ROTATION = ["Upper", "Lower", null, "Push", "Pull", "Legs", null] as const;
const ANCHOR = new Date("2026-07-23T12:00:00"); // Upper

export function scheduledWorkoutName(date: Date): string | null {
  const start = new Date(date);
  start.setHours(12, 0, 0, 0);
  const diffDays = Math.floor((start.getTime() - ANCHOR.getTime()) / 86400000);
  const idx = ((diffDays % 7) + 7) % 7;
  return ROTATION[idx];
}

/** True if this calendar day is Monday (weekly weigh-in day). */
export function isWeighInDay(date: Date = new Date()) {
  return date.getDay() === 1;
}

/** Monday date key for the week containing `date`. */
export function mondayKey(date: Date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return dateKey(d);
}
