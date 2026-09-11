/** Gym stills for the program home hero (Unsplash). */

const HERO = {
  squat:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80",
  back: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1400&q=80",
  chest:
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1400&q=80",
  arms: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1400&q=80",
  posterior:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80",
  push: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1400&q=80",
  pull: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1400&q=80",
  rest: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=40",
} as const;

export function dayHeroUrl(name: string, rest?: boolean): string {
  if (rest) return HERO.rest;
  const n = name.toLowerCase();
  if (n.includes("anterior") || n.includes("quad") || n.includes("leg day")) return HERO.squat;
  if (n.includes("posterior")) return HERO.posterior;
  if (n.includes("chest") || n.includes("push")) return n.includes("push") ? HERO.push : HERO.chest;
  if (n.includes("back") || n.includes("pull")) return n.includes("pull") ? HERO.pull : HERO.back;
  if (n.includes("arm") || n.includes("shoulder")) return HERO.arms;
  if (n.includes("leg")) return HERO.squat;
  return HERO.squat;
}

export function splitDayTitle(name: string) {
  const m = name.match(/^Day\s+(\d+)\s*·\s*(.+)$/i);
  if (m) return { kicker: `Day ${m[1]}`, title: m[2].replace(/\s+B$/i, "").trim() };
  return { kicker: null as string | null, title: name };
}

export function musclesFromSubtitle(subtitle: string): string[] {
  const after = subtitle.split("·").slice(1).join("·").trim();
  if (!after) return [];
  return after
    .split(/[,&]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^elevate\s*/i, "").trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

/** Elevate program day 1–7 from JS weekday (Fri = 1). */
export function elevateProgramDay(jsDay: number): number {
  return ((jsDay + 2) % 7) + 1;
}

export function startOfElevateWeek(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const sinceFri = (d.getDay() + 2) % 7;
  start.setDate(start.getDate() - sinceFri);
  return start;
}
