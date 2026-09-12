"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateKey } from "@/lib/protocol";
import type { MacroTargets } from "@/lib/targets";
import type { MealItem } from "@/components/FoodSearchModal";

type Metric = "calories" | "protein" | "carbs" | "fat";

type DayTotals = {
  key: string;
  date: Date;
  logged: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const METRICS: { key: Metric; label: string; unit: string; target: keyof MacroTargets }[] = [
  { key: "calories", label: "Calories", unit: "cal", target: "target_calories" },
  { key: "protein", label: "Protein", unit: "g", target: "target_protein" },
  { key: "carbs", label: "Carbs", unit: "g", target: "target_carbs" },
  { key: "fat", label: "Fat", unit: "g", target: "target_fats" },
];

/**
 * "On target" differs by macro: protein is a floor worth clearing, calories
 * should land close, and carbs and fat are allowed more day-to-day swing.
 */
function onTarget(metric: Metric, value: number, target: number) {
  if (!target) return false;
  const ratio = value / target;
  if (metric === "protein") return ratio >= 0.9;
  if (metric === "calories") return ratio >= 0.9 && ratio <= 1.1;
  return ratio >= 0.85 && ratio <= 1.15;
}

const ON_TARGET_RULE: Record<Metric, string> = {
  calories: "within 10% of target",
  protein: "at least 90% of target",
  carbs: "within 15% of target",
  fat: "within 15% of target",
};

function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export function NutritionTrend({
  endDate,
  targets,
  refreshKey,
}: {
  endDate: string;
  targets: MacroTargets;
  refreshKey: number;
}) {
  const [metric, setMetric] = useState<Metric>("calories");
  const [days, setDays] = useState<DayTotals[] | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const end = parseKey(endDate);
      const range = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(end);
        d.setDate(end.getDate() - (6 - i));
        return d;
      });
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) return;

      const { data, error: err } = await supabase
        .from("daily_logs")
        .select("date, actual_calories, actual_protein, actual_carbs_pre, actual_carbs_post, actual_fats, meals")
        .eq("user_id", user.id)
        .gte("date", dateKey(range[0]))
        .lte("date", dateKey(range[6]));

      if (cancelled) return;
      if (err) {
        setError(err.message);
        setDays([]);
        return;
      }

      const byDate = new Map((data ?? []).map((r) => [String(r.date), r]));
      const rows = range.map((d) => {
        const key = dateKey(d);
        const r = byDate.get(key);
        const meals = Array.isArray(r?.meals) ? (r.meals as MealItem[]) : [];
        // Meal items are the source of truth once any exist; older days only
        // carried the hand-entered actual_* totals.
        const totals = meals.length
          ? meals.reduce(
              (a, m) => ({
                calories: a.calories + (Number(m.calories) || 0),
                protein: a.protein + (Number(m.protein) || 0),
                carbs: a.carbs + (Number(m.carbs) || 0),
                fat: a.fat + (Number(m.fat) || 0),
              }),
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            )
          : {
              calories: Number(r?.actual_calories) || 0,
              protein: Number(r?.actual_protein) || 0,
              carbs: (Number(r?.actual_carbs_pre) || 0) + (Number(r?.actual_carbs_post) || 0),
              fat: Number(r?.actual_fats) || 0,
            };
        return { key, date: d, logged: totals.calories > 0 || meals.length > 0, ...totals };
      });
      setError("");
      setDays(rows);
      const lastLogged = rows.map((r) => r.logged).lastIndexOf(true);
      setPicked(lastLogged >= 0 ? lastLogged : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [endDate, refreshKey]);

  const spec = METRICS.find((m) => m.key === metric)!;
  const target = targets[spec.target];

  const summary = useMemo(() => {
    const logged = (days ?? []).filter((d) => d.logged);
    const avg = logged.length ? logged.reduce((n, d) => n + d[metric], 0) / logged.length : 0;
    const hits = logged.filter((d) => onTarget(metric, d[metric], target)).length;
    return { logged: logged.length, avg, hits };
  }, [days, metric, target]);

  const scaleMax = useMemo(() => {
    const peak = Math.max(0, ...(days ?? []).map((d) => d[metric]));
    return Math.max(target * 1.2, peak * 1.05, 1);
  }, [days, metric, target]);

  const targetPct = Math.min(100, (target / scaleMax) * 100);
  const pickedDay = picked != null && days ? days[picked] : null;

  return (
    <section className="space-y-3">
      <div className="flex gap-1 rounded-md border border-white/5 bg-[var(--surface)] p-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`h-9 flex-1 rounded-md text-[13px] ${
              metric === m.key ? "bg-[var(--raised)] font-bold text-[var(--text)]" : "font-semibold text-[var(--muted)]"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-white/5 bg-[var(--surface)] px-3 py-2.5">
          <p className="text-[17px] font-extrabold tabular-nums">{summary.logged ? fmt(summary.avg) : "—"}</p>
          <p className="text-[10.5px] font-semibold text-[var(--muted)]">
            Avg {spec.unit} · target {fmt(target)}
          </p>
        </div>
        <div className="rounded-md border border-white/5 bg-[var(--surface)] px-3 py-2.5">
          <p className="text-[17px] font-extrabold tabular-nums">
            {summary.hits}/{summary.logged || 0}
          </p>
          <p className="text-[10.5px] font-semibold text-[var(--muted)]">Days on target</p>
        </div>
        <div className="rounded-md border border-white/5 bg-[var(--surface)] px-3 py-2.5">
          <p className="text-[17px] font-extrabold tabular-nums">{summary.logged}/7</p>
          <p className="text-[10.5px] font-semibold text-[var(--muted)]">Days logged</p>
        </div>
      </div>

      <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-bold">{spec.label}, last 7 days</h3>
          <p className="text-[11.5px] font-semibold text-[var(--muted)]">On target = {ON_TARGET_RULE[metric]}</p>
        </div>

        <p className="mt-2 min-h-[18px] text-[12.5px] tabular-nums text-[var(--muted)]">
          {pickedDay ? (
            <>
              <span className="font-bold text-[var(--text)]">
                {pickedDay.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </span>
              {" · "}
              {pickedDay.logged
                ? `${fmt(pickedDay[metric])} ${spec.unit} · ${Math.round((pickedDay[metric] / target) * 100)}% of target`
                : "Nothing logged"}
            </>
          ) : days === null ? (
            "Loading…"
          ) : (
            "Tap a day for details"
          )}
        </p>

        {error ? <p className="mt-2 text-[12.5px] text-[var(--yellow)]">{error}</p> : null}

        <div className="relative mt-3 h-[150px]">
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--muted)]/60"
            style={{ bottom: `${targetPct}%` }}
          >
            <span className="absolute -top-[18px] right-0 rounded bg-[var(--card)] px-1 text-[10.5px] font-semibold tabular-nums text-[var(--muted)]">
              Target {fmt(target)}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 border-t border-[var(--border-solid)]" />
          <div className="absolute inset-0 flex items-end gap-0.5">
            {(days ?? Array.from({ length: 7 }, () => null)).map((d, i) => {
              const h = d && d.logged ? Math.max(2, (d[metric] / scaleMax) * 100) : 0;
              const selected = picked === i;
              return (
                <button
                  key={d?.key ?? i}
                  type="button"
                  disabled={!d}
                  onClick={() => setPicked(i)}
                  aria-label={
                    d
                      ? `${d.date.toLocaleDateString(undefined, { weekday: "long" })}: ${
                          d.logged ? `${fmt(d[metric])} ${spec.unit}` : "nothing logged"
                        }`
                      : "Loading"
                  }
                  className="flex h-full flex-1 items-end justify-center"
                >
                  {h > 0 ? (
                    <span
                      className={`block w-[58%] rounded-t-[4px] ${
                        selected ? "bg-[var(--blue)]" : "bg-[var(--blue)]/55"
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  ) : (
                    <span className="mb-[-1px] block h-[2px] w-[58%] rounded bg-[var(--border-solid)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-1.5 flex gap-0.5">
          {(days ?? []).map((d, i) => (
            <span
              key={d.key}
              className={`flex-1 text-center text-[10.5px] font-semibold ${
                picked === i ? "text-[var(--text)]" : "text-[var(--dim)]"
              }`}
            >
              {d.date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-white/5 bg-[var(--surface)]">
        {(days ?? []).slice().reverse().map((d) => (
          <div
            key={d.key}
            className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5 last:border-0"
          >
            <span className="text-[13px] font-semibold">
              {d.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <span className="text-[12.5px] tabular-nums text-[var(--muted)]">
              {d.logged
                ? `${fmt(d.calories)} cal · ${fmt(d.protein)}p · ${fmt(d.carbs)}c · ${fmt(d.fat)}f`
                : "Not logged"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
