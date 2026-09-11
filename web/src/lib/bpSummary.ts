import { assessBloodPressure } from "@/lib/bpAssess";
import { weekLabel, weekStartKey } from "@/lib/checkin";
import { dateKey } from "@/lib/protocol";

export type BpDayRow = {
  date: string;
  bp1_systolic: number;
  bp1_diastolic: number;
  bp2_systolic: number;
  bp2_diastolic: number;
  bp_logged_at?: string | null;
};

function fmtPair(sys: number, dia: number) {
  if (!sys || !dia) return null;
  return `${sys}/${dia}`;
}

function formatDayLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 12);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function hasBp(row: BpDayRow) {
  return (
    (row.bp1_systolic > 0 && row.bp1_diastolic > 0) ||
    (row.bp2_systolic > 0 && row.bp2_diastolic > 0)
  );
}

export function buildBpWeeklySummary(
  rows: BpDayRow[],
  refDate: Date = new Date()
) {
  const monday = weekStartKey(refDate);
  const label = weekLabel(monday);
  const byDate = new Map(rows.filter(hasBp).map((r) => [r.date, r]));

  const [y, m, d] = monday.split("-").map(Number);
  const start = new Date(y, m - 1, d, 12);

  const dayLines: string[] = [];
  const allReadings: { sys: number; dia: number }[] = [];
  let daysLogged = 0;

  for (let i = 0; i < 7; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const key = dateKey(dt);
    const row = byDate.get(key);

    if (!row) {
      dayLines.push(`${formatDayLabel(key)}: —`);
      continue;
    }

    const r1 = fmtPair(row.bp1_systolic, row.bp1_diastolic);
    const r2 = fmtPair(row.bp2_systolic, row.bp2_diastolic);
    if (!r1 && !r2) {
      dayLines.push(`${formatDayLabel(key)}: —`);
      continue;
    }

    daysLogged += 1;
    if (r1) {
      const [sys, dia] = r1.split("/").map(Number);
      allReadings.push({ sys, dia });
    }
    if (r2) {
      const [sys, dia] = r2.split("/").map(Number);
      allReadings.push({ sys, dia });
    }

    const assess = assessBloodPressure(row);
    const readings = [r1, r2].filter(Boolean).join(", ");
    dayLines.push(
      `${formatDayLabel(key)}: ${readings} — avg ${assess.avgSys}/${assess.avgDia} (${assess.label})`
    );
  }

  let weekAvgLine = "Week average: —";
  if (allReadings.length) {
    const avgSys = Math.round(
      allReadings.reduce((s, r) => s + r.sys, 0) / allReadings.length
    );
    const avgDia = Math.round(
      allReadings.reduce((s, r) => s + r.dia, 0) / allReadings.length
    );
    weekAvgLine = `Week average: ${avgSys}/${avgDia} (${allReadings.length} reading${allReadings.length === 1 ? "" : "s"}, ${daysLogged} day${daysLogged === 1 ? "" : "s"})`;
  }

  const copyText = [
    `Weekly fasted blood pressure (${label})`,
    "",
    ...dayLines,
    "",
    weekAvgLine,
    "Fasted AM · two cuff readings per day",
  ].join("\n");

  return {
    weekLabel: label,
    copyText,
    dayLines,
    daysLogged,
    readingCount: allReadings.length,
  };
}
